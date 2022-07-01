import assert from 'assert';

import CacheService from './fixtures/decators/CacheService';
import ContextCache from './fixtures/decators/ContextCache';
import SingletonCache from './fixtures/decators/SingletonCache';

import {
  PrototypeUtil,
  AccessLevel,
  ObjectInitType,
  EggPrototypeInfo,
  InjectObjectInfo,
  QualifierUtil,
  LoadUnitNameQualifierAttribute,
  InitTypeQualifierAttribute,
  DEFAULT_PROTO_IMPL_TYPE,
} from '..';
import QualifierCacheService from './fixtures/decators/QualifierCacheService';

describe('test/decorator.test.ts', () => {
  describe('ContextProto', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(ContextCache));
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'cache',
        initType: ObjectInitType.CONTEXT,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: DEFAULT_PROTO_IMPL_TYPE,
      };
      assert.deepStrictEqual(PrototypeUtil.getProperty(ContextCache), expectObjectProperty);
    });
  });

  describe('SingletonProto', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(SingletonCache));
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'cache',
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: DEFAULT_PROTO_IMPL_TYPE,
      };
      assert.deepStrictEqual(PrototypeUtil.getProperty(SingletonCache), expectObjectProperty);
    });
  });

  describe('Inject', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(CacheService));
      const expectInjectInfo: InjectObjectInfo[] = [{
        refName: 'cache',
        objName: 'fooCache',
      }, {
        refName: 'testService',
        objName: 'testService',
      }];
      assert.deepStrictEqual(PrototypeUtil.getInjectObjects(CacheService), expectInjectInfo);
    });
  });

  describe('Qualifier', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(QualifierCacheService));
      const property = 'cache';
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, LoadUnitNameQualifierAttribute) === 'foo',
      );
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, InitTypeQualifierAttribute) === ObjectInitType.SINGLETON,
      );
    });
    it('should work use Symbol.for', () => {
      assert(PrototypeUtil.isEggPrototype(QualifierCacheService));
      const property = 'cache';
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, Symbol.for('Qualifier.LoadUnitName')) === 'foo',
      );
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, Symbol.for('Qualifier.InitType')) === ObjectInitType.SINGLETON,
      );
    });
  });

  it('should get the right file path', () => {
    assert(PrototypeUtil.getFilePath(CacheService) === CacheService.fileName);
  });
});
