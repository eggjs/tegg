import assert from 'assert';
import path from 'path';
import coffee from 'coffee';
import { FooHandler } from './fixtures/right-event-handle';
import { EventInfoUtil } from '../src/EventInfoUtil';

describe('test/Event.test.ts', () => {
  it('should work', () => {
    const eventName = EventInfoUtil.getEventName(FooHandler);
    assert(eventName === 'foo');
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
