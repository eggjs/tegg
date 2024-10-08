import { MultiInstanceProto, SingletonProto } from '../../..';

@SingletonProto()
export class ParentSingletonProto {}

export class ChildSingletonProto extends ParentSingletonProto {}


@MultiInstanceProto({
  objects: [],
})
export class ParentStaticMultiInstanceProto {}

export class ChildStaticMultiInstanceProto extends ParentSingletonProto {}


@MultiInstanceProto({
  getObjects: () => [],
})
export class ParentDynamicMultiInstanceProto {}

export class ChildDynamicMultiInstanceProto extends ParentDynamicMultiInstanceProto {}
