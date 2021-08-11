'use strict';

const mysql = require('mysql');
const config = {
  host: '127.0.0.1',
  port: 3306,
  password: '',
  user: 'root',
  database: 'test',
};

const connection = mysql.createConnection(config);
connection.connect();

async function query(sql) {
  return new Promise((resolve, reject) => {
    console.log('prepare database: ', sql);
    connection.query(sql, (err, res) => {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    });
  });
}

async function init() {
  await query('DROP DATABASE test;');
  await query('CREATE DATABASE test;');
  await query('use test;');
  await query('CREATE TABLE `apps` (\n' +
    '  `id` bigint unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `name` varchar(100) NOT NULL,\n' +
    '  `desc` varchar(100) NOT NULL,\n' +
    '  PRIMARY KEY (`id`)\n' +
    ');');
}

init()
  .then(() => {
    console.log('prepare database done');
    process.exit(0);
  })
  .catch(e => {
    console.log(e);
    process.exit(1);
  });

