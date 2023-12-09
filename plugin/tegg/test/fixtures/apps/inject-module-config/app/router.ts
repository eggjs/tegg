import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/config', app.controller.app.baseDir);
  app.router.get('/overwrite_config', app.controller.app.overwriteConfig);
};
