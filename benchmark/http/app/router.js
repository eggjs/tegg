'use strict';

module.exports = function (app) {
  const { router, controller } = app;
  app.get('/egg1', controller.template.eggController_1.hello);
};
