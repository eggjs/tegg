import { ObjectInitType } from '@eggjs/tegg-types';
import { SingletonProto } from '../../../src/decorator/SingletonProto';
import { Inject, InjectOptional } from '../../../src/decorator/Inject';
import { InitTypeQualifier } from '../../../src/decorator/InitTypeQualifier';
import { ModuleQualifier } from '../../../src/decorator/ModuleQualifier';
import { ContextProto } from '../../../src/decorator/ContextProto';
import { ICache } from './ICache';

@SingletonProto()
export class CacheService {}

@ContextProto()
export class CacheContextService {}

@SingletonProto()
export class ConstructorObject {
    constructor(
      @InitTypeQualifier(ObjectInitType.SINGLETON)
      @ModuleQualifier('foo')
      @Inject({ name: 'fooCache'}) readonly xCache: ICache,
      @Inject() readonly cache: ICache,
      @Inject() readonly otherCache: CacheService,
      @Inject({ optional: true }) readonly optional1?: ICache,
      @InjectOptional() readonly optional2?: ICache,
    ) {}
}

@SingletonProto()
export class ConstructorQualifierObject {
  constructor(
    @Inject() readonly xCache: ICache,
    @Inject() readonly cache: CacheService,
    @Inject() readonly ContextCache: CacheContextService,
    @Inject('cacheService') readonly customNameCache: CacheService,
    @InitTypeQualifier(ObjectInitType.CONTEXT) @Inject() readonly customQualifierCache1: CacheService,
    @Inject() @InitTypeQualifier(ObjectInitType.CONTEXT) readonly customQualifierCache2: CacheService,
  ) {}
}
