# `@eggjs/tegg-standalone`

通过 `@eggjs/tegg-standalone` 在一个独立环境去中运行 tegg 应用。

## install

```sh
npm i --save @eggjs/tegg-standalone
```

## Usage
当一个类上有 Runner 注解时，会自动运行其 main 函数。注无需再使用 `ContextProto` 注解，因为独立运行跑完即销毁，不用再区分独立上下文。

```ts
import { Runner, MainRunner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  @Inject()
  hello: Hello;

  async main(): Promise<string> {
    return this.hello.hello();
  }
}
```

运行代码
- cwd 为当前应用工作目录
- options:
  - innerObjects: 当前运行环境中内置的对象

```
await main(cwd, {
  innerObjects: {
    hello: {
      hello: () => {
        return 'hello, inner';
      },
    },
  },
});
```
