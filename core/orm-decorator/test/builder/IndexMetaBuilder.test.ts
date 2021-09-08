import assert from 'assert';
import { AttributeMetaBuilder } from '../../src/builder/AttributeMetaBuilder';
import { DefaultIndexModel } from '../fixtures/DefaultIndexModel';
import { IndexMetaBuilder } from '../../src/builder/IndexMetaBuilder';
import { IndexModel } from '../fixtures/IndexModel';
import { InvalidateIndexModel } from '../fixtures/InvalidateIndexModel';
import { IndexMeta } from '../../src/model/IndexMeta';

describe('test/builder/AttributeMetaBuilder.test.ts', () => {
  describe('default value', () => {
    it('should set default value', () => {
      const attributeMetaBuilder = new AttributeMetaBuilder(DefaultIndexModel);
      const indexMetaBuilder = new IndexMetaBuilder(DefaultIndexModel, attributeMetaBuilder.build());
      const indices = indexMetaBuilder.build();
      assert.deepStrictEqual(indices, [
        new IndexMeta(
          'idx_foo',
          [ 'foo' ],
          false,
          false,
        ),
      ]);
    });
  });

  describe('not default value', () => {
    it('should use decorator value', () => {
      const attributeMetaBuilder = new AttributeMetaBuilder(IndexModel);
      const indexMetaBuilder = new IndexMetaBuilder(IndexModel, attributeMetaBuilder.build());
      const indices = indexMetaBuilder.build();
      assert.deepStrictEqual(indices, [
        new IndexMeta(
          'idx_foo_name',
          [ 'foo' ],
          true,
          true,
        ),
      ]);
    });
  });

  describe('field not exits', () => {
    it('should throw error', () => {
      const attributeMetaBuilder = new AttributeMetaBuilder(InvalidateIndexModel);
      const indexMetaBuilder = new IndexMetaBuilder(InvalidateIndexModel, attributeMetaBuilder.build());
      assert.throws(() => {
        indexMetaBuilder.build();
      }, /model InvalidateIndexModel has no attribute named not_exist_field/);
    });
  });
});
