/* eslint-disable no-bitwise */
import SqlString from 'sqlstring';
import { createFsError, type FsSyscall } from './errors';
import { S_IFDIR, S_IFLNK, S_IFMT } from './interface';
import { MysqlDataSource } from '@eggjs/dal-runtime';

async function getInodeMode(
  db: MysqlDataSource,
  ino: number,
): Promise<number | null> {
  const sql = SqlString.format(
    'SELECT mode FROM fs_inode WHERE ino = ?',
    [ ino ],
  );
  const result = await db.query(sql);
  if (!result || result.length === 0) {
    return null;
  }
  return (result[0] as { mode: number }).mode;
}

function isDirMode(mode: number): boolean {
  return (mode & S_IFMT) === S_IFDIR;
}

export async function getInodeModeOrThrow(
  db: MysqlDataSource,
  ino: number,
  syscall: FsSyscall,
  path: string,
): Promise<number> {
  const mode = await getInodeMode(db, ino);
  if (mode === null) {
    throw createFsError({
      code: 'ENOENT',
      syscall,
      path,
      message: 'no such file or directory',
    });
  }
  return mode;
}

export function assertNotRoot(path: string, syscall: FsSyscall): void {
  if (path === '/') {
    throw createFsError({
      code: 'EPERM',
      syscall,
      path,
      message: 'operation not permitted on root directory',
    });
  }
}

export function normalizeRmOptions(options?: {
  force?: boolean;
  recursive?: boolean;
}): {
    force: boolean;
    recursive: boolean;
  } {
  return {
    force: options?.force === true,
    recursive: options?.recursive === true,
  };
}

export function throwENOENTUnlessForce(
  path: string,
  syscall: FsSyscall,
  force: boolean,
): void {
  if (force) return;
  throw createFsError({
    code: 'ENOENT',
    syscall,
    path,
    message: 'no such file or directory',
  });
}

export function assertNotSymlinkMode(
  mode: number,
  syscall: FsSyscall,
  path: string,
): void {
  if ((mode & S_IFMT) === S_IFLNK) {
    throw createFsError({
      code: 'ENOSYS',
      syscall,
      path,
      message: 'symbolic links not supported yet',
    });
  }
}

async function assertExistingNonDirNonSymlinkInode(
  db: MysqlDataSource,
  ino: number,
  syscall: FsSyscall,
  fullPathForError: string,
): Promise<void> {
  const mode = await getInodeMode(db, ino);
  if (mode === null) {
    throw createFsError({
      code: 'ENOENT',
      syscall,
      path: fullPathForError,
      message: 'no such file or directory',
    });
  }
  if (isDirMode(mode)) {
    throw createFsError({
      code: 'EISDIR',
      syscall,
      path: fullPathForError,
      message: 'illegal operation on a directory',
    });
  }
  assertNotSymlinkMode(mode, syscall, fullPathForError);
}

export async function assertInodeIsDirectory(
  db: MysqlDataSource,
  ino: number,
  syscall: FsSyscall,
  fullPathForError: string,
): Promise<void> {
  const mode = await getInodeMode(db, ino);
  if (mode === null) {
    throw createFsError({
      code: 'ENOENT',
      syscall,
      path: fullPathForError,
      message: 'no such file or directory',
    });
  }
  if (!isDirMode(mode)) {
    throw createFsError({
      code: 'ENOTDIR',
      syscall,
      path: fullPathForError,
      message: 'not a directory',
    });
  }
}

export async function assertWritableExistingInode(
  db: MysqlDataSource,
  ino: number,
  syscall: FsSyscall,
  fullPathForError: string,
): Promise<void> {
  await assertExistingNonDirNonSymlinkInode(db, ino, syscall, fullPathForError);
}

export async function assertReadableExistingInode(
  db: MysqlDataSource,
  ino: number,
  syscall: FsSyscall,
  fullPathForError: string,
): Promise<void> {
  await assertExistingNonDirNonSymlinkInode(db, ino, syscall, fullPathForError);
}

export async function assertReaddirTargetInode(
  db: MysqlDataSource,
  ino: number,
  fullPathForError: string,
): Promise<void> {
  const syscall = 'scandir';
  const mode = await getInodeMode(db, ino);
  if (mode === null) {
    throw createFsError({
      code: 'ENOENT',
      syscall,
      path: fullPathForError,
      message: 'no such file or directory',
    });
  }
  assertNotSymlinkMode(mode, syscall, fullPathForError);
  if (!isDirMode(mode)) {
    throw createFsError({
      code: 'ENOTDIR',
      syscall,
      path: fullPathForError,
      message: 'not a directory',
    });
  }
}

export async function assertUnlinkTargetInode(
  db: MysqlDataSource,
  ino: number,
  fullPathForError: string,
): Promise<void> {
  const syscall = 'unlink';
  const mode = await getInodeMode(db, ino);
  if (mode === null) {
    throw createFsError({
      code: 'ENOENT',
      syscall,
      path: fullPathForError,
      message: 'no such file or directory',
    });
  }
  if (isDirMode(mode)) {
    throw createFsError({
      code: 'EISDIR',
      syscall,
      path: fullPathForError,
      message: 'illegal operation on a directory',
    });
  }
  assertNotSymlinkMode(mode, syscall, fullPathForError);
}
