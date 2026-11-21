import path from 'path';
import { LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { LoadUnitFactory } from '@eggjs/tegg-metadata';
import { EggTestContext } from '../../test-util';
import { HelloService } from './fixtures/modules/dynamic-inject-module/HelloService';
import { CoreTestHelper } from '../../test-util/CoreTestHelper';
import assert from 'assert';
import { TraceLogger } from './fixtures/logger/TraceLogger';

describe('test/Logger.test.ts', () => {


  let modules: Array<LoadUnitInstance>;
  beforeEach(async () => {
    modules = await CoreTestHelper.prepareModules([
      path.join(__dirname, '..'),
      path.join(__dirname, 'fixtures/logger'),
    ]);
  });

  afterEach(async () => {
    for (const module of modules) {
      await LoadUnitFactory.destroyLoadUnit(module.loadUnit);
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(module);
    }
  });

  describe('Pointcut', () => {
    it('should work', async () => {
      const traceLogger = await CoreTestHelper.getObject(TraceLogger);
      traceLogger.info('info %s', );
    });
  });

  // describe('Logger Define', () => {

  // });

  // describe('Logger Manager', () => {

  // });

});
