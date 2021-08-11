import { Model } from '../../src/decorator/Model';
import { Attribute } from '../../src/decorator/Attribute';
import { Index } from '../../src/decorator';

@Model()
@Index([ 'not_exist_field' ])
export class InvalidateIndexModel {
  @Attribute('varchar')
  foo: string;
}
