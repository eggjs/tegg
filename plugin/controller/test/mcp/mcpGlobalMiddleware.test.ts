import assert from 'assert';
import compose from 'koa-compose';
import { MCPControllerRegister } from '../../lib/impl/mcp/MCPControllerRegister';

// Unit tests for the lazy global-middleware resolution.
//
// MCPControllerRegister.register() runs during the tegg load-unit init
// (postCreate), which happens before egg's `loadMiddleware` populates
// `app.middlewares`. The global middleware named in `config.mcp.middleware`
// must therefore be resolved lazily — on the first request — rather than at
// registration time, otherwise booting an app that configures `mcp.middleware`
// throws `Middleware <name> not found`.
function createRegister(mcp: any, middlewares: any) {
  const app: any = {
    eggContainerFactory: {},
    router: {},
    config: { mcp },
    middlewares,
  };
  const register = new (MCPControllerRegister as any)({}, {}, app);
  return { register, app };
}

describe('plugin/controller/test/mcp/mcpGlobalMiddleware.test.ts', () => {
  it('does not read app.middlewares at registration time', () => {
    // app.middlewares is still empty here, mirroring registration time.
    const { register } = createRegister({ middleware: [ 'trace' ] }, {});
    const base: any = async (_ctx: any, next: any) => next();

    // Wrapping the base middleware must not throw even though `trace` is not
    // yet available; resolution is deferred to the first request.
    assert.doesNotThrow(() => register.composeGlobalMiddleware(base));
    assert.strictEqual(register.globalMiddlewares, undefined);
  });

  it('resolves and runs the configured global middleware on first request', async () => {
    const { register, app } = createRegister({ middleware: [ 'trace' ] }, {});
    const order: string[] = [];
    const base: any = async (_ctx: any, next: any) => {
      order.push('base');
      return next();
    };
    const wrapped = register.composeGlobalMiddleware(base);

    // app.middlewares is populated later by loadMiddleware.
    app.middlewares.trace = () => async (_ctx: any, next: any) => {
      order.push('trace');
      return next();
    };

    await wrapped({} as any, async () => {
      order.push('handler');
    });

    assert.deepStrictEqual(order, [ 'base', 'trace', 'handler' ]);
    assert.ok(register.globalMiddlewares, 'built and cached after first request');
  });

  it('getGlobalMiddleware is idempotent (builds once)', () => {
    const { register } = createRegister({ middleware: [] }, {});
    register.getGlobalMiddleware();
    const first = register.globalMiddlewares;
    register.getGlobalMiddleware();
    assert.strictEqual(register.globalMiddlewares, first);
  });

  it('still surfaces a genuinely missing middleware at resolution time', () => {
    // The fix defers *when* middlewares are resolved; it must not hide a real
    // misconfiguration — an unknown name still throws once resolved.
    const { register } = createRegister({ middleware: [ 'nope' ] }, {});
    assert.throws(() => register.getGlobalMiddleware(), /Middleware nope not found/);
  });

  it('keeps koa-compose ordering for multiple global middlewares', async () => {
    const { register, app } = createRegister({ middleware: [ 'a', 'b' ] }, {});
    const order: string[] = [];
    const make = (name: string) => () => async (_ctx: any, next: any) => {
      order.push(`${name}:before`);
      await next();
      order.push(`${name}:after`);
    };
    app.middlewares.a = make('a');
    app.middlewares.b = make('b');
    const base: any = async (_ctx: any, next: any) => {
      order.push('base');
      return next();
    };
    const wrapped = register.composeGlobalMiddleware(base);
    await wrapped({} as any, async () => order.push('handler'));
    assert.deepStrictEqual(order, [
      'base', 'a:before', 'b:before', 'handler', 'b:after', 'a:after',
    ]);
    // compose is imported to assert the helper relies on koa-compose semantics.
    assert.strictEqual(typeof compose, 'function');
  });
});
