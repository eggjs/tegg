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
import { FOO_ATTRIBUTE, FooLogger } from './fixtures/decators/FooLogger';
import { EggMultiInstancePrototypeInfo } from '../src/model/EggMultiInstancePrototypeInfo';

describe('test/decorator.test.ts', () => {
  describe('ContextProto', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(ContextCache));
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'cache',
        initType: ObjectInitType.CONTEXT,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: DEFAULT_PROTO_IMPL_TYPE,
        className: 'ContextCache',
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
        className: 'SingletonCache',
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
      }, {
        objName: 'abcabc',
        refName: 'testService2',
      }, {
        objName: 'testService3',
        refName: 'otherService',
      }, {
        objName: 'testService4',
        refName: 'testService4',
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

  describe('MultiInstanceProto', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggMultiInstancePrototype(FooLogger));
      const expectObjectProperty: EggMultiInstancePrototypeInfo = {
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: 'foo',
        objects: [{
          name: 'foo',
          qualifiers: [{
            attribute: FOO_ATTRIBUTE,
            value: 'foo1',
          }],
        }, {
          name: 'foo',
          qualifiers: [{
            attribute: FOO_ATTRIBUTE,
            value: 'foo2',
          }],
        }],
      };
      assert.deepStrictEqual(PrototypeUtil.getMultiInstanceProperty(FooLogger, {
        unitPath: 'foo',
      }), expectObjectProperty);
    });
  });

  it('should get the right file path', () => {
    assert(PrototypeUtil.getFilePath(CacheService) === CacheService.fileName);
  });
});
