import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContext } from '@eggjs/tegg';
import { MapUtil } from '@eggjs/tegg-common-util';

export type GetRootProtoCallback = (ctx: EggContext) => EggPrototype | undefined;

export class RootProtoManager {
  // <method, GetRootProtoCallback[]>
  protoMap: Map<string, GetRootProtoCallback[]> = new Map();

  registerRootProto(method: string, cb: GetRootProtoCallback) {
    const cbList = MapUtil.getOrStore(this.protoMap, method, []);
    cbList.push(cb);
  }

  getRootProto(ctx: EggContext): EggPrototype | undefined {
    const cbList = this.protoMap.get(ctx.method);
    if (!cbList) {
      return;
    }
    for (const cb of cbList) {
      const proto = cb(ctx);
      if (proto) {
        return proto;
      }
    }
  }
}
