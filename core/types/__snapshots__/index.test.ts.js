exports['test/index.test.ts should export stable 1'] = {
  "AccessLevel": {
    "PRIVATE": "PRIVATE",
    "PUBLIC": "PUBLIC"
  },
  "ColumnFormat": {
    "FIXED": "FIXED",
    "DYNAMIC": "DYNAMIC",
    "DEFAULT": "DEFAULT"
  },
  "ColumnType": {
    "BIT": "BIT",
    "TINYINT": "TINYINT",
    "BOOL": "BOOL",
    "SMALLINT": "SMALLINT",
    "MEDIUMINT": "MEDIUMINT",
    "INT": "INT",
    "BIGINT": "BIGINT",
    "DECIMAL": "DECIMAL",
    "FLOAT": "FLOAT",
    "DOUBLE": "DOUBLE",
    "DATE": "DATE",
    "DATETIME": "DATETIME",
    "TIMESTAMP": "TIMESTAMP",
    "TIME": "TIME",
    "YEAR": "YEAR",
    "CHAR": "CHAR",
    "VARCHAR": "VARCHAR",
    "BINARY": "BINARY",
    "VARBINARY": "VARBINARY",
    "TINYBLOB": "TINYBLOB",
    "TINYTEXT": "TINYTEXT",
    "BLOB": "BLOB",
    "TEXT": "TEXT",
    "MEDIUMBLOB": "MEDIUMBLOB",
    "MEDIUMTEXT": "MEDIUMTEXT",
    "LONGBLOB": "LONGBLOB",
    "LONGTEXT": "LONGTEXT",
    "ENUM": "ENUM",
    "SET": "SET",
    "JSON": "JSON",
    "GEOMETRY": "GEOMETRY",
    "POINT": "POINT",
    "LINESTRING": "LINESTRING",
    "POLYGON": "POLYGON",
    "MULTIPOINT": "MULTIPOINT",
    "MULTILINESTRING": "MULTILINESTRING",
    "MULTIPOLYGON": "MULTIPOLYGON",
    "GEOMETRYCOLLECTION": "GEOMETRYCOLLECTION"
  },
  "CompressionType": {
    "ZLIB": "ZLIB",
    "LZ4": "LZ4",
    "NONE": "NONE"
  },
  "ControllerType": {
    "HTTP": "HTTP",
    "SOFA_RPC": "SOFA_RPC",
    "SOFA_RPC_STREAM": "SOFA_RPC_STREAM",
    "MGW_RPC": "MGW_RPC",
    "MGW_RPC_STREAM": "MGW_RPC_STREAM",
    "MESSAGE": "MESSAGE",
    "SCHEDULE": "SCHEDULE",
    "HEADERS": "HEADERS"
  },
  "DEFAULT_PROTO_IMPL_TYPE": "DEFAULT",
  "DataSourceInjectName": "dataSource",
  "EggLoadUnitType": {
    "MODULE": "MODULE",
    "PLUGIN": "PLUGIN",
    "APP": "APP"
  },
  "EggObjectStatus": {
    "PENDING": "PENDING",
    "READY": "READY",
    "ERROR": "ERROR",
    "DESTROYING": "DESTROYING",
    "DESTROYED": "DESTROYED"
  },
  "EggType": {
    "APP": "APP",
    "CONTEXT": "CONTEXT"
  },
  "ErrorCodes": {
    "EGG_PROTO_NOT_FOUND": "EGG_PROTO_NOT_FOUND",
    "MULTI_PROTO_FOUND": "MULTI_PROTO_FOUND",
    "INCOMPATIBLE_PROTO_INJECT": "INCOMPATIBLE_PROTO_INJECT"
  },
  "HTTPMethodEnum": {
    "GET": "GET",
    "POST": "POST",
    "PUT": "PUT",
    "DELETE": "DELETE",
    "PATCH": "PATCH",
    "OPTIONS": "OPTIONS",
    "HEAD": "HEAD"
  },
  "HTTPParamType": {
    "QUERY": "QUERY",
    "QUERIES": "QUERIES",
    "BODY": "BODY",
    "PARAM": "PARAM",
    "REQUEST": "REQUEST",
    "HEADERS": "HEADERS",
    "COOKIES": "COOKIES"
  },
  "INIT_TYPE_TRY_ORDER": [
    "CONTEXT",
    "SINGLETON",
    "ALWAYS_NEW"
  ],
  "IndexStoreType": {
    "BTREE": "BTREE",
    "HASH": "HASH"
  },
  "IndexType": {
    "PRIMARY": "PRIMARY",
    "UNIQUE": "UNIQUE",
    "INDEX": "INDEX",
    "FULLTEXT": "FULLTEXT",
    "SPATIAL": "SPATIAL"
  },
  "InjectType": {
    "PROPERTY": "PROPERTY",
    "CONSTRUCTOR": "CONSTRUCTOR"
  },
  "InsertMethod": {
    "NO": "NO",
    "FIRST": "FIRST",
    "LAST": "LAST"
  },
  "MODEL_PROTO_IMPL_TYPE": "MODEL_PROTO",
  "MethodType": {
    "HTTP": "HTTP",
    "SOFA_RPC": "SOFA_RPC",
    "SOFA_RPC_STREAM": "SOFA_RPC_STREAM",
    "MGW_RPC": "MGW_RPC",
    "MGW_RPC_STREAM": "MGW_RPC_STREAM",
    "MESSAGE": "MESSAGE",
    "SCHEDULE": "SCHEDULE"
  },
  "MultiInstanceType": {
    "STATIC": "STATIC",
    "DYNAMIC": "DYNAMIC"
  },
  "ObjectInitType": {
    "ALWAYS_NEW": "ALWAYS_NEW",
    "CONTEXT": "CONTEXT",
    "SINGLETON": "SINGLETON"
  },
  "PointcutType": {
    "CLASS": "CLASS",
    "NAME": "NAME",
    "CUSTOM": "CUSTOM"
  },
  "PropagationType": {
    "ALWAYS_NEW": "ALWAYS_NEW",
    "REQUIRED": "REQUIRED"
  },
  "RowFormat": {
    "DEFAULT": "DEFAULT",
    "DYNAMIC": "DYNAMIC",
    "FIXED": "FIXED",
    "COMPRESSED": "COMPRESSED",
    "REDUNDANT": "REDUNDANT",
    "COMPACT": "COMPACT"
  },
  "ScheduleType": {
    "WORKER": "worker",
    "ALL": "all"
  },
  "SqlType": {
    "BLOCK": "BLOCK",
    "INSERT": "INSERT",
    "SELECT": "SELECT",
    "UPDATE": "UPDATE",
    "DELETE": "DELETE"
  },
  "Templates": {
    "BASE_DAO": "base_dao",
    "DAO": "dao",
    "EXTENSION": "extension"
  }
}
