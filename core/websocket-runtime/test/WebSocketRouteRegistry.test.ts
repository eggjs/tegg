import { strict as assert } from 'node:assert';
import {
  WebSocketControllerMeta,
  WebSocketMethodMeta,
} from '@eggjs/controller-decorator';
import {
  createWebSocketRoutes,
  matchWebSocketRoute,
} from '..';

describe('test/WebSocketRouteRegistry.test.ts', () => {
  it('should sort routes, match hosts and preserve optional params', () => {
    const optionalMethod = new WebSocketMethodMeta(
      'optional',
      '/optional/:id?',
      [],
      undefined,
      new Map(),
      10,
      undefined,
    );
    const lowerPriorityMethod = new WebSocketMethodMeta(
      'lowerPriority',
      '/lower',
      [],
      undefined,
      new Map(),
      1,
      undefined,
    );
    const metadata = new WebSocketControllerMeta(
      'TestController',
      'testController',
      'TestController',
      '/ws',
      [],
      [ lowerPriorityMethod, optionalMethod ],
      [ 'example.com' ],
    );
    const proto = { metadata };
    const validated: string[] = [];
    const routes = createWebSocketRoutes(
      [ proto ],
      item => item.metadata,
      (_controllerMeta, methodMeta) => validated.push(methodMeta.name),
    );

    assert.deepEqual(validated, [ 'optional', 'lowerPriority' ]);
    assert.equal(routes[0].methodMeta.name, 'optional');
    assert.equal(matchWebSocketRoute(routes, '/ws/optional', 'other.example.com'), undefined);
    assert.deepEqual(
      matchWebSocketRoute(routes, '/ws/optional', 'example.com')?.params,
      {},
    );
    assert.deepEqual(
      matchWebSocketRoute(routes, '/ws/optional/value', 'example.com')?.params,
      { id: 'value' },
    );
    assert.throws(
      () => matchWebSocketRoute(routes, '/ws/optional/%E0%A4%A', 'example.com'),
      URIError,
    );
  });
});
