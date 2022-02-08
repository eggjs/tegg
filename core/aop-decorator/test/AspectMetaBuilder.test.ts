import { CrosscutAdviceFactory } from '../src/CrosscutAdviceFactory';
import {
  CrosscutClassAdviceExample,
  CrosscutCustomAdviceExample, CrosscutExample,
  CrosscutNameAdviceExample,
} from './fixtures/CrosscutExample';
import {
  GetterExample,
  PointcutAdviceAfterReturnExample,
  PointcutAdviceBeforeCallExample,
  PointcutExample,
} from './fixtures/PointcutExample';
import { AspectMetaBuilder } from '../src/AspectMetaBuilder';
import assert from 'assert';
import {
  ChildExample,
  CrosscutNoOverwriteParentExample,
  CrosscutOverwriteChildExample,
  CrosscutOverwriteParentExample, ParentExample,
  PointcutAdviceNoOverwriteParentExample,
  PointcutAdviceOverwriteChildExample,
  PointcutAdviceOverwriteParentExample,
} from './fixtures/InheritExample';

describe('test/AspectMetaBuild.test.ts', () => {
  const crosscutAdviceFactory = new CrosscutAdviceFactory();
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutClassAdviceExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutNameAdviceExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutCustomAdviceExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutOverwriteParentExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutOverwriteChildExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutNoOverwriteParentExample);

  describe('Pointcut', () => {
    it('should work', () => {
      const builder = new AspectMetaBuilder(PointcutExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 1);
      const aspect = aspects[0];
      assert(aspect.clazz === PointcutExample);
      assert(aspect.method === 'hello');
      const advices = aspect.adviceList;

      assert.deepStrictEqual(advices, [
        { name: 'PointcutExample#hello#PointcutAdviceBeforeCallExample#0', clazz: PointcutAdviceBeforeCallExample },
        { name: 'PointcutExample#hello#PointcutAdviceAfterReturnExample#1', clazz: PointcutAdviceAfterReturnExample },
      ]);
    });
  });

  describe('Crosscut', () => {
    it('should work', () => {
      const builder = new AspectMetaBuilder(CrosscutExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 1);
      const aspect = aspects[0];
      assert(aspect.clazz === CrosscutExample);
      assert(aspect.method === 'hello');
      const advices = aspect.adviceList;
      assert.deepStrictEqual(advices, [
        { name: 'CrosscutExample#hello#CrosscutClassAdviceExample#0', clazz: CrosscutClassAdviceExample },
        { name: 'CrosscutExample#hello#CrosscutNameAdviceExample#1', clazz: CrosscutNameAdviceExample },
        { name: 'CrosscutExample#hello#CrosscutCustomAdviceExample#2', clazz: CrosscutCustomAdviceExample },
      ]);
    });
  });

  describe('inherit', () => {
    it('child should work', () => {
      const builder = new AspectMetaBuilder(ChildExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 2);
      const overwriteAspect = aspects.find(t => t.method === 'overwriteMethod');
      assert(overwriteAspect);
      assert(overwriteAspect.clazz === ChildExample);
      const overwriteAdvices = overwriteAspect.adviceList;

      assert.deepStrictEqual(overwriteAdvices, [
        { name: 'ChildExample#overwriteMethod#CrosscutOverwriteParentExample#0', clazz: CrosscutOverwriteParentExample },
        { name: 'ChildExample#overwriteMethod#CrosscutOverwriteChildExample#1', clazz: CrosscutOverwriteChildExample },
        // FIXME: parent/child should has correct order
        { name: 'ChildExample#overwriteMethod#PointcutAdviceOverwriteChildExample#2', clazz: PointcutAdviceOverwriteChildExample },
        { name: 'ChildExample#overwriteMethod#PointcutAdviceOverwriteParentExample#3', clazz: PointcutAdviceOverwriteParentExample },
      ]);

      const noOverwriteAspect = aspects.find(t => t.method === 'noOverwriteMethod');
      assert(noOverwriteAspect);
      assert(noOverwriteAspect.clazz === ChildExample);
      const noOverwriteAdvices = noOverwriteAspect.adviceList;
      assert.deepStrictEqual(noOverwriteAdvices, [
        { name: 'ChildExample#noOverwriteMethod#CrosscutNoOverwriteParentExample#0', clazz: CrosscutNoOverwriteParentExample },
        { name: 'ChildExample#noOverwriteMethod#PointcutAdviceNoOverwriteParentExample#1', clazz: PointcutAdviceNoOverwriteParentExample },
      ]);
    });

    it('parent should work', () => {
      const builder = new AspectMetaBuilder(ParentExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 2);

      const overwriteAspect = aspects.find(t => t.method === 'overwriteMethod');
      assert(overwriteAspect);
      assert(overwriteAspect.clazz === ParentExample);
      const overwriteAdvices = overwriteAspect.adviceList;
      assert.deepStrictEqual(overwriteAdvices, [
        { name: 'ParentExample#overwriteMethod#CrosscutOverwriteParentExample#0', clazz: CrosscutOverwriteParentExample },
        { name: 'ParentExample#overwriteMethod#PointcutAdviceOverwriteParentExample#1', clazz: PointcutAdviceOverwriteParentExample },
      ]);

      const noOverwriteAspect = aspects.find(t => t.method === 'noOverwriteMethod');
      assert(noOverwriteAspect);
      assert(noOverwriteAspect.clazz === ParentExample);
      const noOverwriteAdvices = noOverwriteAspect.adviceList;
      assert.deepStrictEqual(noOverwriteAdvices, [
        { name: 'ParentExample#noOverwriteMethod#CrosscutNoOverwriteParentExample#0', clazz: CrosscutNoOverwriteParentExample },
        { name: 'ParentExample#noOverwriteMethod#PointcutAdviceNoOverwriteParentExample#1', clazz: PointcutAdviceNoOverwriteParentExample },
      ]);
    });
  });

  it('should not access getter', () => {
    const builder = new AspectMetaBuilder(GetterExample, {
      crosscutAdviceFactory,
    });
    const aspects = builder.build();
    assert(aspects.length === 1);
  });
});
