import assert from 'node:assert';
import {
  ControllerMetaBuilderFactory,
  WebSocketFetchController,
  WebSocketFetchMethod,
} from '../..';

@WebSocketFetchController()
class MissingPathWebSocketFetchController {
  @WebSocketFetchMethod()
  onData() {
    // test fixture
  }
}

describe('core/controller-decorator/test/websocket/WebSocketMeta.test.ts', () => {
  it('should require websocket fetch controller path', () => {
    assert.throws(
      () => ControllerMetaBuilderFactory.build(MissingPathWebSocketFetchController),
      /build websocket fetch controller .* failed: path is required/,
    );
  });
});
