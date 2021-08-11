import { Model } from '../../src/decorator/Model';
import { Attribute } from '../../src/decorator/Attribute';
import { Index } from '../../src/decorator';

@Model()
@Index([ 'foo' ], {
  primary: true,
  unique: true,
  name: 'idx_foo_name',
})
export class IndexModel {
  @Attribute('varchar')
  foo: string;
}
