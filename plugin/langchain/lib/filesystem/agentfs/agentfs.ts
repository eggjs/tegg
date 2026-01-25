/* eslint-disable no-bitwise */
import { MysqlDataSource } from '@eggjs/dal-runtime';
import SqlString from 'sqlstring';
import { createFsError, type FsSyscall } from './errors';
import {
  assertInodeIsDirectory,
  assertNotRoot,
  assertNotSymlinkMode,
  assertReadableExistingInode,
  assertReaddirTargetInode,
  assertUnlinkTargetInode,
  assertWritableExistingInode,
  getInodeModeOrThrow,
  normalizeRmOptions,
  throwENOENTUnlessForce,
} from './guards';
import {
  S_IFMT,
  // S_IFREG,
  S_IFDIR,
  S_IFLNK,
  DEFAULT_FILE_MODE,
  DEFAULT_DIR_MODE,
  createStats,
  type Stats,
  type DirEntry,
  type FilesystemStats,
  type FileHandle,
  type FileSystem,
} from './interface';
import { FileData } from 'deepagents';

const DEFAULT_CHUNK_SIZE = 4096;

/**
 * An open file handle for AgentFS.
 */
class AgentFSFile implements FileHandle {
  private db: MysqlDataSource;
  private bufferCtor: BufferConstructor;
  private ino: number;
  private chunkSize: number;

  constructor(db: MysqlDataSource, bufferCtor: BufferConstructor, ino: number, chunkSize: number) {
    this.db = db;
    this.bufferCtor = bufferCtor;
    this.ino = ino;
    this.chunkSize = chunkSize;
  }

  async pread(offset: number, size: number): Promise<Buffer> {
    const startChunk = Math.floor(offset / this.chunkSize);
    const endChunk = Math.floor((offset + size - 1) / this.chunkSize);

    const sql = SqlString.format(`
      SELECT chunk_index, data FROM fs_data
      WHERE ino = ? AND chunk_index >= ? AND chunk_index <= ?
      ORDER BY chunk_index ASC
      `,
    [ this.ino, startChunk, endChunk ],
    );
    const rows = await this.db.query(sql) as { chunk_index: number; data: Buffer }[];
    if (!rows || rows.length === 0) {
      return this.bufferCtor.alloc(0);
    }

    const buffers: Buffer[] = [];
    let bytesCollected = 0;
    const startOffsetInChunk = offset % this.chunkSize;

    for (const row of rows) {
      const skip = buffers.length === 0 ? startOffsetInChunk : 0;
      if (skip >= row.data.length) {
        continue;
      }
      const remaining = size - bytesCollected;
      const take = Math.min(row.data.length - skip, remaining);
      buffers.push(row.data.subarray(skip, skip + take));
      bytesCollected += take;
    }

    if (buffers.length === 0) {
      return this.bufferCtor.alloc(0);
    }

    return this.bufferCtor.concat(buffers);
  }

  async pwrite(offset: number, data: Buffer): Promise<void> {
    if (data.length === 0) {
      return;
    }

    const sql = SqlString.format(
      'SELECT size FROM fs_inode WHERE ino = ?',
      [ this.ino ],
    );
    const sizeRow = (await this.db.query(sql) as { size: number }[])[0];
    const currentSize = sizeRow?.size ?? 0;

    if (offset > currentSize) {
      const zeros = this.bufferCtor.alloc(offset - currentSize);
      await this.writeDataAtOffset(currentSize, zeros);
    }

    await this.writeDataAtOffset(offset, data);

    const newSize = Math.max(currentSize, offset + data.length);
    const now = Math.floor(Date.now() / 1000);
    const updateSql = SqlString.format(
      'UPDATE fs_inode SET size = ?, mtime = ? WHERE ino = ?',
      [ newSize, now, this.ino ],
    );
    await this.db.query(updateSql, [], { executeType: 'execute' });
  }

  private async writeDataAtOffset(offset: number, data: Buffer): Promise<void> {
    const startChunk = Math.floor(offset / this.chunkSize);
    const endChunk = Math.floor((offset + data.length - 1) / this.chunkSize);

    for (let chunkIdx = startChunk; chunkIdx <= endChunk; chunkIdx++) {
      const chunkStart = chunkIdx * this.chunkSize;
      const chunkEnd = chunkStart + this.chunkSize;

      const dataStart = Math.max(0, chunkStart - offset);
      const dataEnd = Math.min(data.length, chunkEnd - offset);
      const writeOffset = Math.max(0, offset - chunkStart);

      const selectSql = SqlString.format(
        'SELECT data FROM fs_data WHERE ino = ? AND chunk_index = ?',
        [ this.ino, chunkIdx ],
      );
      const existingRow = (await this.db.query(selectSql) as { data: Buffer }[])[0];

      let chunkData: Buffer;
      if (existingRow) {
        chunkData = this.bufferCtor.from(existingRow.data);
        if (writeOffset + (dataEnd - dataStart) > chunkData.length) {
          const newChunk = this.bufferCtor.alloc(writeOffset + (dataEnd - dataStart));
          chunkData.copy(newChunk);
          chunkData = newChunk;
        }
      } else {
        chunkData = this.bufferCtor.alloc(writeOffset + (dataEnd - dataStart));
      }

      data.copy(chunkData, writeOffset, dataStart, dataEnd);

      const upsertSql = SqlString.format(`
        INSERT INTO fs_data (ino, chunk_index, data) VALUES (?, ?, ?)
        ON CONFLICT(ino, chunk_index) DO UPDATE SET data = excluded.data
      `, [ this.ino, chunkIdx, chunkData ]);
      await this.db.query(upsertSql, [], { executeType: 'execute' });
    }
  }

