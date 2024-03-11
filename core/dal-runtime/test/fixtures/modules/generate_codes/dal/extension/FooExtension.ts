import { SqlMap } from '@eggjs/tegg/dal';

/**
 * Define Custom SQLs
 *
 * import { SqlMap, SqlType } from '@eggjs/tegg/dal';
 *
 * export default {
 *   findByName: {
 *     type: SqlType.SELECT,
 *     sql: 'SELECT  from foo where name = '
 *   },
 * }
 */
export default {

} as Record<string, SqlMap>;
