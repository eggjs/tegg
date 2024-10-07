import { QualifierUtil } from '@eggjs/core-decorator';
import { AbstractProtoDescriptor, AbstractProtoDescriptorOptions } from './AbstractProtoDescriptor';
import { EggProtoImplClass, ProtoDescriptor } from '@eggjs/tegg-types';
import { ProtoDescriptorType } from '@eggjs/tegg-types/metadata/enum/ProtoDescriptorType';

export interface ClassProtoDescriptorOptions extends Omit<AbstractProtoDescriptorOptions, 'type'> {
  clazz: EggProtoImplClass;
}

export class ClassProtoDescriptor extends AbstractProtoDescriptor {
  clazz: EggProtoImplClass;
  clazzName: string;

  static isClassProtoDescriptor(descriptor: ProtoDescriptor): descriptor is ClassProtoDescriptor {
    return (descriptor as AbstractProtoDescriptor).type === ProtoDescriptorType.CLASS;
  }

  constructor(options: ClassProtoDescriptorOptions) {
    super({
      type: ProtoDescriptorType.CLASS,
      ...options,
    });
    this.clazz = options.clazz;
    this.className = this.clazz.name;
  }

  equal(protoDescriptor: ProtoDescriptor): boolean {
    if (!ClassProtoDescriptor.isClassProtoDescriptor(protoDescriptor)) {
      return false;
    }
    return this.clazz === protoDescriptor.clazz
      && this.name === protoDescriptor.name
      && this.accessLevel === protoDescriptor.accessLevel
      && this.initType === protoDescriptor.initType
      && this.instanceModuleName === protoDescriptor.instanceModuleName
      && QualifierUtil.equalQualifiers(this.qualifiers, protoDescriptor.qualifiers);
  }
}
