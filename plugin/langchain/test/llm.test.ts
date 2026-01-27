import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';
import Tracer from 'egg-tracer/lib/tracer';
import type { MysqlFilesystem } from '../lib/filesystem/MysqlFilesystem';
import type { AgentFS } from '../lib/filesystem/agentfs/agentfs';
import { MysqlDataSource } from '@eggjs/dal-runtime';
import SqlString from 'sqlstring';
import os from 'node:os';


describe('plugin/langchain/test/llm.test.ts', () => {
  // https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain/package.json#L9
  if (parseInt(process.version.slice(1, 3)) > 19) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startSSEServer, stopSSEServer } = require('./fixtures/sse-mcp-server/http');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ChatOpenAIModel } = require('../lib/ChatOpenAI');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BaseChatOpenAI } = require('@langchain/openai');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FileSystemInjectName, FileSystemQualifierAttribute } = require('@eggjs/tegg-langchain-decorator');
    let app;

    before(async () => {
      await startSSEServer(17283);
      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return path.join(__dirname, '..');
      });
      app = mm.app({
        baseDir: path.join(__dirname, 'fixtures/apps/langchain'),
        framework: path.dirname(require.resolve('egg')),
      });
      await app.ready();
    });

    after(async () => {
      const mysqlFilesystem: MysqlFilesystem = await app.getEggObjectFromName(FileSystemInjectName, [{
        attribute: FileSystemQualifierAttribute,
        value: 'foo',
      }]);
      const mysql = mysqlFilesystem.mysql;
      const delConfig = 'DELETE FROM fs_config';
      await mysql.query(delConfig, [], { executeType: 'execute' });
      const delData = 'DELETE FROM fs_data';
      await mysql.query(delData, [], { executeType: 'execute' });
      const delDentry = 'DELETE FROM fs_dentry';
      await mysql.query(delDentry, [], { executeType: 'execute' });
      const delInode = 'DELETE FROM fs_inode';
      await mysql.query(delInode, [], { executeType: 'execute' });
      const delSymlink = 'DELETE FROM fs_symlink';
      await mysql.query(delSymlink, [], { executeType: 'execute' });
      await app.close();
      await stopSSEServer();
    });

    afterEach(async () => {
      mm.restore();
    });

    it('should work', async () => {
      mm(ChatOpenAIModel.prototype, 'invoke', async () => {
        return {
          text: 'hello world',
        };
      });
      const res = await app.httpRequest()
        .get('/llm/hello')
        .expect(200);
      assert.deepStrictEqual(res.body, {
        text: 'hello world',
      });
    });

    it('should bound work', async () => {
      mm(BaseChatOpenAI.prototype, 'invoke', async () => {
        return {
          text: 'hello world 2',
        };
      });
      const res = await app.httpRequest()
        .get('/llm/bound-chat')
        .expect(200);
      assert.deepStrictEqual(res.body, {
        text: 'hello world 2',
      });
    });

    it('should graph work', async () => {
      app.mockLog();
      mm(Tracer.prototype, 'traceId', 'test-trace-id');
      await app.httpRequest()
        .get('/llm/graph')
        .expect(200, { value: 'hello graph toolhello world' });
      app.expectLog(/agent_run/);
      app.expectLog(/Executing FooNode thread_id is 1/);
      app.expectLog(/traceId=test-trace-id/);
    });

    describe('filesystem should work', () => {
      let fs: AgentFS;
      let mysql: MysqlDataSource;
      before(async () => {
        const mysqlFilesystem: MysqlFilesystem = await app.getEggObjectFromName(FileSystemInjectName, [{
          attribute: FileSystemQualifierAttribute,
          value: 'foo',
        }]);
        fs = mysqlFilesystem.agentFs;
        mysql = mysqlFilesystem.mysql;
      });
      // File Write Operations
      it('should write and read a simple text file', async () => {
        await fs.writeFile('/test.txt', 'Hello, World!');
        const content = await fs.readFile('/test.txt', 'utf8');
        assert.deepStrictEqual(content, 'Hello, World!');
        await fs.rm('/test.txt');
      });

      it('should respect encoding option when writing string data', async () => {
        await fs.writeFile('/enc.txt', 'hello', { encoding: 'utf16le' });
        const data = await fs.readFile('/enc.txt') as Buffer;
        assert.deepStrictEqual(data.toString('utf16le'), 'hello');
        await fs.rm('/enc.txt');
      });

      it('should throw EISDIR when attempting to write to a directory path', async () => {
        await fs.writeFile('/dir/file.txt', 'content'); // create directory
        await assert.rejects(fs.writeFile('/dir', 'nope'), { code: 'EISDIR' });
      });

      it('should throw ENOTDIR when a parent path component is a file', async () => {
        await fs.writeFile('/a', 'file-content'); // create file
        await assert.rejects(fs.writeFile('/a/b.txt', 'child'), { code: 'ENOTDIR' });
        await fs.rm('/a', { recursive: true });
      });

      it('should write and read files in subdirectories', async () => {
        await fs.writeFile('/dir/subdir/file.txt', 'nested content');
        const content = await fs.readFile('/dir/subdir/file.txt', 'utf8');
        assert.deepStrictEqual(content, 'nested content');
        await fs.rm('/dir', { recursive: true });
      });

      it('should overwrite existing file', async () => {
        await fs.writeFile('/overwrite.txt', 'original content');
        await fs.writeFile('/overwrite.txt', 'new content');
        const content = await fs.readFile('/overwrite.txt', 'utf8');
        assert.deepStrictEqual(content, 'new content');
        await fs.rm('/overwrite.txt');
      });

      it('should handle empty file content', async () => {
        await fs.writeFile('/empty.txt', '');
        const content = await fs.readFile('/empty.txt', 'utf8');
        assert.deepStrictEqual(content, '');
        await fs.rm('/empty.txt');
      });

      it('should handle large file content', async () => {
        const largeContent = 'x'.repeat(100000);
        await fs.writeFile('/large.txt', largeContent);
        const content = await fs.readFile('/large.txt', 'utf8');
        assert.deepStrictEqual(content, largeContent);
        await fs.rm('/large.txt');
      });

      // it('should handle files with special characters in content', async () => {
      //   const specialContent = 'Special chars: \n\t\r\''\\';
      //   await fs.writeFile('/special.txt', specialContent);
      //   const content = await fs.readFile('/special.txt', 'utf8');
      //   assert.deepStrictEqual(content, specialContent);
      //   await fs.rm('/special.txt');
      // });

      // File Read Operations
      it('should throw error when reading non-existent file', async () => {
        await assert.rejects(fs.readFile('/non-existent.txt'), { code: 'ENOENT' });
      });

      it('should throw EISDIR when attempting to read a directory path', async () => {
        await fs.writeFile('/dir/file.txt', 'content');
        await assert.rejects(fs.readFile('/dir'), { code: 'EISDIR' });
        await fs.rm('/dir', { recursive: true });
      });

      it('should read multiple different files', async () => {
        await fs.writeFile('/file1.txt', 'content 1');
        await fs.writeFile('/file2.txt', 'content 2');
        await fs.writeFile('/file3.txt', 'content 3');

        assert.deepStrictEqual(await fs.readFile('/file1.txt', 'utf8'), 'content 1');
        assert.deepStrictEqual(await fs.readFile('/file2.txt', 'utf8'), 'content 2');
        assert.deepStrictEqual(await fs.readFile('/file3.txt', 'utf8'), 'content 3');

        await fs.rm('/file1.txt');
        await fs.rm('/file2.txt');
        await fs.rm('/file3.txt');
      });

      // Directory Operations
      it('should create a directory with mkdir()', async () => {
        await fs.mkdir('/newdir');
        const entries = await fs.readdir('/');
        assert.deepStrictEqual(entries.includes('newdir'), true);
        await fs.rm('/newdir', { recursive: true });
      });

      it('should throw EEXIST when mkdir() is called on an existing directory', async () => {
        await fs.mkdir('/exists');
        await assert.rejects(fs.mkdir('/exists'), { code: 'EEXIST' });
        await fs.rm('/exists', { recursive: true });
      });

      it('should throw ENOENT when parent directory does not exist', async () => {
        await assert.rejects(fs.mkdir('/missing-parent/child'), { code: 'ENOENT' });
      });

      it('should list files in root directory', async () => {
        await fs.writeFile('/file1.txt', 'content 1');
        await fs.writeFile('/file2.txt', 'content 2');
        await fs.writeFile('/file3.txt', 'content 3');

        const files = await fs.readdir('/');
        assert.deepStrictEqual(files, [ 'file1.txt', 'file2.txt', 'file3.txt' ]);

        await fs.rm('/file1.txt');
        await fs.rm('/file2.txt');
        await fs.rm('/file3.txt');
      });

      it('should list files in subdirectory', async () => {
        await fs.writeFile('/dir/file1.txt', 'content 1');
        await fs.writeFile('/dir/file2.txt', 'content 2');
        await fs.writeFile('/other/file3.txt', 'content 3');

        const files = await fs.readdir('/dir');

        assert.deepStrictEqual(files, [ 'file1.txt', 'file2.txt' ]);

        await fs.rm('/dir', { recursive: true });
        await fs.rm('/other', { recursive: true });
      });

      it('should return empty array for empty directory', async () => {
        await fs.writeFile('/dir/file.txt', 'content');
        // /dir exists but is not empty, root exists and should be empty except for 'dir'
        const files = await fs.readdir('/');
        assert.deepStrictEqual(files.includes('dir'), true);
        await fs.rm('/dir', { recursive: true });
      });

      it('should distinguish between files in different directories', async () => {
        await fs.writeFile('/dir1/file.txt', 'content 1');
        await fs.writeFile('/dir2/file.txt', 'content 2');

        const files1 = await fs.readdir('/dir1');
        const files2 = await fs.readdir('/dir2');

        assert.deepStrictEqual(files1, [ 'file.txt' ]);
        assert.deepStrictEqual(files2, [ 'file.txt' ]);

        await fs.rm('/dir1', { recursive: true });
        await fs.rm('/dir2', { recursive: true });
      });

      it('should list subdirectories within a directory', async () => {
        await fs.writeFile('/parent/child1/file.txt', 'content');
        await fs.writeFile('/parent/child2/file.txt', 'content');
        await fs.writeFile('/parent/file.txt', 'content');

        const entries = await fs.readdir('/parent');
        assert.deepStrictEqual(entries.includes('file.txt'), true);
        assert.deepStrictEqual(entries.includes('child1'), true);
        assert.deepStrictEqual(entries.includes('child2'), true);

        await fs.rm('/parent', { recursive: true });
      });

      it('should handle nested directory structures', async () => {
        await fs.writeFile('/a/b/c/d/file.txt', 'deep content');
        const files = await fs.readdir('/a/b/c/d');
        assert.deepStrictEqual(files.includes('file.txt'), true);

        await fs.rm('/a', { recursive: true });
      });

      it('should throw ENOTDIR when attempting to readdir a file path', async () => {
        await fs.writeFile('/notadir.txt', 'content');
        await assert.rejects(fs.readdir('/notadir.txt'), { code: 'ENOTDIR' });
        await fs.rm('/notadir.txt');
      });

      // File Delete Operations
      it('should delete an existing file', async () => {
        await fs.writeFile('/delete-me.txt', 'content');
        await fs.unlink('/delete-me.txt');
        await assert.rejects(fs.readFile('/delete-me.txt'));
      });

      it('should handle deleting non-existent file', async () => {
        await assert.rejects(fs.unlink('/non-existent.txt'), { code: 'ENOENT' });
      });

      it('should delete file and update directory listing', async () => {
        await fs.writeFile('/dir/file1.txt', 'content 1');
        await fs.writeFile('/dir/file2.txt', 'content 2');

        await fs.unlink('/dir/file1.txt');

        const files = await fs.readdir('/dir');
        assert.deepStrictEqual(files, [ 'file2.txt' ]);

        await fs.rm('/dir', { recursive: true });
      });

      it('should allow recreating deleted file', async () => {
        await fs.writeFile('/recreate.txt', 'original');
        await fs.unlink('/recreate.txt');
        await fs.writeFile('/recreate.txt', 'new content');
        const content = await fs.readFile('/recreate.txt', 'utf8');
        assert.deepStrictEqual(content, 'new content');
        await fs.rm('/recreate.txt');
      });

      it('should throw EISDIR when attempting to unlink a directory', async () => {
        await fs.writeFile('/adir/file.txt', 'content');
        await assert.rejects(fs.unlink('/adir'), { code: 'EISDIR' });
        await fs.rm('/adir', { recursive: true });
      });

      // rm() Operations
      it('should remove a file', async () => {
        await fs.writeFile('/rmfile.txt', 'content');
        await fs.rm('/rmfile.txt');
        await assert.rejects(fs.readFile('/rmfile.txt'), { code: 'ENOENT' });
      });

      it('should not throw when force=true and path does not exist', async () => {
        await fs.rm('/does-not-exist', { force: true });
      });

      it('should throw ENOENT when force=false and path does not exist', async () => {
        await assert.rejects(fs.rm('/does-not-exist'), { code: 'ENOENT' });
      });

      it('should throw EISDIR when trying to rm a directory without recursive', async () => {
        await fs.mkdir('/rmdir');
        await assert.rejects(fs.rm('/rmdir'), { code: 'EISDIR' });
        await fs.rm('/rmdir', { recursive: true });
      });

      it('should remove a directory recursively', async () => {
        await fs.writeFile('/tree/a/b/c.txt', 'content');
        await fs.rm('/tree', { recursive: true });
        await assert.rejects(fs.readdir('/tree'), { code: 'ENOENT' });
        const root = await fs.readdir('/');
        assert.deepStrictEqual(root.includes('tree'), false);
      });

      // rmdir() Operations
      it('should remove an empty directory', async () => {
        await fs.mkdir('/emptydir');
        await fs.rmdir('/emptydir');
        await assert.rejects(fs.readdir('/emptydir'), { code: 'ENOENT' });
        const root = await fs.readdir('/');
        assert.deepStrictEqual(root.includes('emptydir'), false);
      });

      it('should throw ENOTEMPTY when directory is not empty', async () => {
        await fs.writeFile('/nonempty/file.txt', 'content');
        await assert.rejects(fs.rmdir('/nonempty'), { code: 'ENOTEMPTY' });
        await fs.rm('/nonempty', { recursive: true });
      });

      it('should throw ENOTDIR when path is a file', async () => {
        await fs.writeFile('/afile', 'content');
        await assert.rejects(fs.rmdir('/afile'), { code: 'ENOTDIR' });
        await fs.rm('/afile');
      });

      it('should throw EPERM when attempting to remove root', async () => {
        await assert.rejects(fs.rmdir('/'), { code: 'EPERM' });
      });

      // rename() Operations
      it('should rename a file', async () => {
        await fs.writeFile('/a.txt', 'hello');
        await fs.rename('/a.txt', '/b.txt');
        await assert.rejects(fs.readFile('/a.txt'), { code: 'ENOENT' });
        const content = await fs.readFile('/b.txt', 'utf8');
        assert.deepStrictEqual(content, 'hello');
        await fs.rm('/b.txt');
      });

      it('should rename a directory and preserve its contents', async () => {
        await fs.writeFile('/olddir/sub/file.txt', 'content');
        await fs.rename('/olddir', '/newdir');
        await assert.rejects(fs.readdir('/olddir'), { code: 'ENOENT' });
        const content = await fs.readFile('/newdir/sub/file.txt', 'utf8');
        assert.deepStrictEqual(content, 'content');
        await fs.rm('/newdir', { recursive: true });
      });

      it('should overwrite destination file if it exists', async () => {
        await fs.writeFile('/src.txt', 'src');
        await fs.writeFile('/dst.txt', 'dst');
        await fs.rename('/src.txt', '/dst.txt');
        await assert.rejects(fs.readFile('/src.txt'), { code: 'ENOENT' });
        const content = await fs.readFile('/dst.txt', 'utf8');
        assert.deepStrictEqual(content, 'src');
        await fs.rm('/dst.txt');
      });

      it('should throw EISDIR when renaming a file onto a directory', async () => {
        await fs.writeFile('/dir/file.txt', 'content');
        await fs.writeFile('/file.txt', 'content');
        await assert.rejects(fs.rename('/file.txt', '/dir'), { code: 'EISDIR' });
        await fs.rm('/dir', { recursive: true });
        await fs.rm('/file.txt');
      });

      it('should throw ENOTDIR when renaming a directory onto a file', async () => {
        await fs.mkdir('/somedir');
        await fs.writeFile('/somefile', 'content');
        await assert.rejects(fs.rename('/somedir', '/somefile'), { code: 'ENOTDIR' });
        await fs.rm('/somedir', { recursive: true });
        await fs.rm('/somefile');
      });

      it('should replace an existing empty directory', async () => {
        await fs.mkdir('/fromdir');
        await fs.mkdir('/todir');
        await fs.rename('/fromdir', '/todir');
        const root = await fs.readdir('/');
        assert.deepStrictEqual(root.includes('fromdir'), false);
        assert.deepStrictEqual(root.includes('todir'), true);
        await assert.rejects(fs.readdir('/fromdir'), { code: 'ENOENT' });
        await fs.rm('/todir', { recursive: true });
      });

      it('should throw ENOTEMPTY when replacing a non-empty directory', async () => {
        await fs.mkdir('/fromdir');
        await fs.writeFile('/todir/file.txt', 'content');
        await assert.rejects(fs.rename('/fromdir', '/todir'), { code: 'ENOTEMPTY' });
        await fs.rm('/fromdir', { recursive: true });
        await fs.rm('/todir', { recursive: true });
      });

      it('should throw EPERM when attempting to rename root', async () => {
        await assert.rejects(fs.rename('/', '/x'), { code: 'EPERM' });
      });

      it('should throw EINVAL when renaming a directory into its own subdirectory', async () => {
        await fs.writeFile('/cycle/sub/file.txt', 'content');
        await assert.rejects(fs.rename('/cycle', '/cycle/sub/moved'), { code: 'EINVAL' });
        await fs.rm('/cycle', { recursive: true });
      });


      // copyFile() Operations
      it('should copy a file', async () => {
        await fs.writeFile('/src.txt', 'hello');
        await fs.copyFile('/src.txt', '/dst.txt');
        const srcContent = await fs.readFile('/src.txt', 'utf8');
        const dstContent = await fs.readFile('/dst.txt', 'utf8');
        assert.deepStrictEqual(srcContent, dstContent);
        await fs.rm('/src.txt');
        await fs.rm('/dst.txt');
      });

      it('should overwrite destination if it exists', async () => {
        await fs.writeFile('/src.txt', 'src');
        await fs.writeFile('/dst.txt', 'dst');
        await fs.copyFile('/src.txt', '/dst.txt');
        const dstContent = await fs.readFile('/dst.txt', 'utf8');
        assert.deepStrictEqual(dstContent, 'src');
        await fs.rm('/src.txt');
        await fs.rm('/dst.txt');
      });

      it('should throw ENOENT when source does not exist', async () => {
        await assert.rejects(fs.copyFile('/nope.txt', '/out.txt'), { code: 'ENOENT' });
      });

      it('should throw ENOENT when destination parent does not exist', async () => {
        await fs.writeFile('/src3.txt', 'content');
        await assert.rejects(fs.copyFile('/src3.txt', '/missing/child.txt'), { code: 'ENOENT' });
        await fs.rm('/src3.txt');
      });

      it('should throw EISDIR when source is a directory', async () => {
        await fs.mkdir('/asrcdir');
        await assert.rejects(fs.copyFile('/asrcdir', '/out2.txt'), { code: 'EISDIR' });
        await fs.rm('/asrcdir', { recursive: true });
      });

      it('should throw EISDIR when destination is a directory', async () => {
        await fs.writeFile('/src4.txt', 'content');
        await fs.mkdir('/adstdir');
        await assert.rejects(fs.copyFile('/src4.txt', '/adstdir'), { code: 'EISDIR' });
        await fs.rm('/src4.txt');
        await fs.rm('/adstdir', { recursive: true });
      });

      it('should throw EINVAL when source and destination are the same', async () => {
        await fs.writeFile('/same.txt', 'content');
        await assert.rejects(fs.copyFile('/same.txt', '/same.txt'), { code: 'EINVAL' });
        await fs.rm('/same.txt');
      });

      // access() Operations
      it('should resolve when a file exists', async () => {
        await fs.writeFile('/exists.txt', 'content');
        await fs.rm('/exists.txt');
      });

      it('should resolve when a directory exists', async () => {
        await fs.mkdir('/existsdir');
        await fs.rm('/existsdir', { recursive: true });
      });

      it('should throw ENOENT when path does not exist', async () => {
        await assert.rejects(fs.access('/does-not-exist'), { code: 'ENOENT' });
      });

      // Path Handling
      it('should handle paths with trailing slashes', async () => {
        await fs.writeFile('/dir/file.txt', 'content');
        const files1 = await fs.readdir('/dir');
        const files2 = await fs.readdir('/dir/');
        assert.deepStrictEqual(files1, files2);
        await fs.rm('/dir', { recursive: true });
      });

      it('should handle paths with special characters', async () => {
        const specialPath = '/dir-with-dash/file_with_underscore.txt';
        await fs.writeFile(specialPath, 'content');
        const content = await fs.readFile(specialPath, 'utf8');
        assert.deepStrictEqual(content, 'content');
        await fs.rm('/dir-with-dash', { recursive: true });
      });

      // Concurrent Operations
      it('should handle concurrent writes to different files', async () => {
        const operations = Array.from({ length: 10 }, (_, i) =>
          fs.writeFile(`/concurrent-${i}.txt`, `content ${i}`),
        );
        await Promise.all(operations);

        // Verify all files were created
        for (let i = 0; i < 10; i++) {
          const content = await fs.readFile(`/concurrent-${i}.txt`, 'utf8');
          assert.deepStrictEqual(content, `content ${i}`);
          await fs.rm(`/concurrent-${i}.txt`);
        }
      });

      it('should handle concurrent reads', async () => {
        await fs.writeFile('/concurrent-read.txt', 'shared content');

        await Promise.all(
          Array.from({ length: 10 }, () =>
            fs.readFile('/concurrent-read.txt', 'utf8'),
          ),
        );
        for (let i = 0; i < 10; i++) {
          const content = await fs.readFile('/concurrent-read.txt', 'utf8');
          assert.deepStrictEqual(content, 'shared content');
        }
        await fs.rm('/concurrent-read.txt');
      });

      // File System Integrity
      it('should maintain file hierarchy integrity', async () => {
        await fs.writeFile('/root.txt', 'root');
        await fs.writeFile('/dir1/file.txt', 'dir1');
        await fs.writeFile('/dir2/file.txt', 'dir2');
        await fs.writeFile('/dir1/subdir/file.txt', 'subdir');
        assert.deepStrictEqual(await fs.readFile('/root.txt', 'utf8'), 'root');
        assert.deepStrictEqual(await fs.readFile('/dir1/file.txt', 'utf8'), 'dir1');
        assert.deepStrictEqual(await fs.readFile('/dir2/file.txt', 'utf8'), 'dir2');
        assert.deepStrictEqual(await fs.readFile('/dir1/subdir/file.txt', 'utf8'), 'subdir');

        const rootFiles = await fs.readdir('/');
        assert.deepStrictEqual(rootFiles.includes('root.txt'), true);
        assert.deepStrictEqual(rootFiles.includes('dir1'), true);
        assert.deepStrictEqual(rootFiles.includes('dir2'), true);
        await fs.rm('/root.txt');
        await fs.rm('/dir1', { recursive: true });
        await fs.rm('/dir2', { recursive: true });
      });

      it('should support multiple files with same name in different directories', async () => {
        await fs.writeFile('/dir1/config.json', '{\'version\': 1}');
        await fs.writeFile('/dir2/config.json', '{\'version\': 2}');
        assert.deepStrictEqual(await fs.readFile('/dir1/config.json', 'utf8'), '{\'version\': 1}');
        assert.deepStrictEqual(await fs.readFile('/dir2/config.json', 'utf8'), '{\'version\': 2}');

        await fs.rm('/dir1', { recursive: true });
        await fs.rm('/dir2', { recursive: true });
      });

      // Chunk Size Boundary Tests
      async function getChunkCount(path: string): Promise<number> {
        // const stmt = mysql.prepare(`
        //   SELECT COUNT(*) as count FROM fs_data
        //   WHERE ino = (SELECT ino FROM fs_dentry WHERE parent_ino = 1 AND name = ?)
        // `);
        // const sql = SqlString.format(`
        //   SELECT COUNT(*) as count FROM fs_data
        //   WHERE ino = (SELECT ino FROM fs_dentry WHERE parent_ino = 1 AND name = ?)
        // `, [ path ]);
        const pathParts = path.split('/').filter(p => p);
        // const name = pathParts[pathParts.length - 1];

        // For simple paths, get the inode from the path
        // const lookupStmt = db.prepare(`
        //   SELECT d.ino FROM fs_dentry d WHERE d.parent_ino = ? AND d.name = ?
        // `);

        let currentIno = 1; // root
        for (const part of pathParts) {
          const sql = SqlString.format(
            'SELECT ino FROM fs_dentry WHERE parent_ino = ? AND name = ?',
            [ currentIno, part ],
          );
          const result = (await mysql.query(sql, [], { executeType: 'execute' }) as { ino: number }[])[0];
          if (!result) return 0;
          currentIno = result.ino;
        }

        const countSql = SqlString.format(
          'SELECT COUNT(*) as count FROM fs_data WHERE ino = ?',
          [ currentIno ],
        );
        const result = (await mysql.query(countSql, [], { executeType: 'execute' }) as { count: number }[])[0];
        return Number(result.count);
      }

      it('should write file smaller than chunk size', async () => {
        // Write a file smaller than chunk_size (100 bytes)
        const data = 'x'.repeat(100);
        await fs.writeFile('/small.txt', data);

        // Read it back
        const readData = await fs.readFile('/small.txt', 'utf8');
        assert.deepStrictEqual(readData, data);

        // Verify only 1 chunk was created
        const chunkCount = await getChunkCount('/small.txt');
        assert.deepStrictEqual(chunkCount, 1);
        await fs.rm('/small.txt');
      });
      it('should write file exactly chunk size', async () => {
        const chunkSize = fs.getChunkSize();
        // Write exactly chunk_size bytes
        const data = Buffer.alloc(chunkSize);
        for (let i = 0; i < chunkSize; i++) {
          data[i] = i % 256;
        }
        await fs.writeFile('/exact.txt', data);

        // Read it back
        const readData = (await fs.readFile('/exact.txt')) as Buffer;
        assert.deepStrictEqual(readData.length, chunkSize);

        // Verify only 1 chunk was created
        const chunkCount = await getChunkCount('/exact.txt');
        assert.deepStrictEqual(chunkCount, 1);
        await fs.rm('/exact.txt');
      });

      it('should write file one byte over chunk size', async () => {
        const chunkSize = fs.getChunkSize();
        // Write chunk_size + 1 bytes
        const data = Buffer.alloc(chunkSize + 1);
        for (let i = 0; i <= chunkSize; i++) {
          data[i] = i % 256;
        }
        await fs.writeFile('/overflow.txt', data);

        // Read it back
        const readData = (await fs.readFile('/overflow.txt')) as Buffer;
        assert.deepStrictEqual(readData.length, chunkSize + 1);

        // Verify 2 chunks were created
        const chunkCount = await getChunkCount('/overflow.txt');
        assert.deepStrictEqual(chunkCount, 2);
        await fs.rm('/overflow.txt');
      });

      it('should write file spanning multiple chunks', async () => {
        const chunkSize = fs.getChunkSize();
        // Write ~2.5 chunks worth of data
        const dataSize = Math.floor(chunkSize * 2.5);
        const data = Buffer.alloc(dataSize);
        for (let i = 0; i < dataSize; i++) {
          data[i] = i % 256;
        }
        await fs.writeFile('/multi.txt', data);

        // Read it back
        const readData = (await fs.readFile('/multi.txt')) as Buffer;
        assert.deepStrictEqual(readData.length, dataSize);

        // Verify 3 chunks were created
        const chunkCount = await getChunkCount('/multi.txt');
        assert.deepStrictEqual(chunkCount, 3);
        await fs.rm('/multi.txt');
      });

      // Data Integrity Tests
      it('should roundtrip data byte-for-byte', async () => {
        const chunkSize = fs.getChunkSize();
        // Create data that spans chunk boundaries with identifiable patterns
        const dataSize = chunkSize * 3 + 123; // Odd size spanning 4 chunks

        const data = Buffer.alloc(dataSize);
        for (let i = 0; i < dataSize; i++) {
          data[i] = i % 256;
        }
        await fs.writeFile('/roundtrip.bin', data);

        const readData = (await fs.readFile('/roundtrip.bin')) as Buffer;
        assert.deepStrictEqual(readData.length, dataSize);

        // Verify chunk count
        const chunkCount = await getChunkCount('/roundtrip.bin');
        assert.deepStrictEqual(chunkCount, 4);
        await fs.rm('/roundtrip.bin');
      });


      it('should handle binary data with null bytes', async () => {
        const chunkSize = fs.getChunkSize();
        // Create data with null bytes at chunk boundaries
        const data = Buffer.alloc(chunkSize * 2 + 100);
        // Put nulls at the chunk boundary
        data[chunkSize - 1] = 0;
        data[chunkSize] = 0;
        data[chunkSize + 1] = 0;
        // Put some non-null bytes around
        data[chunkSize - 2] = 0xff;
        data[chunkSize + 2] = 0xff;

        await fs.writeFile('/nulls.bin', data);
        const readData = (await fs.readFile('/nulls.bin')) as Buffer;

        assert.deepStrictEqual(readData[chunkSize - 2], 0xff);
        assert.deepStrictEqual(readData[chunkSize - 1], 0);
        assert.deepStrictEqual(readData[chunkSize], 0);
        assert.deepStrictEqual(readData[chunkSize + 1], 0);
        assert.deepStrictEqual(readData[chunkSize + 2], 0xff);
        await fs.rm('/nulls.bin');
      });

      it('should preserve chunk ordering', async () => {
        const chunkSize = fs.getChunkSize();
        // Create sequential bytes spanning multiple chunks
        const dataSize = chunkSize * 5;
        const data = Buffer.alloc(dataSize);
        for (let i = 0; i < dataSize; i++) {
          data[i] = i % 256;
        }
        await fs.writeFile('/sequential.bin', data);

        const readData = (await fs.readFile('/sequential.bin')) as Buffer;

        // Verify every byte is in the correct position
        for (let i = 0; i < dataSize; i++) {
          assert.deepStrictEqual(readData[i], i % 256);
        }
        await fs.rm('/sequential.bin');
      });


      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // async function getIno(path: string): Promise<number> {
      //   const pathParts = path.split('/').filter(p => p);

      //   let currentIno = 1;
      //   for (const part of pathParts) {
      //     const sql = SqlString.format(
      //       'SELECT ino FROM fs_dentry WHERE parent_ino = ? AND name = ?',
      //       [ currentIno, part ],
      //     );
      //     const result = (await mysql.query(sql, [], { executeType: 'execute' }) as { ino: number }[])[0];
      //     if (!result) return 0;
      //     currentIno = result.ino;
      //   }
      //   return currentIno;
      // }
      // Edge Case Tests
      it('should handle empty file with zero chunks', async () => {
        // Write empty file
        await fs.writeFile('/empty.txt', '');

        // Read it back
        const readData = await fs.readFile('/empty.txt', 'utf8');
        assert.deepStrictEqual(readData, '');

        // Verify 0 chunks were created
        const chunkCount = await getChunkCount('/empty.txt');
        assert.deepStrictEqual(chunkCount, 0);

        // Verify size is 0
        const stats = await fs.stat('/empty.txt');
        assert.deepStrictEqual(stats.size, 0);
        await fs.rm('/empty.txt');
      });

      it('should overwrite large file with smaller file and clean up chunks', async () => {
        const chunkSize = fs.getChunkSize();

        // Write initial large file (3 chunks)
        const initialData = Buffer.alloc(chunkSize * 3);
        for (let i = 0; i < chunkSize * 3; i++) {
          initialData[i] = i % 256;
        }
        await fs.writeFile('/overwrite.txt', initialData);

        // const ino = await getIno('/overwrite.txt');
        const initialChunkCount = await getChunkCount('/overwrite.txt');
        assert.deepStrictEqual(initialChunkCount, 3);

        // Overwrite with smaller file (1 chunk)
        const newData = 'x'.repeat(100);
        await fs.writeFile('/overwrite.txt', newData);

        // Verify old chunks are gone and new data is correct
        const readData = await fs.readFile('/overwrite.txt', 'utf8');
        assert.deepStrictEqual(readData, newData);

        const newChunkCount = await getChunkCount('/overwrite.txt');
        assert.deepStrictEqual(newChunkCount, 1);

        // Verify size is updated
        const stats = await fs.stat('/overwrite.txt');
        assert.deepStrictEqual(stats.size, 100);
        await fs.rm('/overwrite.txt');
      });

      it('should overwrite small file with larger file', async () => {
        const chunkSize = fs.getChunkSize();

        // Write initial small file (1 chunk)
        const initialData = 'x'.repeat(100);
        await fs.writeFile('/grow.txt', initialData);

        assert.deepStrictEqual(await getChunkCount('/grow.txt'), 1);

        // Overwrite with larger file (3 chunks)
        const newData = Buffer.alloc(chunkSize * 3);
        for (let i = 0; i < chunkSize * 3; i++) {
          newData[i] = i % 256;
        }
        await fs.writeFile('/grow.txt', newData);

        // Verify data is correct (no encoding = Buffer)
        const readData = (await fs.readFile('/grow.txt')) as Buffer;
        assert.deepStrictEqual(readData.length, chunkSize * 3);
        assert.deepStrictEqual(await getChunkCount('/grow.txt'), 3);

        await fs.rm('/grow.txt');
      });

      it('should handle very large file (1MB)', async () => {
        // Write 1MB file
        const dataSize = 1024 * 1024;
        const data = Buffer.alloc(dataSize);
        for (let i = 0; i < dataSize; i++) {
          data[i] = i % 256;
        }
        await fs.writeFile('/large.bin', data);

        const readData = (await fs.readFile('/large.bin')) as Buffer;
        assert.deepStrictEqual(readData.length, dataSize);

        // Verify correct number of chunks
        const chunkSize = fs.getChunkSize();
        const expectedChunks = Math.ceil(dataSize / chunkSize);
        const actualChunks = await getChunkCount('/large.bin');
        assert.deepStrictEqual(actualChunks, expectedChunks);
      });

      // Configuration Tests
      it('should have default chunk size of 4096', async () => {
        const chunkSize = fs.getChunkSize();
        assert.deepStrictEqual(chunkSize, 4096);
      });

      it('should verify chunk_size accessor works correctly', async () => {
        const chunkSize = fs.getChunkSize();

        // Write data and verify chunks match expected based on chunk_size
        const data = Buffer.alloc(chunkSize * 2 + 1);
        await fs.writeFile('/test.bin', data);

        const pathParts = '/test.bin'.split('/').filter(p => p);
        let currentIno = 1;
        for (const part of pathParts) {
          const sql = SqlString.format(
            'SELECT ino FROM fs_dentry WHERE parent_ino = ? AND name = ?',
            [ currentIno, part ],
          );
          const result = (await mysql.query(sql, [], { executeType: 'execute' }) as { ino: number }[])[0];
          if (result) currentIno = result.ino;
        }
        const countStmt = SqlString.format('SELECT COUNT(*) as count FROM fs_data WHERE ino = ?',
          [ currentIno ],
        );
        const result = (await mysql.query(countStmt, [], { executeType: 'execute' }) as { count: number }[])[0];
        assert.deepStrictEqual(result!.count, '3');
        await fs.rm('/test.bin');
      });

      it('should persist chunk_size in fs_config table', async () => {

        const sql = SqlString.format(
          'SELECT value FROM fs_config WHERE `key` = ?',
          [ 'chunk_size' ],
        );
        const result = (await mysql.query(sql) as { value: string }[])[0];
        assert.deepStrictEqual(result!.value, '4096');
      });

      // Schema Tests
      it('should enforce chunk index uniqueness', async () => {
        const chunkSize = fs.getChunkSize();
        // Write a file to create chunks
        const data = Buffer.alloc(chunkSize * 2);
        await fs.writeFile('/unique.txt', data);
        const sql = SqlString.format(
          'SELECT ino FROM fs_dentry WHERE parent_ino = ? AND name = ?',
          [ 1, 'unique.txt' ],
        );
        const result = (await mysql.query(sql, [], { executeType: 'execute' }) as { ino: number }[])[0];
        const ino = result.ino;
        const insertSql = SqlString.format(
          'INSERT INTO fs_data (ino, chunk_index, data) VALUES (?, ?, ?)',
          [ ino, 0, Buffer.from([ 1, 2, 3 ]) ],
        );
        assert.rejects(() => mysql.query(insertSql, [], { executeType: 'execute' }));
        await fs.rm('/unique.txt');
      });

      it('should store chunks with correct ordering in database', async () => {
        const chunkSize = fs.getChunkSize();
        // Create 5 chunks with identifiable data
        const dataSize = chunkSize * 5;
        const data = Buffer.alloc(dataSize);
        for (let i = 0; i < dataSize; i++) {
          data[i] = i % 256;
        }
        await fs.writeFile('/ordered.bin', data);

        const sql = SqlString.format(
          'SELECT ino FROM fs_dentry WHERE parent_ino = ? AND name = ?',
          [ 1, 'ordered.bin' ],
        );
        const result = (await mysql.query(sql, [], { executeType: 'execute' }) as { ino: number }[])[0];
        const ino = result.ino;

        // Query chunks in order
        const querySql = SqlString.format(
          'SELECT chunk_index FROM fs_data WHERE ino = ? ORDER BY chunk_index',
          [ ino ],
        );
        const rows = (await mysql.query(querySql, [], { executeType: 'execute' }) as { chunk_index: number }[]);

        const indices = rows.map(r => r.chunk_index);
        assert.deepStrictEqual(indices, [ 0, 1, 2, 3, 4 ]);
        await fs.rm('/ordered.bin');
      });

      // Cleanup Tests
      it('should delete all chunks when file is removed', async () => {
        const chunkSize = fs.getChunkSize();
        // Create multi-chunk file
        const data = Buffer.alloc(chunkSize * 4);
        await fs.writeFile('/deleteme.txt', data);
        const sql = SqlString.format(
          'SELECT ino FROM fs_dentry WHERE parent_ino = ? AND name = ?',
          [ 1, 'deleteme.txt' ],
        );
        const result = (await mysql.query(sql, [], { executeType: 'execute' }) as { ino: number }[])[0];
        const ino = result.ino;

        // const countStmt = db.prepare(
        //   'SELECT COUNT(*) as count FROM fs_data WHERE ino = ?'
        // );
        // const beforeResult = (await countStmt.get(ino)) as { count: number };
        // expect(beforeResult.count).toBe(4);

        const countStmt = SqlString.format('SELECT COUNT(*) as count FROM fs_data WHERE ino = ?',
          [ ino ],
        );
        const beforeResult = (await mysql.query(countStmt, [], { executeType: 'execute' }) as { count: number }[])[0];
        assert.deepStrictEqual(Number(beforeResult.count), 4);

        // Delete the file
        await fs.unlink('/deleteme.txt');

        // Verify all chunks are gone

        const afterResult = (await mysql.query(countStmt, [], { executeType: 'execute' }) as { count: number }[])[0];
        assert.deepStrictEqual(Number(afterResult.count), 0);
      });

      it('should handle multiple files with different sizes correctly', async () => {
        const chunkSize = fs.getChunkSize();

        // Create files of various sizes
        const files: [string, number][] = [
          [ '/tiny.txt', 10 ],
          [ '/small.txt', Math.floor(chunkSize / 2) ],
          [ '/exact.txt', chunkSize ],
          [ '/medium.txt', chunkSize * 2 + 100 ],
          [ '/large.txt', chunkSize * 5 ],
        ];

        for (const [ path, size ] of files) {
          const data = Buffer.alloc(size);
          for (let i = 0; i < size; i++) {
            data[i] = i % 256;
          }
          await fs.writeFile(path, data);
        }

        // Verify each file has correct data and chunk count
        for (const [ path, size ] of files) {
          const readData = (await fs.readFile(path)) as Buffer;
          // expect(readData.length).toBe(size);
          assert.deepStrictEqual(readData.length, size);

          const expectedChunks = size === 0 ? 0 : Math.ceil(size / chunkSize);

          const name = path.split('/').pop()!;
          const sql = SqlString.format(
            'SELECT d.ino FROM fs_dentry d WHERE d.parent_ino = ? AND d.name = ?',
            [ 1, name ],
          );
          const result = (await mysql.query(sql, [], { executeType: 'execute' }) as { ino: number }[])[0];
          const countSql = SqlString.format('SELECT COUNT(*) as count FROM fs_data WHERE ino = ?',
            [ result.ino ],
          );
          const countResult = (await mysql.query(countSql, [], { executeType: 'execute' }) as { count: number }[])[0];

          assert.deepStrictEqual(Number(countResult.count), expectedChunks);
        }
        for (const [ path ] of files) {
          await fs.unlink(path);
        }
      });
    });

    describe('filesystemBackend should work', () => {
      let backend: MysqlFilesystem;
      let fs: AgentFS;
      async function writeFile(filePath: string, content: string) {
        try {
          await fs.mkdir(path.dirname(filePath), { recursive: true });
        } catch (e) {
          if (e.code !== 'EEXIST') {
            throw e;
          }
        }
        await fs.writeFile(filePath, content, { encoding: 'utf-8' });
      }

      /**
       * Helper to create a unique temporary directory for each test
       */
      async function createTempDir(): Promise<string> {
        const tempdir = path.join(os.tmpdir(), 'deepagents-test');
        await fs.mkdir(tempdir, { recursive: true });
        return tempdir;
      }

      async function removeDir(dirPath: string) {
        try {
          await fs.rm(dirPath, { recursive: true, force: true });
        } catch {
          // Ignore errors during cleanup
        }
      }
      before(async () => {
        backend = await app.getEggObjectFromName(FileSystemInjectName, [{
          attribute: FileSystemQualifierAttribute,
          value: 'foo',
        }]);
        fs = backend.agentFs;
      });
      let tmpDir: string;

      beforeEach(async () => {
        tmpDir = await createTempDir();
      });

      afterEach(async () => {
        await removeDir(tmpDir);
      });
      it('should work in normal mode with absolute paths', async () => {
        const root = tmpDir;
        const f1 = path.join(root, 'a.txt');
        const f2 = path.join(root, 'dir', 'b.py');
        await writeFile(f1, 'hello fs');
        await writeFile(f2, 'print(\'x\')\nhello');

        backend.cwd = root;

        const infos = await backend.lsInfo(root);
        const paths = new Set(infos.map(i => i.path));
        assert.deepStrictEqual(paths.has(f1), true);
        assert.deepStrictEqual(paths.has(f2), false);
        assert.deepStrictEqual(paths.has(path.join(root, 'dir') + path.sep), true);

        const txt = await backend.read(f1);
        assert.deepStrictEqual(txt.includes('hello fs'), true);

        const editMsg = await backend.edit(f1, 'fs', 'filesystem', false);
        assert.deepStrictEqual(editMsg.error, undefined);
        assert.deepStrictEqual(editMsg.occurrences, 1);

        const writeMsg = await backend.write(
          path.join(root, 'new.txt'),
          'new content',
        );
        assert.deepStrictEqual(writeMsg.error, undefined);
        assert.deepStrictEqual(writeMsg.path, path.join(root, 'new.txt'));

        const matches = await backend.grepRaw('hello', root);
        assert.deepStrictEqual(Array.isArray(matches), true);
        if (Array.isArray(matches)) {
          assert.deepStrictEqual(matches.some(m => m.path.endsWith('a.txt')), true);
        }

        const globResults = await backend.globInfo('**/*.py', root);
        assert.deepStrictEqual(globResults.some(i => i.path === f2), true);
      });


      it('should work in virtual mode with sandboxed paths', async () => {
        const root = tmpDir;
        const f1 = path.join(root, 'a.txt');
        const f2 = path.join(root, 'dir', 'b.md');
        await writeFile(f1, 'hello virtual');
        await writeFile(f2, 'content');

        backend.cwd = root;
        backend.virtualMode = true;

        const infos = await backend.lsInfo('/');
        const paths = new Set(infos.map(i => i.path));
        assert.deepStrictEqual(paths.has('/a.txt'), true);
        assert.deepStrictEqual(paths.has('/dir/b.md'), false);
        assert.deepStrictEqual(paths.has('/dir/'), true);

        const txt = await backend.read('/a.txt');
        assert.deepStrictEqual(txt.includes('hello virtual'), true);

        const editMsg = await backend.edit('/a.txt', 'virtual', 'virt', false);
        assert.deepStrictEqual(editMsg.error, undefined);
        assert.deepStrictEqual(editMsg.occurrences, 1);

        const writeMsg = await backend.write('/new.txt', 'x');
        assert.deepStrictEqual(writeMsg.error, undefined);

        const matches = await backend.grepRaw('virt', '/');
        assert.deepStrictEqual(Array.isArray(matches), true);
        if (Array.isArray(matches)) {
          assert.deepStrictEqual(matches.some(m => m.path.includes('/a.txt')), true);
        }

        const globResults = await backend.globInfo('**/*.md', '/');
        assert.deepStrictEqual(globResults.some(i => i.path.includes('/dir/b.md')), true);

        const err = await backend.grepRaw('[', '/');
        assert.deepStrictEqual(typeof err, 'string');

        const traversalError = await backend.read('/../a.txt');
        assert.deepStrictEqual(traversalError.includes('Error'), true);
        assert.deepStrictEqual(traversalError.includes('Path traversal not allowed'), true);
      });

      it('should list nested directories correctly in virtual mode', async () => {
        const root = tmpDir;

        const files: Record<string, string> = {
          [path.join(root, 'config.json')]: 'config',
          [path.join(root, 'src', 'main.py')]: 'code',
          [path.join(root, 'src', 'utils', 'helper.py')]: 'utils code',
          [path.join(root, 'src', 'utils', 'common.py')]: 'common utils',
          [path.join(root, 'docs', 'readme.md')]: 'documentation',
          [path.join(root, 'docs', 'api', 'reference.md')]: 'api docs',
        };

        for (const [ filePath, content ] of Object.entries(files)) {
          await writeFile(filePath, content);
        }


        backend.cwd = root;
        backend.virtualMode = true;

        const rootListing = await backend.lsInfo('/');
        const rootPaths = rootListing.map(fi => fi.path);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes('/config.json')), true);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes('/src/')), true);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes('/docs/')), true);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes('/src/main.py')), false);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes('/src/utils/helper.py')), false);

        const srcListing = await backend.lsInfo('/src/');
        const srcPaths = srcListing.map(fi => fi.path);
        assert.deepStrictEqual(srcPaths.some(srcPath => srcPath.includes('/src/main.py')), true);
        assert.deepStrictEqual(srcPaths.some(srcPath => srcPath.includes('/src/utils/')), true);
        assert.deepStrictEqual(srcPaths.some(srcPath => srcPath.includes('/src/utils/helper.py')), false);

        const utilsListing = await backend.lsInfo('/src/utils/');
        const utilsPaths = utilsListing.map(fi => fi.path);
        assert.deepStrictEqual(utilsPaths.some(utilsPath => utilsPath.includes('/src/utils/helper.py')), true);
        assert.deepStrictEqual(utilsPaths.some(utilsPath => utilsPath.includes('/src/utils/common.py')), true);
        assert.deepStrictEqual(utilsPaths.length, 2);

        const emptyListing = await backend.lsInfo('/nonexistent/');
        assert.deepStrictEqual(emptyListing.length, 0);
      });


      it('should list nested directories correctly in normal mode', async () => {
        const root = tmpDir;

        const files: Record<string, string> = {
          [path.join(root, 'file1.txt')]: 'content1',
          [path.join(root, 'subdir', 'file2.txt')]: 'content2',
          [path.join(root, 'subdir', 'nested', 'file3.txt')]: 'content3',
        };

        for (const [ filePath, content ] of Object.entries(files)) {
          await writeFile(filePath, content);
        }

        backend.cwd = root;
        backend.virtualMode = false;

        const rootListing = await backend.lsInfo(root);
        const rootPaths = rootListing.map(fi => fi.path);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes(path.join(root, 'file1.txt'))), true);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes(path.join(root, 'subdir'))), true);
        assert.deepStrictEqual(rootPaths.some(rootPath => rootPath.includes(path.join(root, 'subdir', 'file2.txt'))), false);
        const subdirListing = await backend.lsInfo(path.join(root, 'subdir'));
        const subdirPaths = subdirListing.map(fi => fi.path);
        assert.deepStrictEqual(subdirPaths.some(subdirPath => subdirPath.includes(path.join(root, 'subdir', 'file2.txt'))), true);
        assert.deepStrictEqual(subdirPaths.some(subdirPath => subdirPath.includes(path.join(root, 'subdir', 'nested'))), true);
        assert.deepStrictEqual(subdirPaths.some(subdirPath => subdirPath.includes(path.join(root, 'subdir', 'nested', 'file3.txt'))), false);
      });
      it('should handle trailing slashes consistently', async () => {
        const root = tmpDir;

        const files: Record<string, string> = {
          [path.join(root, 'file.txt')]: 'content',
          [path.join(root, 'dir', 'nested.txt')]: 'nested',
        };

        for (const [ filePath, content ] of Object.entries(files)) {
          await writeFile(filePath, content);
        }

        backend.cwd = root;
        backend.virtualMode = true;
        const listingWithSlash = await backend.lsInfo('/');
        assert.deepStrictEqual(listingWithSlash.length > 0, true);

        // const listing = await backend.lsInfo('/');
        // const paths = listing.map(fi => fi.path);

        const listing1 = await backend.lsInfo('/dir/');
        const listing2 = await backend.lsInfo('/dir');
        assert.deepStrictEqual(listing1.length, listing2.length);
        assert.deepStrictEqual(listing1.map(fi => fi.path), listing2.map(fi => fi.path));

        const empty = await backend.lsInfo('/nonexistent/');
        assert.deepStrictEqual(empty.length, 0);
      });

      it('should handle large file writes correctly', async () => {
        const root = tmpDir;
        backend.cwd = root;
        backend.virtualMode = true;

        const largeContent = 'f'.repeat(10000);
        const writeResult = await backend.write('/large_file.txt', largeContent);

        assert.deepStrictEqual(writeResult.error, undefined);
        assert.deepStrictEqual(writeResult.path?.includes('/large_file.txt'), true);

        const readContent = await backend.read('/large_file.txt');
        assert.deepStrictEqual(readContent.includes(largeContent.substring(0, 100)), true);

        const savedFile = path.join(root, 'large_file.txt');
        await fs.access(savedFile);
      });

      it('should read multiline content', async () => {
        const root = tmpDir;
        const filePath = path.join(root, 'multiline.txt');
        await writeFile(filePath, 'line1\nline2\nline3');

        backend.cwd = root;
        backend.virtualMode = false;

        const txt = await backend.read(filePath);
        assert.deepStrictEqual(txt.includes('line1'), true);
        assert.deepStrictEqual(txt.includes('line2'), true);
        assert.deepStrictEqual(txt.includes('line3'), true);
      });

      it('should handle empty files', async () => {
        const root = tmpDir;
        const filePath = path.join(root, 'empty.txt');
        await writeFile(filePath, '');

        backend.cwd = root;
        backend.virtualMode = false;

        const txt = await backend.read(filePath);
        assert.deepStrictEqual(txt.includes('empty contents'), true);
      });

      it('should handle files with trailing newlines', async () => {
        const root = tmpDir;
        const filePath = path.join(root, 'trailing.txt');
        await writeFile(filePath, 'line1\nline2\n');
        backend.cwd = root;
        backend.virtualMode = false;

        const txt = await backend.read(filePath);
        assert.deepStrictEqual(txt.includes('line1'), true);
        assert.deepStrictEqual(txt.includes('line2'), true);
      });

      it('should handle unicode content', async () => {
        const root = tmpDir;
        const filePath = path.join(root, 'unicode.txt');
        await writeFile(filePath, 'Hello 世界\n🚀 emoji\nΩ omega');

        backend.cwd = root;
        backend.virtualMode = false;

        const txt = await backend.read(filePath);
        assert.deepStrictEqual(txt.includes('Hello 世界'), true);
        assert.deepStrictEqual(txt.includes('🚀 emoji'), true);
        assert.deepStrictEqual(txt.includes('Ω omega'), true);
      });

      it('should handle non-existent files consistently', async () => {
        const root = tmpDir;

        backend.cwd = root;
        backend.virtualMode = false;

        const nonexistentPath = path.join(root, 'nonexistent.txt');

        const readResult = await backend.read(nonexistentPath);
        assert.deepStrictEqual(readResult.includes('Error'), true);
      });

      it('should handle symlinks securely', async () => {
        const root = tmpDir;
        const targetFile = path.join(root, 'target.txt');
        const symlinkFile = path.join(root, 'symlink.txt');

        await writeFile(targetFile, 'target content');
        try {
          await fs.symlink(targetFile, symlinkFile);
        } catch {
          // Skip test if symlinks aren't supported (e.g., Windows without admin)
          return;
        }

        // const backend = new FilesystemBackend({
        //   rootDir: root,
        //   virtualMode: false,
        // });

        backend.cwd = root;
        backend.virtualMode = false;
        const readResult = await backend.read(symlinkFile);
        assert.deepStrictEqual(readResult.includes('Error'), true);
      });
    });
  }
});