  async truncate(newSize: number): Promise<void> {
    const sql = SqlString.format(
      'SELECT size FROM fs_inode WHERE ino = ?',
      [ this.ino ],
    );
    const sizeRow = (await this.db.query(sql) as { size: number }[])[0];
    const currentSize = sizeRow?.size ?? 0;


    await this.db.beginTransactionScope(async () => {
      if (newSize === 0) {
        const deleteSql = SqlString.format(
          'DELETE FROM fs_data WHERE ino = ?',
          [ this.ino ],
        );
        await this.db.query(deleteSql, [], { executeType: 'execute' });
      } else if (newSize < currentSize) {
        const lastChunkIdx = Math.floor((newSize - 1) / this.chunkSize);

        const deleteSql = SqlString.format(
          'DELETE FROM fs_data WHERE ino = ? AND chunk_index > ?',
          [ this.ino, lastChunkIdx ],
          { executeType: 'execute' },
        );
        await this.db.query(deleteSql, [], { executeType: 'execute' });

        const offsetInChunk = newSize % this.chunkSize;
        if (offsetInChunk > 0) {
          const selectSql = SqlString.format(
            'SELECT data FROM fs_data WHERE ino = ? AND chunk_index = ?',
            [ this.ino, lastChunkIdx ],
          );
          const row = (await this.db.query(selectSql) as { data: Buffer }[])[0];

          if (row && row.data.length > offsetInChunk) {
            const truncatedChunk = row.data.subarray(0, offsetInChunk);
            const updateSql = SqlString.format(
              'UPDATE fs_data SET data = ? WHERE ino = ? AND chunk_index = ?',
              [ truncatedChunk, this.ino, lastChunkIdx ],
            );
            await this.db.query(updateSql, [], { executeType: 'execute' });
          }
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const updateSql = SqlString.format(
        'UPDATE fs_inode SET size = ?, mtime = ? WHERE ino = ?',
        [ newSize, now, this.ino ],
      );
      await this.db.query(updateSql, [], { executeType: 'execute' });
    });
  }

  async fsync(): Promise<void> {
    await this.db.query('PRAGMA synchronous = FULL', [], { executeType: 'execute' });
    await this.db.query('PRAGMA wal_checkpoint(TRUNCATE)', [], { executeType: 'execute' });
  }

  async fstat(): Promise<Stats> {
    const sql = SqlString.format(`
      SELECT ino, mode, nlink, uid, gid, size, atime, mtime, ctime
      FROM fs_inode WHERE ino = ?
    `, [ this.ino ]);
    const row = await this.db.query(sql) as {
      ino: number;
      mode: number;
      nlink: number;
      uid: number;
      gid: number;
      size: number;
      atime: number;
      mtime: number;
      ctime: number;
    } | undefined;

    if (!row) {
      throw new Error('File handle refers to deleted inode');
    }

    return createStats(row);
  }
}

/**
 * A filesystem backed by SQLite, implementing the FileSystem interface.
 */
export class AgentFS implements FileSystem {
  private db: MysqlDataSource;
  private bufferCtor: BufferConstructor;
  private rootIno = 1;
  private chunkSize: number = DEFAULT_CHUNK_SIZE;

  private constructor(db: MysqlDataSource, b: BufferConstructor) {
    this.db = db;
    this.bufferCtor = b;
  }

  static async fromDatabase(db: MysqlDataSource, b?: BufferConstructor): Promise<AgentFS> {
    const fs = new AgentFS(db, b ?? Buffer);
    await fs.initialize();
    return fs;
  }

  getChunkSize(): number {
    return this.chunkSize;
  }

  private async initialize(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS fs_config (
        id INTEGER AUTO_INCREMENT PRIMARY KEY,
        \`key\` TEXT NOT NULL,
        value TEXT NOT NULL
      )
    `, [], { executeType: 'execute' });

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS fs_inode (
        ino INTEGER AUTO_INCREMENT PRIMARY KEY,
        mode INTEGER NOT NULL,
        nlink INTEGER NOT NULL DEFAULT 0,
        uid INTEGER NOT NULL DEFAULT 0,
        gid INTEGER NOT NULL DEFAULT 0,
        size INTEGER NOT NULL DEFAULT 0,
        atime INTEGER NOT NULL,
        mtime INTEGER NOT NULL,
        ctime INTEGER NOT NULL
      )
    `, [], { executeType: 'execute' });

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS fs_dentry (
        id INTEGER AUTO_INCREMENT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_ino INTEGER NOT NULL,
        ino INTEGER NOT NULL
      )
    `, [], { executeType: 'execute' });

    // await this.db.query(`
    //   CREATE INDEX idx_fs_dentry_parent ON fs_dentry(parent_ino, name);
    // `, [], { executeType: 'execute' });

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS fs_data (
        ino INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        data BLOB NOT NULL,
        PRIMARY KEY (ino, chunk_index)
      )
    `, [], { executeType: 'execute' });

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS fs_symlink (
        ino INTEGER PRIMARY KEY,
        target TEXT NOT NULL
      )
    `, [], { executeType: 'execute' });

    this.chunkSize = await this.ensureRoot();
  }

