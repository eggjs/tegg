import assert from 'node:assert';
import { MetadataUtil } from '@eggjs/core-decorator';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';
import { FooController, ParentController, ChildController } from '../fixtures/HTTPFooController';
import { ControllerMetadataUtil } from '../../src/util/ControllerMetadataUtil';
import '../../src/impl/http/HTTPControllerMetaBuilder';

describe('test/util/ControllerMetadataUtil.test.ts', () => {
  describe('get metadata', () => {
    beforeEach(() => {
      MetadataUtil.deleteMetaData(CONTROLLER_META_DATA, FooController);
    });

    it('should work', () => {
      const metadata = ControllerMetadataUtil.getControllerMetadata(FooController)!;
      assert(metadata);
      assert(metadata.controllerName === 'FooController');
    });
  });

  describe('inherit case', () => {
    beforeEach(() => {
      MetadataUtil.deleteMetaData(CONTROLLER_META_DATA, ParentController);
      MetadataUtil.deleteMetaData(CONTROLLER_META_DATA, ChildController);
    });

    it('should work', () => {
      const parentMetadata = ControllerMetadataUtil.getControllerMetadata(ParentController)!;
      assert(parentMetadata);
      assert(parentMetadata.controllerName === 'ParentController');

      const childMetadata = ControllerMetadataUtil.getControllerMetadata(ChildController)!;
      assert(childMetadata);
      assert(childMetadata.controllerName === 'ChildController');
    });
  });
});
