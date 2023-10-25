import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/aop', app.controller.app.aop);
  app.router.get('/singletonAop', app.controller.app.contextAdviceWithSingleton);
};
