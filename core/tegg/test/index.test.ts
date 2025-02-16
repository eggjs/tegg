import assert from 'node:assert/strict';
import { it } from 'vitest';
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
} from '../index.js';

it('should exports work', async () => {
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
