'use strict';

const Service = require('egg').Service;

class HelloService extends Service {
  sayHi(name) {
    return `hi ${name}`;
  }
}

module.exports = HelloService;
