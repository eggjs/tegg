import { MysqlDataSourceManager } from '../lib/MysqlDataSourceManager';

export default {
  get mysqlDataSourceManager() {
    return MysqlDataSourceManager.instance;
  },
};