  private async ensureRoot(): Promise<number> {
    const sql = SqlString.format(
      'SELECT value FROM fs_config WHERE `key` = ?',
      [ 'chunk_size' ],
    );
    const config = (await this.db.query(sql) as { value: string }[])[0];

    let chunkSize: number;
    if (!config) {
      const sql = SqlString.format(
        'INSERT INTO fs_config (`key`, value) VALUES (?, ?)',
        [ 'chunk_size', DEFAULT_CHUNK_SIZE.toString() ],
      );
      await this.db.query(sql, [], { executeType: 'execute' });
      chunkSize = DEFAULT_CHUNK_SIZE;
    } else {
      chunkSize = parseInt(config.value, 10) || DEFAULT_CHUNK_SIZE;
    }

    // const stmt = this.db.prepare('SELECT ino FROM fs_inode WHERE ino = ?');
    // const root = await stmt.get(this.rootIno);
    const sqlRoot = SqlString.format(
      'SELECT ino FROM fs_inode WHERE ino = ?',
      [ this.rootIno ],
    );
    const root = (await this.db.query(sqlRoot) as { ino: number }[])[0];

    if (!root) {
      const now = Math.floor(Date.now() / 1000);
      const insertSql = SqlString.format(`
        INSERT INTO fs_inode (ino, mode, nlink, uid, gid, size, atime, mtime, ctime)
        VALUES (?, ?, 1, 0, 0, 0, ?, ?, ?)
      `, [ this.rootIno, DEFAULT_DIR_MODE, now, now, now ]);
      await this.db.query(insertSql, [], { executeType: 'execute' });
    }

    return chunkSize;
  }

  private normalizePath(path: string): string {
    const normalized = path.replace(/\/+$/, '') || '/';
    return normalized.startsWith('/') ? normalized : '/' + normalized;
  }

  private splitPath(path: string): string[] {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return [];
    return normalized.split('/').filter(p => p);
  }

  private async resolvePathOrThrow(
    path: string,
    syscall: FsSyscall,
  ): Promise<{ normalizedPath: string; ino: number }> {
    const normalizedPath = this.normalizePath(path);
    const ino = await this.resolvePath(normalizedPath);
    if (ino === null) {
      throw createFsError({
        code: 'ENOENT',
        syscall,
        path: normalizedPath,
        message: 'no such file or directory',
      });
    }
    return { normalizedPath, ino };
  }

  private async resolvePath(path: string): Promise<number | null> {
    const normalized = this.normalizePath(path);

    if (normalized === '/') {
      return this.rootIno;
    }

    const parts = this.splitPath(normalized);
    let currentIno = this.rootIno;

    for (const name of parts) {
      const sql = SqlString.format(`
        SELECT ino FROM fs_dentry
        WHERE parent_ino = ? AND name = ?
      `, [ currentIno, name ]);
      const result = (await this.db.query(sql) as { ino: number }[])[0];

      if (!result) {
        return null;
      }

      currentIno = result.ino;
    }

    return currentIno;
  }

  private async resolveParent(path: string): Promise<{ parentIno: number; name: string } | null> {
    const normalized = this.normalizePath(path);

    if (normalized === '/') {
      return null;
    }

    const parts = this.splitPath(normalized);
    const name = parts[parts.length - 1];
    const parentPath = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/');

    const parentIno = await this.resolvePath(parentPath);

    if (parentIno === null) {
      return null;
    }

    return { parentIno, name };
  }

