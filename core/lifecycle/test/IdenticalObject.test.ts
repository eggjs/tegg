import assert from 'assert';
import { IdenticalUtil } from '../src/IdenticalObject';

describe('test/IdenticalObject.test.ts', () => {
  it('should generate unique ctx id', () => {
    const traceId = 'mock_trace_id';
    const id1 = IdenticalUtil.createContextId(traceId);
    const id2 = IdenticalUtil.createContextId(traceId);
    assert(id1 !== id2);
  });
});
