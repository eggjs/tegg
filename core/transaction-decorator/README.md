# @eggjs/tegg-transaction-decorator

事务注解

## Usage
```ts
export class Foo {

  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async bar() {
    await this.foo();
  }

  @Transactional({ propagation: PropagationType.REQUIRED })
  async foo(msg) {
    console.log('has msg: ', msg);
  }

}

```

Foo.bar 始终会在一个独立的事务中执行，而 Foo.foo 会在 Foo.bar 的事务中执行
