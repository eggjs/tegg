import { EggProtoImplClass, LifecycleHook } from '@eggjs/tegg';
import {
  EggPrototypeFactory,
  LoadUnit,
  LoadUnitLifecycleContext,
} from '@eggjs/tegg-metadata';
import { CompiledStateGraphProto } from './CompiledStateGraphProto';
import { GraphInfoUtil, IGraphMetadata } from '@eggjs/tegg-langchain-decorator';
import assert from 'node:assert';

export class GraphLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly eggPrototypeFactory: EggPrototypeFactory;
  clazzMap: Map<EggProtoImplClass, IGraphMetadata>;
  graphCompiledNameMap: Map<string, CompiledStateGraphProto> = new Map();

  constructor(eggPrototypeFactory: EggPrototypeFactory) {
    this.eggPrototypeFactory = eggPrototypeFactory;
    this.clazzMap = GraphInfoUtil.getAllGraphMetadata();
  }

  async preCreate(ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const clazzList = await ctx.loader.load();
    for (const clazz of clazzList) {
      const meta = this.clazzMap.get(clazz as EggProtoImplClass);
      if (meta) {
        const protoName = clazz.name[0].toLowerCase() + clazz.name.substring(1);
        const graphMetadata = GraphInfoUtil.getGraphMetadata(clazz as EggProtoImplClass);
        assert(graphMetadata, `${clazz.name} graphMetadata should not be null`);
        const proto = new CompiledStateGraphProto(loadUnit, `compiled${protoName.replace(protoName[0], protoName[0].toUpperCase())}`, protoName, graphMetadata);
        this.eggPrototypeFactory.registerPrototype(proto, loadUnit);
        this.graphCompiledNameMap.set(protoName, proto);
      }
    }
  }

  async postCreate(_ctx: LoadUnitLifecycleContext, obj: LoadUnit): Promise<void> {
    for (const graphName of this.graphCompiledNameMap.keys()) {
      const graphProto = obj.getEggPrototype(graphName, [])[0];
      if (graphProto) {
        const compiledGraphProto = this.graphCompiledNameMap.get(graphName) as CompiledStateGraphProto;
        if (!compiledGraphProto.injectObjects.find(injectObject => injectObject.objName === graphProto.name)) {
          compiledGraphProto.injectObjects.push({
            refName: 'stateGraph',
            objName: graphProto.name,
            qualifiers: [],
            proto: graphProto,
          });
        }
      }
    }
  }

}

