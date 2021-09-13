import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/invokeFoo', app.controller.app.invokeFoo);
};
