import { MysqlDataSourceManager } from '../lib/MysqlDataSourceManager';

export default {
  mysqlDataSourceManager() {
    return MysqlDataSourceManager.instance;
  },
};
