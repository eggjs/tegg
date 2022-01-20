import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/aop', app.controller.app.aop);
};
