import { EggContext, Next } from '../../src/model';
import { Middleware,Middlewares } from '../../src/decorator/Middleware';

async function middleware1(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware2(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware3(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

@Middleware(middleware1)
export class MiddlewareController {

  @Middleware(middleware2)
  @Middleware(middleware3)
  async hello(): Promise<void> {
    return;
  }
}

@Middlewares([middleware1])
export class MiddlewaresController {

  @Middlewares([middleware2,middleware3])
  async hello(): Promise<void> {
    return;
  }
}
