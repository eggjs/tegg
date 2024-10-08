import assert from 'node:assert';
import {
  AccessLevel,
  ObjectInitType,
  LoadUnitNameQualifierAttribute,
  InitTypeQualifierAttribute,
  DEFAULT_PROTO_IMPL_TYPE,
  MultiInstanceType,
} from '@eggjs/tegg-types';
import type { EggPrototypeInfo, EggMultiInstancePrototypeInfo, InjectObjectInfo } from '@eggjs/tegg-types';

import CacheService from './fixtures/decators/CacheService';
import ContextCache from './fixtures/decators/ContextCache';
import SingletonCache from './fixtures/decators/SingletonCache';

import { PrototypeUtil, QualifierUtil } from '..';
import QualifierCacheService from './fixtures/decators/QualifierCacheService';
import { FOO_ATTRIBUTE, FooLogger } from './fixtures/decators/FooLogger';
import { ConstructorObject } from './fixtures/decators/ConstructorObject';
import {
  ChildDynamicMultiInstanceProto,
  ChildSingletonProto,
  ChildStaticMultiInstanceProto,
  ParentDynamicMultiInstanceProto,
  ParentSingletonProto,
  ParentStaticMultiInstanceProto,
} from './fixtures/decators/ChildService';

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

    it('constructor should work', () => {
      const injectConstructors = PrototypeUtil.getInjectObjects(ConstructorObject);
      assert.deepStrictEqual(injectConstructors, [
        { refIndex: 0, refName: 'xCache', objName: 'fooCache' },
        { refIndex: 1, refName: 'cache', objName: 'cache' },
      ]);
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
    it('constructor should work', () => {
      const constructorQualifiers = QualifierUtil.getProperQualifiers(ConstructorObject, 'xCache');
      const constructorQualifiers2 = QualifierUtil.getProperQualifiers(ConstructorObject, 'cache');
      assert.deepStrictEqual(constructorQualifiers, [
        { attribute: Symbol.for('Qualifier.LoadUnitName'), value: 'foo' },
        { attribute: Symbol.for('Qualifier.InitType'), value: ObjectInitType.SINGLETON },
      ]);
      assert.deepStrictEqual(constructorQualifiers2, []);
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
        className: 'FooLogger',
      };
      assert.deepStrictEqual(PrototypeUtil.getMultiInstanceProperty(FooLogger, {
        unitPath: 'foo',
        moduleName: '',
      }), expectObjectProperty);
    });
  });

  it('should get the right file path', () => {
    assert(PrototypeUtil.getFilePath(CacheService) === CacheService.fileName);
  });

  describe('inherited', () => {
    const fakeCtx = {
      unitPath: 'foo',
      moduleName: '',
    };

    it('Prototype should not be inherited', () => {
      assert(PrototypeUtil.isEggPrototype(ParentSingletonProto));
      assert(PrototypeUtil.getProperty(ParentSingletonProto));
      assert(PrototypeUtil.getFilePath(ParentSingletonProto));

      assert.strictEqual(PrototypeUtil.isEggPrototype(ChildSingletonProto), undefined);
      assert.strictEqual(PrototypeUtil.getProperty(ChildSingletonProto), undefined);
      assert.strictEqual(PrototypeUtil.getFilePath(ChildSingletonProto), undefined);
    });

    it('static multiInstanceProto should not be inherited', () => {
      assert(PrototypeUtil.isEggMultiInstancePrototype(ParentStaticMultiInstanceProto));
      assert.strictEqual(
        PrototypeUtil.getEggMultiInstancePrototypeType(ParentStaticMultiInstanceProto),
        MultiInstanceType.STATIC,
      );
      assert(PrototypeUtil.getStaticMultiInstanceProperty(ParentStaticMultiInstanceProto));
      assert(PrototypeUtil.getMultiInstanceProperty(ParentStaticMultiInstanceProto, fakeCtx));
      assert(PrototypeUtil.getFilePath(ParentStaticMultiInstanceProto));

      assert.strictEqual(PrototypeUtil.isEggMultiInstancePrototype(ChildStaticMultiInstanceProto), undefined);
      assert.strictEqual(PrototypeUtil.getEggMultiInstancePrototypeType(ChildStaticMultiInstanceProto), undefined);
      assert.strictEqual(PrototypeUtil.getStaticMultiInstanceProperty(ChildStaticMultiInstanceProto), undefined);
      assert.strictEqual(PrototypeUtil.getMultiInstanceProperty(ChildStaticMultiInstanceProto, fakeCtx), undefined);
      assert.strictEqual(PrototypeUtil.getFilePath(ChildStaticMultiInstanceProto), undefined);
    });

    it('dynamic multipleInstanceProto should not be inherited', () => {
      assert.strictEqual(
        PrototypeUtil.getEggMultiInstancePrototypeType(ParentDynamicMultiInstanceProto),
        MultiInstanceType.DYNAMIC,
      );
      assert(PrototypeUtil.getDynamicMultiInstanceProperty(ParentDynamicMultiInstanceProto, fakeCtx));
      assert(PrototypeUtil.getMultiInstanceProperty(ParentDynamicMultiInstanceProto, fakeCtx));

      assert.strictEqual(PrototypeUtil.getEggMultiInstancePrototypeType(ChildDynamicMultiInstanceProto), undefined);
      assert.strictEqual(PrototypeUtil.getDynamicMultiInstanceProperty(ChildDynamicMultiInstanceProto, fakeCtx), undefined);
      assert.strictEqual(PrototypeUtil.getMultiInstanceProperty(ChildDynamicMultiInstanceProto, fakeCtx), undefined);
    });
  });
});
