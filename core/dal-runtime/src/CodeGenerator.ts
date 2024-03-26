import nunjucks, { type Environment } from 'nunjucks';
import path from 'node:path';
import _ from 'lodash';
import { TemplateUtil } from './TemplateUtil';
import { ColumnModel, TableModel } from '@eggjs/dal-decorator';
import { PrototypeUtil } from '@eggjs/core-decorator';
import fs from 'node:fs/promises';
import { js_beautify } from 'js-beautify';
import { SqlGenerator } from './SqlGenerator';

export interface CodeGeneratorOptions {
  moduleDir: string;
  moduleName: string;
  teggPkg?: string;
  dalPkg?: string;
}

export enum Templates {
  BASE_DAO = 'base_dao',
  DAO = 'dao',
  EXTENSION = 'extension',
}

export class CodeGenerator {
  private readonly moduleDir: string;
  private readonly moduleName: string;
  private readonly teggPkg: string;
  private readonly dalPkg: string;

  constructor(options: CodeGeneratorOptions) {
    this.moduleDir = options.moduleDir;
    this.moduleName = options.moduleName;
    this.teggPkg = options.teggPkg ?? '@eggjs/tegg';
    this.dalPkg = options.dalPkg ?? '@eggjs/tegg/dal';
    this.createNunjucksEnv();
  }

  private njkEnv: Environment;

  createNunjucksEnv() {
    this.njkEnv = nunjucks.configure(path.join(__dirname, './templates'), {
      autoescape: false,
    });
    this.njkEnv.addFilter('pascalCase', name => _.upperFirst(_.camelCase(name)));
    this.njkEnv.addFilter('camelCase', name => _.camelCase(name));
    this.njkEnv.addFilter('dbTypeToTSType', TemplateUtil.dbTypeToTsType);
  }

  genCode(tplName: Templates, filePath: string, tableModel: TableModel) {
    let tableModelAbsolutePath = PrototypeUtil.getFilePath(tableModel.clazz)!;
    tableModelAbsolutePath = tableModelAbsolutePath.substring(0, tableModelAbsolutePath.length - 3);
    const data = {
      table: tableModel,
      file: filePath,
      fileName: path.basename(filePath),
      clazzName: tableModel.clazz.name,
      moduleName: this.moduleName,
      teggPkg: this.teggPkg,
      dalPkg: this.dalPkg,
      id: tableModel.columns.find(t => t.propertyName === 'id'),
      primaryIndex: tableModel.getPrimary(),
      tableModelPath: TemplateUtil.importPath(tableModelAbsolutePath, path.dirname(filePath)),
      columnMap: tableModel.columns.reduce<Record<string, ColumnModel>>((p, c) => {
        p[c.propertyName] = c;
        return p;
      }, {}),
    };
    return this.njkEnv.render(`${tplName}.njk`, data);
  }

  async generate(tableModel: TableModel) {
    const dalDir = path.join(this.moduleDir, 'dal');

    // const tableName = tableModel.name;
    // const clazzName = tableModel.clazz.name;
    const clazzFileName = path.basename(PrototypeUtil.getFilePath(tableModel.clazz)!);
    const baseFileName = path.basename(clazzFileName, '.ts');

    // 要动的一些文件
    const paths = {
      // e.g. app/dal/dao/base/example.ts
      baseBizDAO: path.join(dalDir, `dao/base/Base${baseFileName}DAO.ts`),
      // e.g. app/dal/dao/example.ts
      bizDAO: path.join(dalDir, `dao/${baseFileName}DAO.ts`),
      // e.g. app/dal/extension/example.ts
      extension: path.join(dalDir, `extension/${baseFileName}Extension.ts`),
      // e.g. app/dal/structure/example.json
      structure: path.join(dalDir, `structure/${baseFileName}.json`),
      // e.g. app/dal/structure/example.sql
      structureSql: path.join(dalDir, `structure/${baseFileName}.sql`),
    };

    // 建立 structure 文件
    await fs.mkdir(path.dirname(paths.structure), {
      recursive: true,
    });
    await fs.writeFile(paths.structure, JSON.stringify(tableModel, null, 2), 'utf8');

    const sqlGenerator = new SqlGenerator();
    const structureSql = sqlGenerator.generate(tableModel);
    await fs.writeFile(paths.structureSql, structureSql, 'utf8');


    const codes = [{
      templates: Templates.BASE_DAO,
      filePath: paths.baseBizDAO,
      beautify: true,
    }, {
      templates: Templates.DAO,
      filePath: paths.bizDAO,
      beautify: true,
    }, {
      templates: Templates.EXTENSION,
      filePath: paths.extension,
      beautify: false,
    }];
    for (const { templates, filePath, beautify } of codes) {
      await fs.mkdir(path.dirname(filePath), {
        recursive: true,
      });
      const code = this.genCode(templates, filePath, tableModel);
      let beautified: string;
      if (beautify) {
        beautified = js_beautify(code, {
          brace_style: 'preserve-inline',
          indent_size: 2,
          jslint_happy: true,
          preserve_newlines: false,
        });
      } else {
        beautified = code;
      }
      beautified = beautified
        .replace(/( )*\/\/ empty-line( )*/g, '')
        .replace(/Promise( )*<( )*(.+?)( )*>/g, 'Promise<$3>')
        .replace(/Optional( )*<( )*(.+?)( )*>/g, 'Optional<$3>')
        .replace(/Record( )*<( )*(.+?)( )*>/g, 'Record<$3>')
        .replace(/Partial( )*<( )*(.+?)( )*>/g, 'Partial<$3>')
        .replace(/DataSource( )*<( )*(.+?)( )*>/g, 'DataSource<$3>')
        .replace(/ \? :/g, '?:');
      await fs.writeFile(filePath, beautified, 'utf8');
    }
  }
}
