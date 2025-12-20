import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/dynamicInject', app.controller.app.dynamicInject);
  app.router.get('/singletonDynamicInject', app.controller.app.singletonDynamicInject);
  app.router.get('/factoryQualifier', app.controller.app.factoryQualifier);
};
