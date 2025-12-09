# @eggjs/tegg-dal-plugin

@eggjs/tegg-dal-plugin 支持使用注解的方式来开发 egg 中的 dal。

## egg 模式

### Install

```shell
# tegg 注解
npm i --save @eggjs/tegg
# tegg 插件
npm i --save @eggjs/tegg-plugin
# tegg dal 插件
npm i --save @eggjs/tegg-dal-plugin
```

### Prepare

```json
// tsconfig.json
{
  "extends": "@eggjs/tsconfig"
}
```

### Config

```js
// config/plugin.js
exports.tegg = {
  package: '@eggjs/tegg-plugin',
  enable: true,
};

exports.teggDal = {
  package: '@eggjs/tegg-dal-plugin',
  enable: true,
};
```

## standalone 模式

### Install

```shell
# tegg 注解
npm i --save @eggjs/tegg
# tegg dal 插件
npm i --save @eggjs/tegg-dal-plugin
```

### Prepare

```json
// tsconfig.json
{
  "extends": "@eggjs/tsconfig"
}
```

## Usage

### module.yml

通过 module.yml 来配置 module 中的 mysql 数据源。

```yaml
dataSource:
  # 数据源名称，可以在 @Table 注解中指定
  # 如果 module 中只有一个 dataSource，@Table 会默认使用这个数据源
  foo:
    connectionLimit: 100
    database: 'test'
    host: '127.0.0.1'
    user: root
    port: 3306
```

#### executeType 配置

可以通过在 `dataSource` 下配置 `executeType` 来指定 SQL 执行模式：

```yaml
dataSource:
  foo:
    connectionLimit: 100
    database: 'test'
    host: '127.0.0.1'
    user: root
    port: 3306
    executeType: execute  # 可选值: execute | query，默认为 query
```

**执行模式说明：**
- `execute`: 使用 SQL 参数化查询，采用服务端序列化参数模式，通过预编译语句执行，某些情况下能提升查询性能
- `query`: 使用文本 SQL 模式，在本地将参数序列化到 SQL 语句中（nodejs 生态中 mysql1 只有这种模式）

**注意事项：**
- 由于 MySQL execute 模式反序列化 float 采用二进制模式，可能会导致精度丢失，建议使用 decimal 类型
- 当使用 `executeType: execute` 时，请确保数据库中的浮点数字段使用 `DECIMAL` 类型而不是 `FLOAT` 或 `DOUBLE` 类型，以避免精度问题

### Table

`TableModel` 定义一个表结构，包括表配置、列、索引。

```ts
import { Table, Index, Column, ColumnType, IndexType } from '@eggjs/tegg/dal';

// 定义了一个表
@Table({
  comment: 'foo table',
})
// 定义了一个唯一索引，列是 name
@Index({
  keys: [ 'name' ],
  type: IndexType.UNIQUE,
})
export class Foo {
  // 定义了主键，类型是 int
  @Column({
    type: ColumnType.INT,
  }, {
    primaryKey: true,
  })
  id: number;

  // 定义了 name 列，类型是 varchar
  @Column({
    type: ColumnType.VARCHAR,
    length: 100,
  })
  name: string;
}
```

详细参数定义如下，具体参数值可以参考 https://dev.mysql.com/doc/refman/8.0/en/create-table.html

建表参数，使用方式为 `@Table(parmas?: TableParams)`

```ts
export interface TableParams {
  // 数据库表名
  name?: string;
  // 数据源名称，如果 module 只有一个 dataSource 则默认使用这个
  dataSourceName?: string;
  comment?: string;
  autoExtendSize?: number;
  autoIncrement?: number;
  avgRowLength?: number;
  characterSet?: string;
  collate?: string;
  compression?: CompressionType;
  encryption?: boolean;
  engine?: string;
  engineAttribute?: string;
  insertMethod?: InsertMethod;
  keyBlockSize?: number;
  maxRows?: number;
  minRows?: number;
  rowFormat?: RowFormat;
  secondaryEngineAttribute?: string;
}
```

建索引参数，使用方式为 `@Index(parmas?: IndexParams)`

```ts
export interface IndexParams {
  // 索引的列
  keys: string[];
  // 索引名称，如果未指定会用 列名拼接
  // 如 [column1, column2 ]
  // 普通索引为 idx_column1_column2
  // 唯一索引为 uk_column1_column2
  name?: string;
  type?: IndexType,
  storeType?: IndexStoreType;
  comment?: string;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;
  parser?: string;
}
```