  private async createInode(mode: number, uid = 0, gid = 0): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const insertSql = SqlString.format(`
      INSERT INTO fs_inode (mode, uid, gid, size, atime, mtime, ctime)
      VALUES (?, ?, ?, 0, ?, ?, ?)
    `, [ mode, uid, gid, now, now, now ]);
    // const result = (await this.db.query(insertSql, [], { executeType: 'execute' }))[0];
    // const { ino } = result as { ino: number };
    // return Number(ino);
    const insertRes = await this.db.query(insertSql, [], { executeType: 'execute' });
    return Number(insertRes.insertId);
  }

  private async createDentry(parentIno: number, name: string, ino: number): Promise<void> {
    const sql = SqlString.format(`
      INSERT INTO fs_dentry (name, parent_ino, ino)
      VALUES (?, ?, ?)
    `, [ name, parentIno, ino ]);
    await this.db.query(sql);

    const updateSql = SqlString.format(
      'UPDATE fs_inode SET nlink = nlink + 1 WHERE ino = ?',
      [ ino ],
    );
    await this.db.query(updateSql, [], { executeType: 'execute' });
  }

  private async ensureParentDirs(path: string): Promise<void> {
    const parts = this.splitPath(path);
    parts.pop();

    let currentIno = this.rootIno;

    for (const name of parts) {
      const sql = SqlString.format(`
        SELECT ino FROM fs_dentry
        WHERE parent_ino = ? AND name = ?
      `, [ currentIno, name ]);
      const result = (await this.db.query(sql) as { ino: number })[0];

      if (!result) {
        const dirIno = await this.createInode(DEFAULT_DIR_MODE);
        await this.createDentry(currentIno, name, dirIno);
        currentIno = dirIno;
      } else {
        await assertInodeIsDirectory(this.db, result.ino, 'open', this.normalizePath(path));
        currentIno = result.ino;
      }
    }
  }

  private async getLinkCount(ino: number): Promise<number> {
    const sql = SqlString.format(
      'SELECT nlink FROM fs_inode WHERE ino = ?',
      [ ino ],
    );
    const result = (await this.db.query(sql) as { nlink: number }[])[0];
    return result?.nlink ?? 0;
  }

  private async getInodeMode(ino: number): Promise<number | null> {
    const sql = SqlString.format(
      'SELECT mode FROM fs_inode WHERE ino = ?',
      [ ino ],
    );
    const row = (await this.db.query(sql) as { mode: number }[])[0];
    return row?.mode ?? null;
  }

  // ==================== FileSystem Interface Implementation ====================

  async writeFile(
    path: string,
    content: string | Buffer,
    options?: BufferEncoding | { encoding?: BufferEncoding },
  ): Promise<void> {
    await this.ensureParentDirs(path);

    const ino = await this.resolvePath(path);

    const encoding = typeof options === 'string'
      ? options
      : options?.encoding;

    const normalizedPath = this.normalizePath(path);
    if (ino !== null) {
      await assertWritableExistingInode(this.db, ino, 'open', normalizedPath);
      await this.updateFileContent(ino, content, encoding);
    } else {
      const parent = await this.resolveParent(path);
      if (!parent) {
        throw createFsError({
          code: 'ENOENT',
          syscall: 'open',
          path: normalizedPath,
          message: 'no such file or directory',
        });
      }

      await assertInodeIsDirectory(this.db, parent.parentIno, 'open', normalizedPath);

      const fileIno = await this.createInode(DEFAULT_FILE_MODE);
      await this.createDentry(parent.parentIno, parent.name, fileIno);
      await this.updateFileContent(fileIno, content, encoding);
    }
  }

  private async updateFileContent(
    ino: number,
    content: string | Buffer,
    encoding?: BufferEncoding,
  ): Promise<void> {
    const buffer = typeof content === 'string'
      ? this.bufferCtor.from(content, encoding ?? 'utf8')
      : content;
    const now = Math.floor(Date.now() / 1000);
    const deleteSql = SqlString.format(
      'DELETE FROM fs_data WHERE ino = ?',
      [ ino ],
    );
    await this.db.query(deleteSql, [], { executeType: 'execute' });

    if (buffer.length > 0) {
      let chunkIndex = 0;
      for (let offset = 0; offset < buffer.length; offset += this.chunkSize) {
        const chunk = buffer.subarray(offset, Math.min(offset + this.chunkSize, buffer.length));
        const insertSql = SqlString.format(`
          INSERT INTO fs_data (ino, chunk_index, data)
          VALUES (?, ?, ?)
        `, [ ino, chunkIndex, chunk ]);
        await this.db.query(insertSql, [], { executeType: 'execute' });
        chunkIndex++;
      }
    }

    const updateSql = SqlString.format(`
      UPDATE fs_inode
      SET size = ?, mtime = ?
      WHERE ino = ?
    `, [ buffer.length, now, ino ]);
    await this.db.query(updateSql, [], { executeType: 'execute' });

  }

  async readFile(path: string): Promise<Buffer>;
  async readFile(path: string, encoding: BufferEncoding): Promise<string>;
  async readFile(path: string, options: { encoding: BufferEncoding }): Promise<string>;
  async readFile(
    path: string,
    options?: BufferEncoding | { encoding?: BufferEncoding },
  ): Promise<Buffer | string> {
    const encoding = typeof options === 'string'
      ? options
      : options?.encoding;

    const { normalizedPath, ino } = await this.resolvePathOrThrow(path, 'open');

    await assertReadableExistingInode(this.db, ino, 'open', normalizedPath);

    const sql = SqlString.format(`
      SELECT data FROM fs_data
      WHERE ino = ?
      ORDER BY chunk_index ASC
    `, [ ino ]);
    const rows = await this.db.query(sql) as { data: Buffer }[];

    let combined: Buffer;
    if (rows.length === 0) {
      combined = this.bufferCtor.alloc(0);
    } else {
      const buffers = rows.map(row => row.data);
      combined = this.bufferCtor.concat(buffers);
    }

    const now = Math.floor(Date.now() / 1000);
    const updateSql = SqlString.format(
      'UPDATE fs_inode SET atime = ? WHERE ino = ?',
      [ now, ino ],
    );
    await this.db.query(updateSql, [], { executeType: 'execute' });

    if (encoding) {
      return combined.toString(encoding);
    }
    return combined;
  }

  async readFileLines(path: string): Promise<Buffer[]>;
  async readFileLines(path: string, encoding: BufferEncoding): Promise<string[]>;
  async readFileLines(path: string, options: { encoding: BufferEncoding }): Promise<string[]>;
  async readFileLines(
    path: string,
    options?: BufferEncoding | { encoding?: BufferEncoding },
  ): Promise<Buffer[] | string[]> {
    const encoding = typeof options === 'string'
      ? options
      : options?.encoding;

    const { normalizedPath, ino } = await this.resolvePathOrThrow(path, 'open');

    await assertReadableExistingInode(this.db, ino, 'open', normalizedPath);

    const sql = SqlString.format(`
      SELECT data FROM fs_data
      WHERE ino = ?
      ORDER BY chunk_index ASC
    `, [ ino ]);
    const rows = await this.db.query(sql) as { data: Buffer }[];

    const now = Math.floor(Date.now() / 1000);
    const updateSql = SqlString.format(
      'UPDATE fs_inode SET atime = ? WHERE ino = ?',
      [ now, ino ],
    );
    await this.db.query(updateSql, [], { executeType: 'execute' });

    if (encoding) {
      return rows.map(data => data.data.toString(encoding));
    }
    return rows.map(data => data.data);
  }

  async readdir(path: string): Promise<string[]> {
    const { normalizedPath, ino } = await this.resolvePathOrThrow(path, 'scandir');

    await assertReaddirTargetInode(this.db, ino, normalizedPath);

    const sql = SqlString.format(`
      SELECT name FROM fs_dentry
      WHERE parent_ino = ?
      ORDER BY name ASC
    `, [ ino ]);
    const rows = await this.db.query(sql) as { name: string }[];

    return rows.map(row => row.name);
  }

  async readallFiles(path: string, files: Record<string, FileData> = {}): Promise<Record<string, FileData>> {
    const dirs = await this.readdirPlus(path);

    for (const entry of dirs) {
      const { name, stats } = entry;
      if (stats.isFile()) {
        const content = await this.readFileLines(path + '/' + name, 'utf8');
        const fs = await this.stat(path + '/' + name);
        files[path + '/' + name] = { content, created_at: new Date(fs.ctime).toISOString(), modified_at: new Date(fs.mtime).toISOString() };
      } else if (stats.isDirectory()) {
        await this.readallFiles(path + '/' + name, files);
      }
    }
    return files;
  }

  async readdirPlus(path: string): Promise<DirEntry[]> {
    const { normalizedPath, ino } = await this.resolvePathOrThrow(path, 'scandir');

    await assertReaddirTargetInode(this.db, ino, normalizedPath);

    const sql = SqlString.format(`
      SELECT d.name, i.ino, i.mode, i.nlink, i.uid, i.gid, i.size, i.atime, i.mtime, i.ctime
      FROM fs_dentry d
      JOIN fs_inode i ON d.ino = i.ino
      WHERE d.parent_ino = ?
      ORDER BY d.name ASC
    `, [ ino ]);
    const rows = await this.db.query(sql) as {
      name: string;
      ino: number;
      mode: number;
      nlink: number;
      uid: number;
      gid: number;
      size: number;
      atime: number;
      mtime: number;
      ctime: number;
    }[];


    return rows.map(row => ({
      name: row.name,
      stats: createStats({
        ino: row.ino,
        mode: row.mode,
        nlink: row.nlink,
        uid: row.uid,
        gid: row.gid,
        size: row.size,
        atime: row.atime,
        mtime: row.mtime,
        ctime: row.ctime,
      }),
    }));
  }

  async stat(path: string): Promise<Stats> {
    const { normalizedPath, ino } = await this.resolvePathOrThrow(path, 'stat');

    const sql = SqlString.format(`
      SELECT ino, mode, nlink, uid, gid, size, atime, mtime, ctime
      FROM fs_inode
      WHERE ino = ?
    `, [ ino ]);
    const row = (await this.db.query(sql) as {
      ino: number;
      mode: number;
      nlink: number;
      uid: number;
      gid: number;
      size: number;
      atime: number;
      mtime: number;
      ctime: number;
    }[])[0];


    if (!row) {
      throw createFsError({
        code: 'ENOENT',
        syscall: 'stat',
        path: normalizedPath,
        message: 'no such file or directory',
      });
    }

    return createStats(row);
  }

  async lstat(path: string): Promise<Stats> {
    // For now, lstat is the same as stat since we don't follow symlinks in stat yet
    return this.stat(path);
  }

  async mkdir(path: string, options?: { recursive?: boolean; }): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    const existing = await this.resolvePath(normalizedPath);
    if (existing !== null) {
      throw createFsError({
        code: 'EEXIST',
        syscall: 'mkdir',
        path: normalizedPath,
        message: 'file already exists',
      });
    }

    const parent = await this.resolveParent(normalizedPath);
    if (!parent) {
      if (options?.recursive) {
        await this.ensureParentDirs(normalizedPath);
        return this.mkdir(normalizedPath, {});
      }
      throw createFsError({
        code: 'ENOENT',
        syscall: 'mkdir',
        path: normalizedPath,
        message: 'no such file or directory',
      });
    }

    await assertInodeIsDirectory(this.db, parent.parentIno, 'mkdir', normalizedPath);

    const dirIno = await this.createInode(DEFAULT_DIR_MODE);
    try {
      await this.createDentry(parent.parentIno, parent.name, dirIno);
    } catch {
      throw createFsError({
        code: 'EEXIST',
        syscall: 'mkdir',
        path: normalizedPath,
        message: 'file already exists',
      });
    }
  }

  async rmdir(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    assertNotRoot(normalizedPath, 'rmdir');

    const { ino } = await this.resolvePathOrThrow(normalizedPath, 'rmdir');

    const mode = await getInodeModeOrThrow(this.db, ino, 'rmdir', normalizedPath);
    assertNotSymlinkMode(mode, 'rmdir', normalizedPath);
    if ((mode & S_IFMT) !== S_IFDIR) {
      throw createFsError({
        code: 'ENOTDIR',
        syscall: 'rmdir',
        path: normalizedPath,
        message: 'not a directory',
      });
    }
    const sql = SqlString.format(`
      SELECT 1 as one FROM fs_dentry
      WHERE parent_ino = ?
      LIMIT 1
    `, [ ino ]);
    const child = (await this.db.query(sql) as { one: number }[])[0];
    if (child) {
      throw createFsError({
        code: 'ENOTEMPTY',
        syscall: 'rmdir',
        path: normalizedPath,
        message: 'directory not empty',
      });
    }

    const parent = await this.resolveParent(normalizedPath);
    if (!parent) {
      throw createFsError({
        code: 'EPERM',
        syscall: 'rmdir',
        path: normalizedPath,
        message: 'operation not permitted',
      });
    }

    await this.removeDentryAndMaybeInode(parent.parentIno, parent.name, ino);
  }

  async unlink(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    assertNotRoot(normalizedPath, 'unlink');
    const { ino } = await this.resolvePathOrThrow(normalizedPath, 'unlink');

    await assertUnlinkTargetInode(this.db, ino, normalizedPath);

    const parent = (await this.resolveParent(normalizedPath))!;

    const sql = SqlString.format(`
      DELETE FROM fs_dentry
      WHERE parent_ino = ? AND name = ?
    `, [ parent.parentIno, parent.name ]);
    await this.db.query(sql, [], { executeType: 'execute' });

    const decrementSql = SqlString.format(
      'UPDATE fs_inode SET nlink = nlink - 1 WHERE ino = ?',
      [ ino ],
    );
    await this.db.query(decrementSql, [], { executeType: 'execute' });

    const linkCount = await this.getLinkCount(ino);
    if (linkCount === 0) {
      const deleteInodeSql = SqlString.format(
        'DELETE FROM fs_inode WHERE ino = ?',
        [ ino ],
      );
      await this.db.query(deleteInodeSql, [], { executeType: 'execute' });

      const deleteDataSql = SqlString.format(
        'DELETE FROM fs_data WHERE ino = ?',
        [ ino ],
      );
      await this.db.query(deleteDataSql, [], { executeType: 'execute' });
    }
  }

  async rm(
    path: string,
    options?: { force?: boolean; recursive?: boolean },
  ): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const { force, recursive } = normalizeRmOptions(options);
    assertNotRoot(normalizedPath, 'rm');

    const ino = await this.resolvePath(normalizedPath);
    if (ino === null) {
      throwENOENTUnlessForce(normalizedPath, 'rm', force);
      return;
    }

    const mode = await getInodeModeOrThrow(this.db, ino, 'rm', normalizedPath);
    assertNotSymlinkMode(mode, 'rm', normalizedPath);

    const parent = await this.resolveParent(normalizedPath);
    if (!parent) {
      throw createFsError({
        code: 'EPERM',
        syscall: 'rm',
        path: normalizedPath,
        message: 'operation not permitted',
      });
    }

    if ((mode & S_IFMT) === S_IFDIR) {
      if (!recursive) {
        throw createFsError({
          code: 'EISDIR',
          syscall: 'rm',
          path: normalizedPath,
          message: 'illegal operation on a directory',
        });
      }

      await this.rmDirContentsRecursive(ino);
      await this.removeDentryAndMaybeInode(parent.parentIno, parent.name, ino);
      return;
    }

    await this.removeDentryAndMaybeInode(parent.parentIno, parent.name, ino);
  }

  private async rmDirContentsRecursive(dirIno: number): Promise<void> {
    const sql = SqlString.format(`
      SELECT name, ino FROM fs_dentry
      WHERE parent_ino = ?
      ORDER BY name ASC
    `, [ dirIno ]);
    const children = await this.db.query(sql) as { name: string; ino: number }[];

    for (const child of children) {
      const mode = await this.getInodeMode(child.ino);
      if (mode === null) {
        continue;
      }

      if ((mode & S_IFMT) === S_IFDIR) {
        await this.rmDirContentsRecursive(child.ino);
        await this.removeDentryAndMaybeInode(dirIno, child.name, child.ino);
      } else {
        assertNotSymlinkMode(mode, 'rm', '<symlink>');
        await this.removeDentryAndMaybeInode(dirIno, child.name, child.ino);
      }
    }
  }

  private async removeDentryAndMaybeInode(parentIno: number, name: string, ino: number): Promise<void> {
    const sql = SqlString.format(`
      DELETE FROM fs_dentry
      WHERE parent_ino = ? AND name = ?
    `, [ parentIno, name ]);
    await this.db.query(sql, [], { executeType: 'execute' });

    const decrementSql = SqlString.format(
      'UPDATE fs_inode SET nlink = nlink - 1 WHERE ino = ?',
      [ ino ],
    );
    await this.db.query(decrementSql, [], { executeType: 'execute' });

    const linkCount = await this.getLinkCount(ino);
    if (linkCount === 0) {
      const deleteInodeSql = SqlString.format(
        'DELETE FROM fs_inode WHERE ino = ?',
        [ ino ],
      );
      await this.db.query(deleteInodeSql, [], { executeType: 'execute' });

      const deleteDataSql = SqlString.format(
        'DELETE FROM fs_data WHERE ino = ?',
        [ ino ],
      );
      await this.db.query(deleteDataSql, [], { executeType: 'execute' });

      const deleteSymlinkSql = SqlString.format(
        'DELETE FROM fs_symlink WHERE ino = ?',
        [ ino ],
      );
      await this.db.query(deleteSymlinkSql, [], { executeType: 'execute' });
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldNormalized = this.normalizePath(oldPath);
    const newNormalized = this.normalizePath(newPath);

    if (oldNormalized === newNormalized) return;

    assertNotRoot(oldNormalized, 'rename');
    assertNotRoot(newNormalized, 'rename');

    const oldParent = await this.resolveParent(oldNormalized);
    if (!oldParent) {
      throw createFsError({
        code: 'EPERM',
        syscall: 'rename',
        path: oldNormalized,
        message: 'operation not permitted',
      });
    }

    const newParent = await this.resolveParent(newNormalized);
    if (!newParent) {
      throw createFsError({
        code: 'ENOENT',
        syscall: 'rename',
        path: newNormalized,
        message: 'no such file or directory',
      });
    }

    await assertInodeIsDirectory(this.db, newParent.parentIno, 'rename', newNormalized);

    await this.db.beginTransactionScope(async () => {
      const oldResolved = await this.resolvePathOrThrow(oldNormalized, 'rename');
      const oldIno = oldResolved.ino;
      const oldMode = await getInodeModeOrThrow(this.db, oldIno, 'rename', oldNormalized);
      assertNotSymlinkMode(oldMode, 'rename', oldNormalized);
      const oldIsDir = (oldMode & S_IFMT) === S_IFDIR;

      if (oldIsDir && newNormalized.startsWith(oldNormalized + '/')) {
        throw createFsError({
          code: 'EINVAL',
          syscall: 'rename',
          path: newNormalized,
          message: 'invalid argument',
        });
      }

      const newIno = await this.resolvePath(newNormalized);
      if (newIno !== null) {
        const newMode = await getInodeModeOrThrow(this.db, newIno, 'rename', newNormalized);
        assertNotSymlinkMode(newMode, 'rename', newNormalized);
        const newIsDir = (newMode & S_IFMT) === S_IFDIR;

        if (newIsDir && !oldIsDir) {
          throw createFsError({
            code: 'EISDIR',
            syscall: 'rename',
            path: newNormalized,
            message: 'illegal operation on a directory',
          });
        }
        if (!newIsDir && oldIsDir) {
          throw createFsError({
            code: 'ENOTDIR',
            syscall: 'rename',
            path: newNormalized,
            message: 'not a directory',
          });
        }

        if (newIsDir) {
          const sql = SqlString.format(`
            SELECT 1 as one FROM fs_dentry
            WHERE parent_ino = ?
            LIMIT 1
          `, [ newIno ]);
          const child = (await this.db.query(sql) as { one: number }[])[0];
          if (child) {
            throw createFsError({
              code: 'ENOTEMPTY',
              syscall: 'rename',
              path: newNormalized,
              message: 'directory not empty',
            });
          }
        }

        await this.removeDentryAndMaybeInode(newParent.parentIno, newParent.name, newIno);
      }

      const updateDentrySql = SqlString.format(`
        UPDATE fs_dentry
        SET parent_ino = ?, name = ?
        WHERE parent_ino = ? AND name = ?
      `, [ newParent.parentIno, newParent.name, oldParent.parentIno, oldParent.name ]);
      await this.db.query(updateDentrySql, [], { executeType: 'execute' });

      const now = Math.floor(Date.now() / 1000);
      const updateInodeCtimeSql = SqlString.format(`
        UPDATE fs_inode
        SET ctime = ?
        WHERE ino = ?
      `, [ now, oldIno ]);
      await this.db.query(updateInodeCtimeSql, [], { executeType: 'execute' });

      if (newParent.parentIno !== oldParent.parentIno) {
        const sql = SqlString.format(`
          UPDATE fs_inode
          SET mtime = ?, ctime = ?
          WHERE ino = ?
        `, [ now, now, newParent.parentIno ]);
        await this.db.query(sql, [], { executeType: 'execute' });
      } else {
        const sql = SqlString.format(`
          UPDATE fs_inode
          SET mtime = ?, ctime = ?
          WHERE ino = ?
        `, [ now, now, oldParent.parentIno ]);
        await this.db.query(sql, [], { executeType: 'execute' });
      }
    });
  }

  async copyFile(src: string, dest: string): Promise<void> {
    const srcNormalized = this.normalizePath(src);
    const destNormalized = this.normalizePath(dest);

    if (srcNormalized === destNormalized) {
      throw createFsError({
        code: 'EINVAL',
        syscall: 'copyfile',
        path: destNormalized,
        message: 'invalid argument',
      });
    }

    const { ino: srcIno } = await this.resolvePathOrThrow(srcNormalized, 'copyfile');
    await assertReadableExistingInode(this.db, srcIno, 'copyfile', srcNormalized);

    const sql = SqlString.format(`
      SELECT mode, uid, gid, size FROM fs_inode WHERE ino = ?
    `, [ srcIno ]);
    const srcRow = (await this.db.query(sql) as
      | { mode: number; uid: number; gid: number; size: number }[])[0];
    if (!srcRow) {
      throw createFsError({
        code: 'ENOENT',
        syscall: 'copyfile',
        path: srcNormalized,
        message: 'no such file or directory',
      });
    }

    const destParent = await this.resolveParent(destNormalized);
    if (!destParent) {
      throw createFsError({
        code: 'ENOENT',
        syscall: 'copyfile',
        path: destNormalized,
        message: 'no such file or directory',
      });
    }
    await assertInodeIsDirectory(this.db, destParent.parentIno, 'copyfile', destNormalized);

    await this.db.beginTransactionScope(async () => {
      const now = Math.floor(Date.now() / 1000);

      const destIno = await this.resolvePath(destNormalized);
      if (destIno !== null) {
        const destMode = await getInodeModeOrThrow(this.db, destIno, 'copyfile', destNormalized);
        assertNotSymlinkMode(destMode, 'copyfile', destNormalized);
        if ((destMode & S_IFMT) === S_IFDIR) {
          throw createFsError({
            code: 'EISDIR',
            syscall: 'copyfile',
            path: destNormalized,
            message: 'illegal operation on a directory',
          });
        }

        const deleteSql = SqlString.format(
          'DELETE FROM fs_data WHERE ino = ?',
          [ destIno ],
        );
        await this.db.query(deleteSql, [], { executeType: 'execute' });

        const copySql = SqlString.format(`
          INSERT INTO fs_data (ino, chunk_index, data)
          SELECT ?, chunk_index, data
          FROM fs_data
          WHERE ino = ?
          ORDER BY chunk_index ASC
        `, [ destIno, srcIno ]);
        await this.db.query(copySql, [], { executeType: 'execute' });

        const updateSql = SqlString.format(`
          UPDATE fs_inode
          SET mode = ?, uid = ?, gid = ?, size = ?, mtime = ?, ctime = ?
          WHERE ino = ?
        `, [ srcRow.mode, srcRow.uid, srcRow.gid, srcRow.size, now, now, destIno ]);
        await this.db.query(updateSql, [], { executeType: 'execute' });
      } else {
        const destInoCreated = await this.createInode(srcRow.mode, srcRow.uid, srcRow.gid);
        await this.createDentry(destParent.parentIno, destParent.name, destInoCreated);

        const copySql = SqlString.format(`
          INSERT INTO fs_data (ino, chunk_index, data)
          SELECT ?, chunk_index, data
          FROM fs_data
          WHERE ino = ?
          ORDER BY chunk_index ASC
        `, [ destInoCreated, srcIno ]);
        await this.db.query(copySql, [], { executeType: 'execute' });

        const updateSql = SqlString.format(`
          UPDATE fs_inode
          SET size = ?, mtime = ?, ctime = ?
          WHERE ino = ?
        `, [ srcRow.size, now, now, destInoCreated ]);
        await this.db.query(updateSql, [], { executeType: 'execute' });
      }
    });
  }

  async symlink(target: string, linkpath: string): Promise<void> {
    const normalizedLinkpath = this.normalizePath(linkpath);

    const existing = await this.resolvePath(normalizedLinkpath);
    if (existing !== null) {
      throw createFsError({
        code: 'EEXIST',
        syscall: 'open',
        path: normalizedLinkpath,
        message: 'file already exists',
      });
    }

    const parent = await this.resolveParent(normalizedLinkpath);
    if (!parent) {
      throw createFsError({
        code: 'ENOENT',
        syscall: 'open',
        path: normalizedLinkpath,
        message: 'no such file or directory',
      });
    }

    await assertInodeIsDirectory(this.db, parent.parentIno, 'open', normalizedLinkpath);

    const mode = S_IFLNK | 0o777;
    const symlinkIno = await this.createInode(mode);
    await this.createDentry(parent.parentIno, parent.name, symlinkIno);

    const insertSql = SqlString.format(
      'INSERT INTO fs_symlink (ino, target) VALUES (?, ?)',
      [ symlinkIno, target ],
    );
    await this.db.query(insertSql, [], { executeType: 'execute' });

    const updateSql = SqlString.format(
      'UPDATE fs_inode SET size = ? WHERE ino = ?',
      [ target.length, symlinkIno ],
    );
    await this.db.query(updateSql, [], { executeType: 'execute' });
  }

  async readlink(path: string): Promise<string> {
    const { normalizedPath, ino } = await this.resolvePathOrThrow(path, 'open');

    const mode = await this.getInodeMode(ino);
    if (mode === null || (mode & S_IFMT) !== S_IFLNK) {
      throw createFsError({
        code: 'EINVAL',
        syscall: 'open',
        path: normalizedPath,
        message: 'invalid argument',
      });
    }

    const sql = SqlString.format(
      'SELECT target FROM fs_symlink WHERE ino = ?',
      [ ino ],
    );
    const row = (await this.db.query(sql) as { target: string }[])[0];

    if (!row) {
      throw createFsError({
        code: 'ENOENT',
        syscall: 'open',
        path: normalizedPath,
        message: 'no such file or directory',
      });
    }

    return row.target;
  }

  async access(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const ino = await this.resolvePath(normalizedPath);
    if (ino === null) {
      throw createFsError({
        code: 'ENOENT',
        syscall: 'access',
        path: normalizedPath,
        message: 'no such file or directory',
      });
    }
  }

  async statfs(): Promise<FilesystemStats> {
    const inodeSql = 'SELECT COUNT(*) as count FROM fs_inode';
    const inodeRow = (await this.db.query(inodeSql) as { count: number }[])[0];

    const bytesSql = 'SELECT COALESCE(SUM(LENGTH(data)), 0) as total FROM fs_data';
    const bytesRow = (await this.db.query(bytesSql) as { total: number }[])[0];

    return {
      inodes: inodeRow.count,
      bytesUsed: bytesRow.total,
    };
  }

  async open(path: string): Promise<FileHandle> {
    const { normalizedPath, ino } = await this.resolvePathOrThrow(path, 'open');
    await assertReadableExistingInode(this.db, ino, 'open', normalizedPath);

    return new AgentFSFile(this.db, this.bufferCtor, ino, this.chunkSize);
  }

  // Legacy alias
  async deleteFile(path: string): Promise<void> {
    return await this.unlink(path);
  }
}
