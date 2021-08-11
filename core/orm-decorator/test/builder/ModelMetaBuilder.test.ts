import assert from 'assert';
import { ModelMetaBuilder } from '../../src/builder/ModelMetaBuilder';
import { Foo } from '../fixtures/Foo';
import { ModelMetadata } from '../../src/model/ModelMetadata';
import { AttributeMeta } from '../../src/model/AttributeMeta';
import { IndexMeta } from '../../src/model/IndexMeta';

describe('test/builder/ModelMetaBuilder.test.ts', () => {
  it('should work', () => {
    const builder = new ModelMetaBuilder(Foo);
    const meta = builder.build();
    assert.deepStrictEqual(meta, new ModelMetadata(
      'a_db',
      'a_foo_table',
      [
        new AttributeMeta(
          'id',
          'pid',
          false,
          true,
          true,
          false,
        ),
        new AttributeMeta(
          'name',
          'name',
          true,
          false,
          false,
          false,
        ),
        new AttributeMeta(
          'foo',
          'foo',
          true,
          false,
          false,
          true,
        ),
      ],
      [
        new IndexMeta(
          'uk_name',
          [ 'name' ],
          true,
          false,
        ),
      ],
    ));
  });
});
