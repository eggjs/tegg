import assert from 'node:assert';
import { MetadataUtil } from '@eggjs/core-decorator';
import {
  CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP,
  ControllerType,
  HTTPMethodEnum,
} from '@eggjs/tegg-types';
import {
  ControllerMetaBuilderFactory,
  HTTPController,
  HTTPMethod,
  HTTPParam,
  HTTPQuery,
  WebSocketController,
  WebSocketControllerMeta,
  WebSocketFetchController,
  WebSocketFetchOnOpen,
  WebSocketFetchMethod,
  WebSocketData,
  WebSocketStream,
  WebSocketMethod,
  WebSocketPathParamMeta,
  WebSocketQueryParamMeta,
  WebSocketInfoUtil,
} from '../..';

@HTTPController({ path: '/http-only' })
class HTTPOnlyController {
  @HTTPMethod({ path: '/:id', method: HTTPMethodEnum.GET })
  get(@HTTPParam() id: string) {
    return id;
  }
}

@WebSocketController({ path: '/websocket', timeout: 1000 })
class CommonParamWebSocketController {
  @WebSocketMethod({ path: '/:id', timeout: 50 })
  handle(
    @HTTPParam() id: string,
    @HTTPQuery({ name: 'name' }) name: string,
  ) {
    return { id, name };
  }
}

@WebSocketFetchController({ path: '/duplicate-lifecycle' })
class DuplicateLifecycleWebSocketFetchController {
  @WebSocketFetchMethod()
  onData() {
    // test fixture
  }

  @WebSocketFetchOnOpen()
  firstOpen() {
    // test fixture
  }

  @WebSocketFetchOnOpen()
  secondOpen() {
    // test fixture
  }
}

@WebSocketFetchController({ path: '/invalid-stream' })
class InvalidStreamWebSocketFetchController {
  @WebSocketFetchMethod()
  onData(@WebSocketStream() _stream: NodeJS.ReadableStream) {
    void _stream;
  }
}

@WebSocketController({ path: '/invalid-data' })
class InvalidDataWebSocketController {
  @WebSocketMethod({ path: '/' })
  handle(@WebSocketData() _data: unknown) {
    void _data;
  }
}

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

  it('should not add websocket metadata from HTTP parameter decorators', () => {
    ControllerMetaBuilderFactory.build(HTTPOnlyController, ControllerType.HTTP);
    assert.equal(
      MetadataUtil.hasMetaData(CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP, HTTPOnlyController),
      false,
    );
    assert.deepEqual(WebSocketInfoUtil.getParamIndexList(HTTPOnlyController, 'get'), []);
  });

  it('should map common HTTP parameters while building websocket metadata', () => {
    const metadata = ControllerMetaBuilderFactory.build(
      CommonParamWebSocketController,
      ControllerType.WEBSOCKET,
    ) as WebSocketControllerMeta;
    const method = metadata.methods[0];

    assert.equal(metadata.timeout, 1000);
    assert.equal(method.timeout, 50);
    assert.deepEqual(method.paramMap, new Map([
      [ 0, new WebSocketPathParamMeta('id') ],
      [ 1, new WebSocketQueryParamMeta('name') ],
    ]));
  });

  it('should reject duplicate websocket fetch lifecycle methods', () => {
    assert.throws(
      () => ControllerMetaBuilderFactory.build(DuplicateLifecycleWebSocketFetchController),
      /duplicate OPEN lifecycle method/,
    );
  });

  it('should reject websocket stream params in fetch methods', () => {
    assert.throws(
      () => ControllerMetaBuilderFactory.build(InvalidStreamWebSocketFetchController),
      /type STREAM is not allowed in websocket fetch DATA method/,
    );
  });

  it('should reject websocket fetch params in ordinary websocket methods', () => {
    assert.throws(
      () => ControllerMetaBuilderFactory.build(InvalidDataWebSocketController),
      /param 0 is websocket fetch only/,
    );
  });
});
