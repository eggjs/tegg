import { EggProtoImplClass } from '@eggjs/core-decorator';
import { IAdvice } from './Advice';
import { CrosscutInfo, CrosscutInfoUtil } from '../util/CrosscutInfoUtil';
import {
  ClassPointInfo,
  CustomPointcutCallback,
  CustomPointInfo,
  NamePointInfo,
  PointcutType,
} from '../model/PointcutInfo';

export interface CrosscutOptions {
  // 默认值 100
  order?: number;
}

const defaultCrossOptions = {
  order: 100,
};

// TODO type check for methodName
export interface ClassCrosscutParam {
  type: PointcutType.CLASS;
  clazz: EggProtoImplClass;
  methodName: PropertyKey;
}

export interface NameCrosscutParam {
  type: PointcutType.NAME;
  className: RegExp;
  methodName: RegExp;
}


export interface CustomCrosscutParam {
  type: PointcutType.CUSTOM;
  callback: CustomPointcutCallback;
}

export type CrosscutParam = ClassCrosscutParam | NameCrosscutParam | CustomCrosscutParam;

export function Crosscut(param: CrosscutParam, options?: CrosscutOptions) {
  return function(constructor: EggProtoImplClass<IAdvice>) {
    let crosscutInfo: CrosscutInfo;
    if (param.type === PointcutType.CLASS) {
      crosscutInfo = {
        pointcutInfo: new ClassPointInfo(param.clazz, param.methodName),
        adviceInfo: {
          clazz: constructor,
          order: options?.order ?? defaultCrossOptions.order,
        },
      };
    } else if (param.type === PointcutType.NAME) {
      crosscutInfo = {
        pointcutInfo: new NamePointInfo(param.className, param.methodName),
        adviceInfo: {
          clazz: constructor,
          order: options?.order ?? defaultCrossOptions.order,
        },
      };
    } else {
      crosscutInfo = {
        pointcutInfo: new CustomPointInfo(param.callback),
        adviceInfo: {
          clazz: constructor,
          order: options?.order ?? defaultCrossOptions.order,
        },
      };
    }
    CrosscutInfoUtil.setIsCrosscutAdvice(true, constructor);
    CrosscutInfoUtil.addCrosscutInfo(crosscutInfo, constructor);
  };
}
