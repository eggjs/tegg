import { Model } from '../../src/decorator/Model';
import { Attribute } from '../../src/decorator/Attribute';
import { Index } from '../../src/decorator';

@Model()
@Index([ 'foo' ])
export class DefaultIndexModel {
  @Attribute('varchar')
  foo: string;
}
