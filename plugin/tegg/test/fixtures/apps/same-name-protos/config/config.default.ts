import path from 'node:path';
import { EggAppInfo } from 'egg';
export default function(appInfo: EggAppInfo) {
  const config = {
    keys: 'test key',
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log'),
      },
    },
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
  };
  return config;
}
