export enum PropagationType {
  /** 不管是当前调用栈是否存在事务，始终让当前函数在新的事务中执行 */
  ALWAYS_NEW = 'ALWAYS_NEW',
  /** 如果当前调用栈存在事务则复用，否则创建一个 */
  REQUIRED = 'REQUIRED',
}

export interface TransactionalParams {
  /** 事务传播方式，默认 REQUIRED */
  propagation?: PropagationType;
}
