import { ContextProto } from '@eggjs/core-decorator';
import { Advice, AdviceContext, IAdvice } from '../../src/decorator/Advice';
import { Pointcut } from '../../src/decorator/Pointcut';
import { Crosscut } from '../../src/decorator/Crosscut';
import { PointcutType } from '../../src/model/PointcutInfo';

@Advice()
export class PointcutAdviceNoOverwriteParentExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@Advice()
export class PointcutAdviceOverwriteParentExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@Advice()
export class PointcutAdviceOverwriteChildExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@ContextProto()
export class ParentExample {
  @Pointcut(PointcutAdviceOverwriteParentExample)
  overwriteMethod() {

  }

  @Pointcut(PointcutAdviceNoOverwriteParentExample)
  noOverwriteMethod() {

  }
}

@ContextProto()
export class ChildExample extends ParentExample {
  @Pointcut(PointcutAdviceOverwriteChildExample)
  overwriteMethod() {

  }
}

@Advice()
@Crosscut({
  type: PointcutType.CLASS,
  clazz: ParentExample,
  methodName: 'noOverwriteMethod',
})
export class CrosscutNoOverwriteParentExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@Advice()
@Crosscut({
  type: PointcutType.CLASS,
  clazz: ParentExample,
  methodName: 'overwriteMethod',
})
export class CrosscutOverwriteParentExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@Advice()
@Crosscut({
  type: PointcutType.CLASS,
  clazz: ChildExample,
  methodName: 'overwriteMethod',
})
export class CrosscutOverwriteChildExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

