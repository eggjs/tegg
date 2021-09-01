import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/dynamicInject', app.controller.app.dynamicInject);
};
