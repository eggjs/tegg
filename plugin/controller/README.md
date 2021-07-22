# @eggjs/tegg-controller-plugin

使用注解的方式来开发 egg 中的 Controller

## Install

```shell
# tegg 注解
npm i --save @eggjs/tegg
# tegg 插件
npm i --save @eggjs/tegg-plugin
# tegg controller 插件
npm i --save @eggjs/tegg-controller-plugin
```

## Prepare
```json
// tsconfig.json
{
  "compilerOptions": {
    // 注解特性需要显示打开
    "experimentalDecorators": true
  }
}
```

## Config

```js
// config/plugin.js
exports.tegg = {
  package: '@eggjs/tegg-plugin',
  enable: true,
};

exports.teggController = {
  package: '@eggjs/tegg-controller-plugin',
  enable: true,
};
```

## Usage

### Middleware
中间件注解，可以添加在类/方法上。添加在类上时，对类上所有方法生效，添加在方法上时，只对当前方法生效。

```ts
// app/middleware/global_log.ts
import { Context } from 'egg';

export default async function globalLog(ctx: Context, next: any) {
  ctx.logger.info('have a request');
  return next();
}

// app/controller/FooController.ts
import { Middleware } from '@eggjs/tegg';

@Middleware(globalLog)
export class FooController {

  @Middleware(methodCount)
  async hello() {
  }
}
```

### Context
当需要 egg context 时，可以使用 `@Context` 注解来声明。

```ts
// app/controller/FooController.ts
import { Context, EggContext } from '@eggjs/tegg';

export class FooController {
  @Middleware(methodCount)
  async hello(@Context() ctx: EggContext) {
  }
}
```

### HTTP 注解

#### HTTPController/HTTPMethod

`@HTTPController` 注解用来声明当前类是一个 HTTP controller，可以配置路径前缀。
`@HTTPMethod` 注解用来声明当前方法是一个 HTTP method，只有带了这个注解，HTTP 方法才会被暴露出去，可以配置方法路径，

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello() {
  }
}
```

#### Param
HTTP 协议中有各种各样的传参方式，比如 query,path,body 等等。

##### HTTPBody
接收 body 参数

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello(@HTTPBody() name: string) {
    return `hello, ${name}`;
  }
}
```

##### HTTPQuery/HTTPQueries
两者的区别在于参数是否为数组， HTTPQuery 只会取第一个参数，HTTPQueries 只提供数组形式。
HTTPQuery 的参数类型只能是 string, HTTPQueries 的参数类型只能是 string[]。

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery, HTTPQueries } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello(
    // /foo/hello?name=bar
    // HTTPQuery: name=bar
    // HTTPQueries: name=[bar]
    @HTTPQuery() name: string,
    @HTTPQueries() names: string[],
  ) {
    return `hello, ${name}`;
  }
}
```

如果需要使用别名，比如说 query 中的 name 不能在 js 中声明时，如 foo[bar] 这类的。可以通过以下形式

```ts
@HTTPQuery({ name: 'foo[bar]' }) fooBar: string,
```

##### HTTPParam
接收 path 中的参数，类型只能为 string

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  async hello(@HTTPParam() id: string) {
    return `hello, ${name}`;
  }
}
```

如果需要使用别名，比如说 path 中使用正则声明 `/foo/(.*)`, 可以通过以下形式

```ts
// 具体 name 值可以查看 path-to-regexp
@HTTPParam({ name: '0' }) id: string
```
