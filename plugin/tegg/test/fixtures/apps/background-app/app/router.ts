import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/background', app.controller.app.background);
  app.router.get('/backgroudTimeout', app.controller.app.backgroudTimeout);
};
