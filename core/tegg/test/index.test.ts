import assert = require('assert');
import {
  Acl,
  Context,
  ContextProto,
  Inject,
  AccessLevel,
  EventInfoUtil,
  QualifierImplUtil,
  BackgroundTaskHelper,
  orm,
  aop,
} from '..';

describe('test/index.test.ts', () => {
  it('should ok', async () => {
    assert(Acl);
    assert(Context);
    assert(ContextProto);
    assert(Inject);
    assert(AccessLevel);
    assert(EventInfoUtil);
    assert(QualifierImplUtil);
    assert(BackgroundTaskHelper);
    assert(orm.DataSource);
    assert(orm.Attribute);
    assert(aop.Advice);
  });
});
