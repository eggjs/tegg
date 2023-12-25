import assert from 'assert';
import path from 'path';
import coffee from 'coffee';
import { FooHandler } from './fixtures/right-event-handle';
import { MultiHandler } from './fixtures/multiple-events-handle';
import { EventContextHandler } from './fixtures/event-handle-with-context';
import { EventInfoUtil } from '../src/EventInfoUtil';

describe('test/Event.test.ts', () => {
  it('getEventName should work', () => {
    const event = EventInfoUtil.getEventName(FooHandler);
    assert.equal(event, 'foo');
  });

  it('getEventNameList should work', function() {
    const event = EventInfoUtil.getEventName(MultiHandler);
    assert.deepStrictEqual(event, 'hello');
    const eventList = EventInfoUtil.getEventNameList(MultiHandler);
    assert.deepStrictEqual(eventList, [ 'hi', 'hello' ]);
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
      .expect('stdout', /Type 'number' is not assignable to type 'string'/)
      .notExpect('code', 0)
      .end();
  });
});
