import { AccessLevel, ContextProto, SingletonProto } from '@eggjs/core-decorator';
import { EggObjectLifecycle, LifecyclePostConstruct } from '@eggjs/tegg-lifecycle';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Foo implements EggObjectLifecycle {
  private called: string[] = [];

  getLifecycleCalled() {
    return this.called;
  }

  constructor() {
    this.called.push('construct');
  }

  async postConstruct(): Promise<void> {
    this.called.push('postConstruct');
  }

  async preInject(): Promise<void> {
    this.called.push('preInject');
  }

  async postInject(): Promise<void> {
    this.called.push('postInject');
  }

  async init(): Promise<void> {
    this.called.push('init');
  }

  async preDestroy(): Promise<void> {
    this.called.push('preDestroy');
  }

  async destroy(): Promise<void> {
    this.called.push('destroy');
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Bar implements EggObjectLifecycle {
  private called: string[] = [];

  getLifecycleCalled() {
    return this.called;
  }

  constructor() {
    this.called.push('construct');
  }

  @LifecyclePostConstruct()
  protected async _postConstruct() {
    this.called.push('postConstruct');
  }

  async preInject() {
    this.called.push('preInject');
  }

  async postInject() {
    this.called.push('postInject');
  }

  async init() {
    this.called.push('init');
  }

  async preDestroy() {
    this.called.push('preDestroy');
  }

  async destroy() {
    this.called.push('destroy');
  }
}
