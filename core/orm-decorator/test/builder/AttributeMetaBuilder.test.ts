import assert from 'assert';
import { AttributeMetaBuilder } from '../../src/builder/AttributeMetaBuilder';
import { DefaultAttributeModel } from '../fixtures/DefaultAttributeModel';
import { AttributeModel } from '../fixtures/AttributeModel';
import { AttributeMeta } from '../../src/model/AttributeMeta';

describe('test/builder/AttributeMetaBuilder.test.ts', () => {
  describe('default value', () => {
    it('should set default value', () => {
      const attributeMetaBuilder = new AttributeMetaBuilder(DefaultAttributeModel);
      const attributes = attributeMetaBuilder.build();
      assert.deepStrictEqual(attributes, [
        new AttributeMeta(
          'foo',
          'foo',
          true,
          false,
          false,
          false,
        ),
      ]);
    });
  });

  describe('not default value', () => {
    it('should use decorator value', () => {
      const attributeMetaBuilder = new AttributeMetaBuilder(AttributeModel);
      const attributes = attributeMetaBuilder.build();
      assert.deepStrictEqual(attributes, [
        new AttributeMeta(
          'foo',
          'foo_field',
          false,
          false,
          true,
          true,
        ),
      ]);
    });
  });
});
