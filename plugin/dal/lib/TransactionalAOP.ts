import { Advice, AdviceContext, IAdvice } from '@eggjs/tegg/aop';
import { AccessLevel, EggProtoImplClass, ObjectInitType } from '@eggjs/tegg';
import { PropagationType } from '@eggjs/tegg/transaction';
import assert from 'node:assert';
import { MysqlDataSource } from '@eggjs/dal-runtime';

export interface TransactionalParams {
  propagation: PropagationType;
  dataSourceGetter: () => MysqlDataSource;
}

@Advice({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
})
export class TransactionalAOP implements IAdvice<EggProtoImplClass, TransactionalParams> {
  public async around(ctx: AdviceContext<EggProtoImplClass, TransactionalParams>, next: () => Promise<any>): Promise<void> {
    const { propagation, dataSourceGetter } = ctx.adviceParams!;
    const dataSource = dataSourceGetter();
    assert(propagation === PropagationType.REQUIRED, '事务注解目前只支持 REQUIRED 机制');
    return await dataSource.beginTransactionScope(next);
  }
}
