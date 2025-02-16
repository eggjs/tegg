import assert from 'node:assert/strict';
import path from 'node:path';
import { it } from 'vitest';
import coffee from 'coffee';
import { FooHandler } from './fixtures/right-event-handle.js';
import { MultiHandler } from './fixtures/multiple-events-handle.js';
import { EventContextHandler } from './fixtures/event-handle-with-context.js';
import { EmptyHandler } from './fixtures/empty-handle.js';
import { EventInfoUtil } from '../src/index.js';

it('getEventName should work', () => {
  assert.equal(EventInfoUtil.getEventName(FooHandler), 'foo');
  assert.equal(EventInfoUtil.getEventName(EmptyHandler), undefined);
});

it('getEventNameList should work', function() {
  const event = EventInfoUtil.getEventName(MultiHandler);
  assert.deepStrictEqual(event, 'hello');
  const eventList = EventInfoUtil.getEventNameList(MultiHandler);
  assert.deepStrictEqual(eventList, [ 'hi', 'hello' ]);
});

it('setEventName should work', function() {
  EventInfoUtil.setEventName('foo', EmptyHandler);
  assert.equal(EventInfoUtil.getEventName(EmptyHandler), 'foo');
  EventInfoUtil.setEventName('bar', EmptyHandler);
  assert.equal(EventInfoUtil.getEventName(EmptyHandler), 'bar');
});

it('getEventHandlerContextInject', function() {
  assert.equal(EventInfoUtil.getEventHandlerContextInject(EventContextHandler), true);
  assert.equal(EventInfoUtil.getEventHandlerContextInject(FooHandler), false);
});

it('event type check should work', async () => {
  const tsc = require.resolve('typescript/bin/tsc');
  const files = [
    path.join(__dirname, 'fixtures/wrong-event-handle.ts'),
    path.join(__dirname, '../src/type.d.ts'),
  ];
  await coffee.fork(
    tsc,
    [ '--noEmit', '--experimentalDecorators', ...files ],
  )
    // .debug()
    // .expect('stdout', /Type 'number' is not assignable to type 'string'/)
    .notExpect('code', 0)
    .end();
});
