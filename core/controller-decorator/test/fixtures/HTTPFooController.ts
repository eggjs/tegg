import { HTTPController } from '../../src/decorator/http/HTTPController';
import { Context } from '../../src/decorator/Context';
import { Middleware } from '../../src/decorator/Middleware';
import { EggContext, HTTPMethodEnum, Next, IncomingHttpHeaders } from '../../src/model';
import {
  HTTPBody, HTTPParam, HTTPQueries, HTTPQuery, HTTPHeaders,
} from '../../src/decorator/http/HTTPParam';
import { HTTPMethod } from '../../src/decorator/http/HTTPMethod';

async function middleware1(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware2(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware3(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

@HTTPController({
  path: '/foo',
})
@Middleware(middleware1)
export class FooController {
  static fileName = __filename;

  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.POST,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, @HTTPBody() body, @HTTPQuery() query, @HTTPQueries() queries, @HTTPParam() id) {
    console.log(ctx, body, query, queries, id);
  }
}

@HTTPController({
  path: '/foo/:fooId',
})
export class ControllerWithParam {
  static fileName = __filename;

  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.GET,
  })
  async bar(@Context() ctx: EggContext, @HTTPParam() id: string, @HTTPParam() fooId: string,
    @HTTPHeaders() headers: IncomingHttpHeaders) {
    console.log(ctx, id, fooId, headers);
  }
}

@HTTPController({
  controllerName: 'FxxController',
})
export class FoxController {
  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.POST,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, @HTTPBody() body, @HTTPQuery() query, @HTTPQueries() queries, @HTTPParam() id) {
    console.log(ctx, body, query, queries, id);
  }
}

@HTTPController({
  protoName: 'FooController',
})
export class FxxController {
  @HTTPMethod({
    path: '/bar/:id',
    method: HTTPMethodEnum.POST,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, @HTTPBody() body, @HTTPQuery() query, @HTTPQueries() queries, @HTTPParam() id) {
    console.log(ctx, body, query, queries, id);
  }
}

@HTTPController()
export class ParentController {
}

@HTTPController()
export class ChildController extends ParentController {
}

@HTTPController()
export class DefaultValueController {
  @HTTPMethod({
    path: '/default/:id',
    method: HTTPMethodEnum.GET,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, @HTTPParam() id = 233, @HTTPQuery() query, @HTTPQueries() queries) {
    console.log(ctx, id, query, queries);
  }
}

@HTTPController()
export class Error1Controller {
  @HTTPMethod({
    path: '/error',
    method: HTTPMethodEnum.GET,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, id) {
    console.log(ctx, id);
  }
}

@HTTPController()
export class Error2Controller {
  @HTTPMethod({
    path: '/error',
    method: HTTPMethodEnum.GET,
  })
  @Middleware(middleware2)
  @Middleware(middleware3)
  async bar(@Context() ctx: EggContext, id = 233, @HTTPParam() id2 = 233) {
    console.log(ctx, id, id2);
  }
}