建列参数，使用方式为 `@Column(type: ColumnTypeParams, parmas?: ColumnParams)`

```ts
export interface ColumnParams {
  // 列名，默认转换规则 userName 至 user_name
  name?: string;
  // 默认值
  default?: string;
  // 是否可控，默认为 false
  canNull?: boolean;
  comment?: string;
  visible?: boolean;
  autoIncrement?: boolean;
  uniqueKey?: boolean;
  primaryKey?: boolean;
  collate?: string;
  columnFormat?: ColumnFormat;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;
}
```

支持的类型

```ts
export enum ColumnType {
  // Numeric
  BIT = 'BIT',
  TINYINT = 'TINYINT',
  BOOL = 'BOOL',
  SMALLINT = 'SMALLINT',
  MEDIUMINT = 'MEDIUMINT',
  INT = 'INT',
  BIGINT = 'BIGINT',
  DECIMAL = 'DECIMAL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  // Date
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIMESTAMP = 'TIMESTAMP',
  TIME = 'TIME',
  YEAR = 'YEAR',
  // String
  CHAR = 'CHAR',
  VARCHAR = 'VARCHAR',
  BINARY = 'BINARY',
  VARBINARY = 'VARBINARY',
  TINYBLOB = 'TINYBLOB',
  TINYTEXT = 'TINYTEXT',
  BLOB = 'BLOB',
  TEXT = 'TEXT',
  MEDIUMBLOB = 'MEDIUMBLOB',
  MEDIUMTEXT = 'MEDIUMTEXT',
  LONGBLOB = 'LONGBLOB',
  LONGTEXT = 'LONGTEXT',
  ENUM = 'ENUM',
  SET = 'SET',
  // JSON
  JSON = 'JSON',
  // Spatial
  GEOMETRY = 'GEOMETRY',
  POINT = 'POINT',
  LINESTRING = 'LINESTRING',
  POLYGON = 'POLYGON',
  MULTIPOINT = 'MULTIPOINT',
  MULTILINESTRING = 'MULTILINESTRING',
  MULTIPOLYGON = 'MULTIPOLYGON',
  GEOMETRYCOLLECTION = 'GEOMETRYCOLLECTION',
}
```

支持的类型参数，详细可参考 https://dev.mysql.com/doc/refman/8.0/en/data-types.html

如果 mysql 类型和 ts 类型对应关系不确定可直接使用 `ColumnTsType` 类型，如

```ts
import { Table, Index, Column, ColumnType, IndexType, ColumnTsType } from '@eggjs/tegg/dal';

// 定义了一个表
@Table({
  comment: 'foo table',
})
// 定义了一个唯一索引，列是 name
@Index({
  keys: [ 'name' ],
  type: IndexType.UNIQUE,
})
export class Foo {
  // 定义了主键，类型是 int
  @Column({
    type: ColumnType.INT,
  }, {
    primaryKey: true,
  })
  id: ColumnTsType['INT'];

  // 定义了 name 列，类型是 varchar
  @Column({
    type: ColumnType.VARCHAR,
    length: 100,
  })
  name: ColumnTsType['VARCHAR'];
}
```

