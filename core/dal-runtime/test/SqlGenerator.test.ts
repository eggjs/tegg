import assert from 'node:assert';
import { Foo } from './fixtures/modules/dal/Foo';
import { SqlGenerator } from '../src/SqlGenerator';
import { TableModel } from '@eggjs/dal-decorator';

describe('test/SqlGenerator.test.ts', () => {
  it('generator should work', () => {
    const generator = new SqlGenerator();
    const fooModel = TableModel.build(Foo);
    const sql = generator.generate(fooModel);
    assert.equal(sql, 'CREATE TABLE IF NOT EXISTS egg_foo (\n' +
      '  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT \'the primary key\',\n' +
      '  name VARCHAR(100) NULL UNIQUE KEY,\n' +
      '  col1 VARCHAR(100) NULL,\n' +
      '  bit_column BIT(10) NULL,\n' +
      '  bool_column BOOL NULL,\n' +
      '  tiny_int_column TINYINT(5) UNSIGNED ZEROFILL NULL,\n' +
      '  small_int_column SMALLINT(5) UNSIGNED ZEROFILL NULL,\n' +
      '  medium_int_column MEDIUMINT(5) UNSIGNED ZEROFILL NULL,\n' +
      '  int_column INT(5) UNSIGNED ZEROFILL NULL,\n' +
      '  big_int_column BIGINT(5) UNSIGNED ZEROFILL NULL,\n' +
      '  decimal_column DECIMAL(10,5) UNSIGNED ZEROFILL NULL,\n' +
      '  float_column FLOAT(10,5) UNSIGNED ZEROFILL NULL,\n' +
      '  double_column DOUBLE(10,5) UNSIGNED ZEROFILL NULL,\n' +
      '  date_column DATE NULL,\n' +
      '  date_time_column DATETIME(3) NULL,\n' +
      '  timestamp_column TIMESTAMP(3) NULL,\n' +
      '  time_column TIME(3) NULL,\n' +
      '  year_column YEAR NULL,\n' +
      '  var_char_column VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,\n' +
      '  binary_column BINARY NULL,\n' +
      '  var_binary_column VARBINARY(100) NULL,\n' +
      '  tiny_blob_column TINYBLOB NULL,\n' +
      '  tiny_text_column TINYTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,\n' +
      '  blob_column BLOB(100) NULL,\n' +
      '  text_column TEXT(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,\n' +
      '  medium_blob_column MEDIUMBLOB NULL,\n' +
      '  long_blob_column LONGBLOB NULL,\n' +
      '  medium_text_column MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,\n' +
      '  long_text_column LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,\n' +
      '  enum_column ENUM(\'A\',\'B\') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,\n' +
      '  set_column SET(\'A\',\'B\') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,\n' +
      '  geometry_column GEOMETRY NULL,\n' +
      '  point_column POINT NULL,\n' +
      '  line_string_column LINESTRING NULL,\n' +
      '  polygon_column POLYGON NULL,\n' +
      '  multipoint_column MULTIPOINT NULL,\n' +
      '  multi_line_string_column MULTILINESTRING NULL,\n' +
      '  multi_polygon_column MULTIPOLYGON NULL,\n' +
      '  geometry_collection_column GEOMETRYCOLLECTION NULL,\n' +
      '  json_column JSON NULL,\n' +
      '  FULLTEXT KEY idx_col1 (col1) COMMENT \'index comment\\n\',\n' +
      '  UNIQUE KEY uk_name_col1 (name,col1) USING BTREE COMMENT \'index comment\\n\'\n' +
      ') DEFAULT CHARACTER SET utf8mb4, DEFAULT COLLATE utf8mb4_unicode_ci, COMMENT=\'foo table\';');
  });
});
