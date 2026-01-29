import { AccessLevel, ConfigSourceQualifierAttribute, Inject, LifecyclePostInject, LoadUnitNameQualifierAttribute, ModuleConfig, MultiInstanceInfo, MultiInstanceProto, MultiInstancePrototypeGetObjectsContext, ObjectInfo, ObjectInitType } from '@eggjs/tegg';
import {
  BackendProtocol,
  EditResult,
  FileData,
  FileDownloadResponse,
  FileInfo,
  FileUploadResponse,
  GrepMatch,
  WriteResult,
} from 'deepagents';
import micromatch from 'micromatch';
import { FileSystemInjectName, FileSystemQualifierAttribute } from '@eggjs/tegg-langchain-decorator';
import { ModuleConfigUtil } from '@eggjs/tegg/helper';
import { MysqlDataSourceManager } from '@eggjs/tegg/dal';
import { getClientNames, getFileSystemConfig } from '../util';
import assert from 'node:assert';
import { AgentFS } from './agentfs/agentfs';
import path, { basename } from 'node:path';
import { MysqlDataSource } from '@eggjs/dal-runtime';
import fsSync from 'node:fs';
import { Stats } from './agentfs/interface';

const SUPPORTS_NOFOLLOW = fsSync.constants.O_NOFOLLOW !== undefined;

export const EMPTY_CONTENT_WARNING =
  'System reminder: File exists but has empty contents';
export const MAX_LINE_LENGTH = 10000;
export const LINE_NUMBER_WIDTH = 6;
export const TOOL_RESULT_TOKEN_LIMIT = 20000; // Same threshold as eviction
export const TRUNCATION_GUIDANCE =
  '... [results truncated, try being more specific with your parameters]';

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  // 从 module.yml 中动态获取配置来决定需要初始化几个对象
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config: ModuleConfig = ModuleConfigUtil.loadModuleConfigSync(
      ctx.unitPath,
    );
    const moduleName = ModuleConfigUtil.readModuleNameSync(ctx.unitPath);
    return getClientNames(config, 'filesystem').map(name => {
      return {
        name: FileSystemInjectName,
        qualifiers:
          MysqlFilesystem.getFsQualifier(name)[
            FileSystemInjectName
          ],
        properQualifiers: {
          moduleConfig: [{
            attribute: ConfigSourceQualifierAttribute,
            value: moduleName,
          }],
        },
      };
    });
  },
})
export class MysqlFilesystem implements BackendProtocol {
  moduleName: string;
  dataSourceName: string;
  cwd: string;
  virtualMode = false;
  agentFs: AgentFS;
  mysql: MysqlDataSource;

  constructor(
    @Inject() readonly moduleConfig: ModuleConfig,
    @Inject() mysqlDataSourceManager: MysqlDataSourceManager,

    @MultiInstanceInfo([
      FileSystemQualifierAttribute,
      LoadUnitNameQualifierAttribute,
    ])
    objInfo: ObjectInfo,
  ) {
    this.moduleName = objInfo.qualifiers.find(
      t => t.attribute === LoadUnitNameQualifierAttribute,
    )?.value as string;
    assert(this.moduleName, 'not found FsMiddleware name');

    const fsConfig = getFileSystemConfig(moduleConfig, objInfo);

    this.dataSourceName = fsConfig.dataSource;

    this.cwd = fsConfig.cwd || '/';
    this.virtualMode = fsConfig.virtualMode === true;

    const mysql = mysqlDataSourceManager.get(
      this.moduleName,
      this.dataSourceName,
    );
    if (!mysql) {
      throw new Error(
        `not found mysql datasource for module: ${this.moduleName}, dataSource: ${this.dataSourceName}`,
      );
    }
    this.mysql = mysql;
  }

  @LifecyclePostInject()
  async init() {
    this.agentFs = await AgentFS.fromDatabase(this.mysql);
  }


