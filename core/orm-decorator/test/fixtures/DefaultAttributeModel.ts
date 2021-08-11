import { Model } from '../../src/decorator/Model';
import { Attribute } from '../../src/decorator/Attribute';

@Model()
export class DefaultAttributeModel {
  @Attribute('varchar')
  foo: string;
}