```ts
// Bit 类型，对应 js 中的 Buffer 
export interface BitParams {
  type: ColumnType.BIT,
  // Bit 长度
  length?: number;
}

// Bool 类型，注意在 js 中需要使用 0 或者 1
export interface BoolParams {
  type: ColumnType.BOOL,
}

// TinyInt 类型，对应 js 中的 number
export interface TinyIntParams {
  type: ColumnType.TINYINT;
  length?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// SmallInt 类型，对应 js 中的 number
export interface SmallIntParams {
  type: ColumnType.SMALLINT;
  length?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// MediumInt 类型，对应 js 中的 number
export interface MediumIntParams {
  type: ColumnType.MEDIUMINT;
  length?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// MediumInt 类型，对应 js 中的 number
export interface IntParams {
  type: ColumnType.INT;
  length?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// BigInt 类型，对应 js 中的 string
export interface BigIntParams {
  type: ColumnType.BIGINT;
  length?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// Decimal 类型，对应 js 中的 string
export interface DecimalParams {
  type: ColumnType.DECIMAL;
  length?: number;
  fractionalLength?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// Float 类型，对应 js 中的 number
export interface FloatParams {
  type: ColumnType.FLOAT;
  length?: number;
  fractionalLength?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// Double 类型，对应 js 中的 number
export interface DoubleParams {
  type: ColumnType.DOUBLE;
  length?: number;
  fractionalLength?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

// Date 类型，对应 js 中的 Date
export interface DateParams {
  type: ColumnType.DATE;
}

// DateTime 类型，对应 js 中的 Date
export interface DateTimeParams {
  type: ColumnType.DATETIME;
  precision?: number;
  // 自动添加 ON UPDATE CURRENT_TIMESTAMP
  // 如果有精度则为 ON UPDATE CURRENT_TIMESTAMP(precision)
  autoUpdate?: boolean;
}

// Timestamp 类型，对应 js 中的 Date
export interface TimestampParams {
  type: ColumnType.TIMESTAMP;
  precision?: number;
  // 自动添加 ON UPDATE CURRENT_TIMESTAMP
  // 如果有精度则为 ON UPDATE CURRENT_TIMESTAMP(precision)
  autoUpdate?: boolean;
}

// Times 类型，对应 js 中的 string
export interface TimeParams {
  type: ColumnType.TIME;
  precision?: number;
}

// Year 类型，对应 js 中的 number
export interface YearParams {
  type: ColumnType.YEAR;
}

// Char 类型，对应 js 中的 string
export interface CharParams {
  type: ColumnType.CHAR;
  length?: number;
  characterSet?: string;
  collate?: string;
}

// VarChar 类型，对应 js 中的 string
export interface VarCharParams {
  type: ColumnType.VARCHAR;
  length: number;
  characterSet?: string;
  collate?: string;
}

// Binary 类型，对应 js 中的 Buffer
export interface BinaryParams {
  type: ColumnType.BINARY;
  length?: number;
}

// VarBinary 类型，对应 js 中的 Buffer
export interface VarBinaryParams {
  type: ColumnType.VARBINARY;
  length: number;
}

// TinyBlob 类型，对应 js 中的 Buffer
export interface TinyBlobParams {
  type: ColumnType.TINYBLOB;
}

// TinyText 类型，对应 js 中的 string
export interface TinyTextParams {
  type: ColumnType.TINYTEXT;
  characterSet?: string;
  collate?: string;
}

// Blob 类型，对应 js 中的 Buffer
export interface BlobParams {
  type: ColumnType.BLOB;
  length?: number;
}

// Text 类型，对应 js 中的 string
export interface TextParams {
  type: ColumnType.TEXT;
  length?: number;
  characterSet?: string;
  collate?: string;
}

// MediumBlob 类型，对应 js 中的 Buffer
export interface MediumBlobParams {
  type: ColumnType.MEDIUMBLOB;
}

// LongBlob 类型，对应 js 中的 Buffer
export interface LongBlobParams {
  type: ColumnType.LONGBLOB;
}

// MediumText 类型，对应 js 中的 string
export interface MediumTextParams {
  type: ColumnType.MEDIUMTEXT;
  characterSet?: string;
  collate?: string;
}

// LongText 类型，对应 js 中的 string
export interface LongTextParams {
  type: ColumnType.LONGTEXT;
  characterSet?: string;
  collate?: string;
}

// Enum 类型，对应 js 中的 string
export interface EnumParams {
  type: ColumnType.ENUM;
  enums: string[];
  characterSet?: string;
  collate?: string;
}

// Set 类型，对应 js 中的 string
export interface SetParams {
  type: ColumnType.SET;
  enums: string[];
  characterSet?: string;
  collate?: string;
}

// Json 类型，对应 js 中的 Object
export interface JsonParams {
  type: ColumnType.JSON;
}

// Gemotry 类型，对应 Point, Line, Polygon
export interface GeometryParams {
  type: ColumnType.GEOMETRY;
  SRID?: number;
}

export interface PointParams {
  type: ColumnType.POINT;
  SRID?: number;
}

export interface LinestringParams {
  type: ColumnType.LINESTRING;
  SRID?: number;
}

export interface PolygonParams {
  type: ColumnType.POLYGON;
  SRID?: number;
}

export interface MultiPointParams {
  type: ColumnType.MULTIPOINT;
  SRID?: number;
}

export interface MultiLinestringParams {
  type: ColumnType.MULTILINESTRING;
  SRID?: number;
}

export interface MultiPolygonParams {
  type: ColumnType.MULTIPOLYGON;
  SRID?: number;
}

// GeometryCollection 对应 Array<Point | Line | Ploygon>
export interface GeometryCollectionParams {
  type: ColumnType.GEOMETRYCOLLECTION;
  SRID?: number;
}
```

