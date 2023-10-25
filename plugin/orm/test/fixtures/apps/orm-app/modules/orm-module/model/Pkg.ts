import { Attribute, Model } from '@eggjs/tegg-orm-decorator';
import { DataTypes, Bone } from 'leoric';

@Model({
  dataSource: 'test',
})
export class Pkg extends Bone {
  @Attribute(DataTypes.STRING)
  name: string;
  @Attribute(DataTypes.STRING)
  desc: string;

  static beforeCreate(instance: Pkg) {
    instance.name += '_before_create_hook';
  }
}
