import { AccessLevel, ContextProto, SingletonProto } from '@eggjs/core-decorator';
import { EggObjectLifecycle } from '@eggjs/tegg-lifecycle';

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