### 目录结构

运行 `egg-bin dal gen` 即可生成 `dal` 相关目录，包括 dao、extension、structure

```plain
dal
├── dao
│ ├── FooDAO.ts
│ └── base
│     └── BaseFooDAO.ts
├── extension
│ └── FooExtension.ts
└── structure
    ├── Foo.json
    └── Foo.sql
```

- dao: 表访问类，生成的 BaseDAO 请勿修改，其中包含了根据表结构生成的基础访问方法，如 insert/update/delete 以及根据索引信息生成的 find 方法
- extension: 扩展文件，如果需要自定义 sql，需要在 extension 文件中定义
- structure: 建表语句以及表结构

### DAO

注入 DAO 即可实现对表的访问

```ts
import { SingletonProto, Inject } from '@eggjs/tegg';

@SingletonProto()
export class FooRepository {
  @Inject()
  private readonly fooDAO: FooDAO;
  
  async create(foo: Foo) {
    await this.fooDAO.insert(foo);
  }
}
```

#### 自定义 SQL

1. 在 extension 中定义自定义 SQL

```ts
// dal/extension/FooExtension.ts
import { SqlMap, SqlType } from '@eggjs/tegg/dal';

export default {
  findByName: {
    type: SqlType.SELECT,
    sql: 'SELECT {{ allColumns }} FROM egg_foo WHERE name = {{ name | param }}',
  },
} as Record<string, SqlMap>;
```

2. 在 dao 中定义自定义方法

```ts
import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import { BaseFooDAO } from './base/BaseFooDAO';
import { Foo } from '../../Foo';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class FooDAO extends BaseFooDAO {
  async findByName(name: string): Promise<Foo[]> {
    return this.dataSource.execute('findByName', {
      name,
    });
  }
}
```

支持的自定义 filter

```
- param: 参数化查询过滤器，用于防止 SQL 注入
- toPoint
- toLine
- toPolygon
- toGeometry
- toMultiPoint
- toMultiLine
- toMultiPolygon
- toGeometryCollection
```

**param 过滤器**

`param` 过滤器用于将值作为参数化查询参数，而不是直接拼接到 SQL 字符串中。可以有效利用到 sql parameters 的能力，小幅提升 db 性能与观测能力。

使用示例：

```ts
export default {
  findByNameAndAge: {
    type: SqlType.SELECT,
    sql: `
      SELECT {{ allColumns }}
      FROM egg_foo
      WHERE name = {{ name | param }}
        AND age > {{ age | param }}
    `,
  },
} as Record<string, SqlMap>;
```

生成的 SQL：`SELECT ... FROM egg_foo WHERE name = ? AND age > ?`
参数数组：`['John', 18]`

支持自定义 block 来简化 sql, 如内置的 allColumns

```ts
export default {
  findByName: {
    type: SqlType.BLOCK,
    sql: 'id, name',
  },
} as Record<string, SqlMap>;
```

### DataSource

DataSource 仅能在 DAO 中使用，可以将 MySQL 返回的数据反序列化为类。支持的方法有

```ts
export interface DataSource<T> {
  // 将返回的行都转换为 T
  execute(sqlName: string, data?: any): Promise<Array<T>>;
  // 将返回的行都转换为 T, 仅返回第一条
  executeScalar(sqlName: string, data?: any): Promise<T | null>;
  // 直接返回 mysql 数据
  executeRaw(sqlName: string, data?: any): Promise<Array<any>>;
  // 直接返回 mysql 数据, 仅返回第一条
  executeRawScalar(sqlName: string, data?: any): Promise<any | null>;
  // 返回分页数据
  paginate(sqlName: string, data: any, currentPage: number, perPageCount: number): Promise<any>;
  // 返回行数
  count(sqlName: string, data?: any): Promise<number>;
}
```

### 时区问题

注意连接配置中的时区必须和数据库的时区完全一致，否则可能出现时间错误的问题。

```yaml
dataSource:
  foo:
    connectionLimit: 100
    database: 'test'
    host: '127.0.0.1'
    user: root
    port: 3306
    timezone: '+08:00'
```

可以通过以下 SQL 来查看数据库时区

```sql
SELECT @@GLOBAL.time_zone;
```

## Unittest
可以在 `module.yml` 中开启 forkDb 配置，即可实现 unittest 环境自动创建数据库

```yaml
# module.yml
dataSource:
  foo:
    # 开启 ci 环境自动创建数据库
    forkDb: true

```
