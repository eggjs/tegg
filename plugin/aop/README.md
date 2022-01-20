# @eggjs/tegg-aop-plugin

## Usage

```js
// plugin.js
export.aopModule = {
  enable: true,
  package: '@eggjs/tegg-aop-plugin',
};
```

## Advice

使用 `@Advice` 注解来申明一个实现，可以用来监听、拦截方法执行。

**注意：Advice 也是一种 Prototype，可以通过 initType 来指定不同的生命周期。**

```ts
@Advice()
export class AdviceExample implements IAdvice {
  // Advice 中可以正常的注入其他的对象
  @Inject()
  private readonly callTrace: CallTrace;

  // 在函数执行前执行
  async beforeCall(ctx: AdviceContext): Promise<void> {
    // ...
  }

  // 在函数成功后执行
  async afterReturn(ctx: AdviceContext, result: any): Promise<void> {
    // ...
  }

  // 在函数成功后执行
  async afterThrow(ctx: AdviceContext, error: Error): Promise<void> {
    // ...
  }

  // 在函数退出时执行
  async afterFinally(ctx: AdviceContext): Promise<void> {
  }

  // 类似 koa 中间件的模式
  // block = next
  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
  }
}
```

## Pointcut

使用 `@Pointcut` 在某个类特定的方法上申明一个 `Advice`

```ts
@ContextProto()
export class Hello {
  @Pointcut(AdviceExample)
  async hello(name: string) {
    return `hello ${name}`;
  }
}
```

## Crosscut

使用 `@Crosscut` 来声明一个通用的 `Advice`，有三种模式
- 指定类和方法
- 通过正则指定类和方法
- 通过回调来指定类和方法

**注意：egg 中的对象无法被 Crosscut 指定到。**

```ts
// 通过类型来指定
@Crosscut({
  type: PointcutType.CLASS,
  clazz: CrosscutExample,
  methodName: 'hello',
})
@Advice()
export class CrosscutClassAdviceExample implements IAdvice {
}

// 通过正则来指定
@Crosscut({
  type: PointcutType.NAME,
  className: /crosscut.*/i,
  methodName: /hello/,
})
@Advice()
export class CrosscutNameAdviceExample implements IAdvice {
}

// 通过回调来指定
@Crosscut({
  type: PointcutType.CUSTOM,
  callback:  (clazz: EggProtoImplClass, method: PropertyKey) => {
    return clazz === CrosscutExample && method === 'hello';
  }
})
@Advice()
****export class CrosscutCustomAdviceExample implements IAdvice {
}

```
