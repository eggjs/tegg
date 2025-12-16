import { SqlMap, SqlType } from '@eggjs/dal-decorator';

export default {
  findAll: {
    type: SqlType.SELECT,
    sql: 'SELECT {{ allColumns}} from egg_foo;'
  },
  customFind: {
    type: SqlType.SELECT,
    sql: `
      SELECT
        {{ allColumns}}
      FROM egg_foo
      WHERE
        name = {{ name | param }}
      `,
  },
} as Record<string, SqlMap>;
