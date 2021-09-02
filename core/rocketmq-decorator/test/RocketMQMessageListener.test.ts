import assert from 'assert';
import { SimpleListener } from './fixtures/simple-listener';
import { RocketMQUtil } from '../dist';

describe('test/RocketMQMessageListener.test.ts', () => {
  it('should work', () => {
    const listenerName = RocketMQUtil.getMessageListenerName(SimpleListener);

    assert(listenerName === TOPIC_SIMPLE);
  });
});