  private resolvePath(key: string): string {
    if (this.virtualMode) {
      const vpath = key.startsWith('/') ? key : '/' + key;
      if (vpath.includes('..') || vpath.startsWith('~')) {
        throw new Error('Path traversal not allowed');
      }
      const full = path.resolve(this.cwd, vpath.substring(1));
      const relative = path.relative(this.cwd, full);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Path: ${full} outside root directory: ${this.cwd}`);
      }
      return full;
    }

    if (path.isAbsolute(key)) {
      return key;
    }
    return path.resolve(this.cwd, key);
  }

  async lsInfo(dirPath: string): Promise<FileInfo[]> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      const stat = await this.agentFs.stat(resolvedPath);

      if (!stat.isDirectory()) {
        return [];
      }

      const entries = await this.agentFs.readdir(resolvedPath);
      const results: FileInfo[] = [];

      const cwdStr = this.cwd.endsWith(path.sep)
        ? this.cwd
        : this.cwd + path.sep;

      for (const entry of entries) {
        const fullPath = path.join(resolvedPath, entry);

        try {
          const entryStat = await this.agentFs.stat(fullPath);
          const isFile = entryStat.isFile();
          const isDir = entryStat.isDirectory();

          if (!this.virtualMode) {
            // Non-virtual mode: use absolute paths
            if (isFile) {
              results.push({
                path: fullPath,
                is_dir: false,
                size: entryStat.size,
                modified_at: new Date(entryStat.mtime).toString(),
              });
            } else if (isDir) {
              results.push({
                path: fullPath + path.sep,
                is_dir: true,
                size: 0,
                modified_at: new Date(entryStat.mtime).toString(),
              });
            }
          } else {
            let relativePath: string;
            if (fullPath.startsWith(cwdStr)) {
              relativePath = fullPath.substring(cwdStr.length);
            } else if (fullPath.startsWith(this.cwd)) {
              relativePath = fullPath
                .substring(this.cwd.length)
                .replace(/^[/\\]/, '');
            } else {
              relativePath = fullPath;
            }

            relativePath = relativePath.split(path.sep).join('/');
            const virtPath = '/' + relativePath;

            if (isFile) {
              results.push({
                path: virtPath,
                is_dir: false,
                size: entryStat.size,
                modified_at: new Date(entryStat.mtime).toString(),
              });
            } else if (isDir) {
              results.push({
                path: virtPath + '/',
                is_dir: true,
                size: 0,
                modified_at: new Date(entryStat.mtime).toString(),
              });
            }
          }
        } catch {
          continue;
        }
      }

      results.sort((a, b) => a.path.localeCompare(b.path));
      return results;
    } catch {
      return [];
    }
  }
  async read(
    filePath: string,
    offset = 0,
    limit = 500,
  ): Promise<string> {
    try {
      const resolvedPath = this.resolvePath(filePath);

      let content: string;

      if (SUPPORTS_NOFOLLOW) {
        const stat = await this.agentFs.stat(resolvedPath);
        if (!stat.isFile()) {
          return `Error: File '${filePath}' not found`;
        }
        // const fd = await this.agentFs.open(
        //   resolvedPath,
        // );
        // try {
        //   content = await fd.readFile({ encoding: 'utf-8' });
        // } finally {
        //   await fd.close();
        // }
        content = await this.agentFs.readFile(resolvedPath, 'utf-8');
      } else {
        const stat = await this.agentFs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return `Error: Symlinks are not allowed: ${filePath}`;
        }
        if (!stat.isFile()) {
          return `Error: File '${filePath}' not found`;
        }
        content = await this.agentFs.readFile(resolvedPath, 'utf-8');
      }

      const emptyMsg = this.checkEmptyContent(content);
      if (emptyMsg) {
        return emptyMsg;
      }

      const lines = content.split('\n');
      const startIdx = offset;
      const endIdx = Math.min(startIdx + limit, lines.length);

      if (startIdx >= lines.length) {
        return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
      }

      const selectedLines = lines.slice(startIdx, endIdx);
      return this.formatContentWithLineNumbers(selectedLines, startIdx + 1);
    } catch (e: any) {
      return `Error reading file '${filePath}': ${e.message}`;
    }
  }

  checkEmptyContent(content: string): string | null {
    if (!content || content.trim() === '') {
      return EMPTY_CONTENT_WARNING;
    }
    return null;
  }

  formatContentWithLineNumbers(
    content: string | string[],
    startLine = 1,
  ): string {
    let lines: string[];
    if (typeof content === 'string') {
      lines = content.split('\n');
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines = lines.slice(0, -1);
      }
    } else {
      lines = content;
    }

    const resultLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + startLine;

      if (line.length <= MAX_LINE_LENGTH) {
        resultLines.push(
          `${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${line}`,
        );
      } else {
        // Split long line into chunks with continuation markers
        const numChunks = Math.ceil(line.length / MAX_LINE_LENGTH);
        for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
          const start = chunkIdx * MAX_LINE_LENGTH;
          const end = Math.min(start + MAX_LINE_LENGTH, line.length);
          const chunk = line.substring(start, end);
          if (chunkIdx === 0) {
            // First chunk: use normal line number
            resultLines.push(
              `${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${chunk}`,
            );
          } else {
            // Continuation chunks: use decimal notation (e.g., 5.1, 5.2)
            const continuationMarker = `${lineNum}.${chunkIdx}`;
            resultLines.push(
              `${continuationMarker.padStart(LINE_NUMBER_WIDTH)}\t${chunk}`,
            );
          }
        }
      }
    }

    return resultLines.join('\n');
  }
  async readRaw(filePath: string): Promise<FileData> {
    const resolvedPath = this.resolvePath(filePath);

    let content: string;
    let stat: Stats;

    if (SUPPORTS_NOFOLLOW) {
      stat = await this.agentFs.stat(resolvedPath);
      if (!stat.isFile()) throw new Error(`File '${filePath}' not found`);
      content = await this.agentFs.readFile(resolvedPath, 'utf-8');
    } else {
      stat = await this.agentFs.lstat(resolvedPath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Symlinks are not allowed: ${filePath}`);
      }
      if (!stat.isFile()) throw new Error(`File '${filePath}' not found`);
      content = await this.agentFs.readFile(resolvedPath, 'utf-8');
    }

    return {
      content: content.split('\n'),
      created_at: new Date(stat.ctime).toString(),
      modified_at: new Date(stat.mtime).toString(),
    };
  }
  async grepRaw(
    pattern: string,
    path?: string | null,
    glob?: string | null,
  ): Promise<GrepMatch[] | string> {
    const files = await this.agentFs.readallFiles(this.cwd);
    return this.grepMatchesFromFiles(files, pattern, path, glob);
  }
  grepMatchesFromFiles(
    files: Record<string, FileData>,
    pattern: string,
    path: string | null = null,
    glob: string | null = null,
  ): GrepMatch[] | string {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch (e: any) {
      return `Invalid regex pattern: ${e.message}`;
    }

    let normalizedPath: string;
    try {
      normalizedPath = this.validatePath(path);
    } catch {
      return [];
    }

    let filtered = Object.fromEntries(
      Object.entries(files).filter(([ fp ]) => fp.startsWith(normalizedPath)),
    );

    if (glob) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([ fp ]) =>
          micromatch.isMatch(basename(fp), glob, { dot: true, nobrace: false }),
        ),
      );
    }

    const matches: GrepMatch[] = [];
    for (const [ filePath, fileData ] of Object.entries(filtered)) {
      for (let i = 0; i < fileData.content.length; i++) {
        const line = fileData.content[i];
        const lineNum = i + 1;
        if (regex.test(line)) {
          matches.push({ path: filePath, line: lineNum, text: line });
        }
      }
    }

    return matches;
  }
  validatePath(path: string | null | undefined): string {
    const pathStr = path || '/';
    if (!pathStr || pathStr.trim() === '') {
      throw new Error('Path cannot be empty');
    }

    let normalized = pathStr.startsWith('/') ? pathStr : '/' + pathStr;

    if (!normalized.endsWith('/')) {
      normalized += '/';
    }

    return normalized;
  }
  async globInfo(pattern: string, path?: string): Promise<FileInfo[]> {
    const files = await this.agentFs.readallFiles(this.cwd);
    const result = this.globSearchFiles(files, pattern, path);

    if (result === 'No files found') {
      return [];
    }

    const paths = result.split('\n');
    const infos: FileInfo[] = [];
    for (const p of paths) {
      const fd = files[p];
      const size = fd ? fd.content.join('\n').length : 0;
      infos.push({
        path: p,
        is_dir: false,
        size,
        modified_at: fd?.modified_at || '',
      });
    }
    return infos;
  }
  globSearchFiles(
    files: Record<string, FileData>,
    pattern: string,
    path = '/',
  ): string {
    let normalizedPath: string;
    try {
      normalizedPath = this.validatePath(path);
    } catch {
      return 'No files found';
    }

    const filtered = Object.fromEntries(
      Object.entries(files).filter(([ fp ]) => fp.startsWith(normalizedPath)),
    );

    // Respect standard glob semantics:
    // - Patterns without path separators (e.g., '*.py') match only in the current
    //   directory (non-recursive) relative to `path`.
    // - Use '**' explicitly for recursive matching.
    const effectivePattern = pattern;

    const matches: Array<[string, string]> = [];
    for (const [ filePath, fileData ] of Object.entries(filtered)) {
      let relative = filePath.substring(normalizedPath.length);
      if (relative.startsWith('/')) {
        relative = relative.substring(1);
      }
      if (!relative) {
        const parts = filePath.split('/');
        relative = parts[parts.length - 1] || '';
      }

      if (
        micromatch.isMatch(relative, effectivePattern, {
          dot: true,
          nobrace: false,
        })
      ) {
        matches.push([ filePath, fileData.modified_at ]);
      }
    }

    matches.sort((a, b) => b[1].localeCompare(a[1])); // Sort by modified_at descending

    if (matches.length === 0) {
      return 'No files found';
    }

    return matches.map(([ fp ]) => fp).join('\n');
  }
  async write(filePath: string, content: string): Promise<WriteResult> {
    try {
      const resolvedPath = this.resolvePath(filePath);

      try {
        const stat = await this.agentFs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return {
            error: `Cannot write to ${filePath} because it is a symlink. Symlinks are not allowed.`,
          };
        }
        return {
          error: `Cannot write to ${filePath} because it already exists. Read and then make an edit, or write to a new path.`,
        };
      } catch {
        // File doesn't exist, good to proceed
      }

      try {
        await this.agentFs.mkdir(path.dirname(resolvedPath), { recursive: true });
      } catch (e) {
        if (e.code !== 'EEXIST') {
          throw e;
        }
      }

      // if (SUPPORTS_NOFOLLOW) {
      //   const flags =
      //     fsSync.constants.O_WRONLY |
      //     fsSync.constants.O_CREAT |
      //     fsSync.constants.O_TRUNC |
      //     fsSync.constants.O_NOFOLLOW;

      //   const fd = await fs.open(resolvedPath, flags, 0o644);
      //   try {
      //     await fd.writeFile(content, 'utf-8');
      //   } finally {
      //     await fd.close();
      //   }
      // } else {
      //   await fs.writeFile(resolvedPath, content, 'utf-8');
      // }
      await this.agentFs.writeFile(resolvedPath, content, 'utf-8');

      return { path: filePath, filesUpdate: null };
    } catch (e: any) {
      return { error: `Error writing file '${filePath}': ${e.message}` };
    }
  }
  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll = false,
  ): Promise<EditResult> {
    try {
      const resolvedPath = this.resolvePath(filePath);

      let content: string;

      if (SUPPORTS_NOFOLLOW) {
        const stat = await this.agentFs.stat(resolvedPath);
        if (!stat.isFile()) {
          return { error: `Error: File '${filePath}' not found` };
        }

        // const fd = await fs.open(
        //   resolvedPath,
        //   fsSync.constants.O_RDONLY | fsSync.constants.O_NOFOLLOW,
        // );
        // try {
        //   content = await fd.readFile({ encoding: 'utf-8' });
        // } finally {
        //   await fd.close();
        // }
        content = await this.agentFs.readFile(resolvedPath, 'utf-8');
      } else {
        const stat = await this.agentFs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return { error: `Error: Symlinks are not allowed: ${filePath}` };
        }
        if (!stat.isFile()) {
          return { error: `Error: File '${filePath}' not found` };
        }
        content = await this.agentFs.readFile(resolvedPath, 'utf-8');
      }

      const result = this.performStringReplacement(
        content,
        oldString,
        newString,
        replaceAll,
      );

      if (typeof result === 'string') {
        return { error: result };
      }

      const [ newContent, occurrences ] = result;

      // // Write securely
      // if (SUPPORTS_NOFOLLOW) {
      //   const flags =
      //     fsSync.constants.O_WRONLY |
      //     fsSync.constants.O_TRUNC |
      //     fsSync.constants.O_NOFOLLOW;

      //   const fd = await fs.open(resolvedPath, flags);
      //   try {
      //     await fd.writeFile(newContent, 'utf-8');
      //   } finally {
      //     await fd.close();
      //   }
      // } else {
      //   await fs.writeFile(resolvedPath, newContent, 'utf-8');
      // }
      await this.agentFs.writeFile(resolvedPath, newContent, 'utf-8');

      return { path: filePath, filesUpdate: null, occurrences };
    } catch (e: any) {
      return { error: `Error editing file '${filePath}': ${e.message}` };
    }
  }

  performStringReplacement(
    content: string,
    oldString: string,
    newString: string,
    replaceAll: boolean,
  ): [string, number] | string {
    // Use split to count occurrences (simpler than regex)
    const occurrences = content.split(oldString).length - 1;

    if (occurrences === 0) {
      return `Error: String not found in file: '${oldString}'`;
    }

    if (occurrences > 1 && !replaceAll) {
      return `Error: String '${oldString}' appears ${occurrences} times in file. Use replace_all=True to replace all instances, or provide a more specific string with surrounding context.`;
    }

    // Python's str.replace() replaces ALL occurrences
    // Use split/join for consistent behavior
    const newContent = content.split(oldString).join(newString);

    return [ newContent, occurrences ];
  }
  async uploadFiles(
    files: Array<[string, Buffer]>,
  ): Promise<FileUploadResponse[]> {
    const responses: FileUploadResponse[] = [];

    for (const [ filePath, content ] of files) {
      try {
        const resolvedPath = this.resolvePath(filePath);

        // Ensure parent directory exists
        await this.agentFs.mkdir(path.dirname(resolvedPath), { recursive: true });

        // Write file
        await this.agentFs.writeFile(resolvedPath, content);
        responses.push({ path: filePath, error: null });
      } catch (e: any) {
        if (e.code === 'ENOENT') {
          responses.push({ path: filePath, error: 'file_not_found' });
        } else if (e.code === 'EACCES') {
          responses.push({ path: filePath, error: 'permission_denied' });
        } else if (e.code === 'EISDIR') {
          responses.push({ path: filePath, error: 'is_directory' });
        } else {
          responses.push({ path: filePath, error: 'invalid_path' });
        }
      }
    }

    return responses;
  }
  async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
    const responses: FileDownloadResponse[] = [];

    for (const filePath of paths) {
      try {
        const resolvedPath = this.resolvePath(filePath);
        const content = await this.agentFs.readFile(resolvedPath);
        responses.push({ path: filePath, content, error: null });
      } catch (e: any) {
        if (e.code === 'ENOENT') {
          responses.push({
            path: filePath,
            content: null,
            error: 'file_not_found',
          });
        } else if (e.code === 'EACCES') {
          responses.push({
            path: filePath,
            content: null,
            error: 'permission_denied',
          });
        } else if (e.code === 'EISDIR') {
          responses.push({
            path: filePath,
            content: null,
            error: 'is_directory',
          });
        } else {
          responses.push({
            path: filePath,
            content: null,
            error: 'invalid_path',
          });
        }
      }
    }

    return responses;
  }

  static getFsQualifier(clientName: string) {
    return {
      [FileSystemInjectName]: [
        {
          attribute: FileSystemQualifierAttribute,
          value: clientName,
        },
      ],
    };
  }
}
