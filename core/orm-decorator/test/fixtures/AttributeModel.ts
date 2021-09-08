import { Model } from '../../src/decorator/Model';
import { Attribute } from '../../src/decorator/Attribute';

@Model()
export class AttributeModel {
  @Attribute('varchar', {
    name: 'foo_field',
    allowNull: false,
    autoIncrement: false,
    primary: true,
    unique: true,
  })
  foo: string;
}
