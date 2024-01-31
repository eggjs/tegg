import assert from 'assert';
import { TransactionMetadataUtil } from '../../src/util/TransactionMetadataUtil';
import { TransactionMetaBuilder } from '../../src/builder/TransactionMetaBuilder';
import { PropagationType } from '../../src/Common';
import { Foo, Bar, FooBar, BarFoo } from '../fixtures/transaction';
import { Transactional } from '../../src/decorator/Transactional';

describe('test/builder/TransactionMetaBuilder.test.ts', () => {

  it('should build meta data success', () => {
    assert.ok(TransactionMetadataUtil.isTransactionClazz(Foo));

    const fooBuilder = new TransactionMetaBuilder(Foo);
    assert.deepStrictEqual(fooBuilder.build(), [{
      propagation: PropagationType.REQUIRED,
      method: 'defaultPropagation',
      datasourceName: undefined,
    }, {
      propagation: PropagationType.REQUIRED,
      method: 'requiredPropagation',
      datasourceName: 'testDatasourceName1',
    }, {
      propagation: PropagationType.ALWAYS_NEW,
      method: 'alwaysNewPropagation',
      datasourceName: undefined,
    }]);

    assert.ok(TransactionMetadataUtil.isTransactionClazz(Bar));
    const barBuilder = new TransactionMetaBuilder(Bar);
    assert.deepStrictEqual(barBuilder.build(), [{
      propagation: PropagationType.REQUIRED,
      method: 'foo',
      datasourceName: 'datasourceName2',
    }, {
      propagation: PropagationType.ALWAYS_NEW,
      method: 'bar',
      datasourceName: undefined,
    }]);

    assert.ok(TransactionMetadataUtil.isTransactionClazz(FooBar));
    const fooBarBuilder = new TransactionMetaBuilder(FooBar);
    assert.deepStrictEqual(fooBarBuilder.build(), [{
      propagation: PropagationType.ALWAYS_NEW,
      method: 'foo',
      datasourceName: undefined,
    }]);

    const barFooBuilder = new TransactionMetaBuilder(BarFoo);
    assert.ok(!TransactionMetadataUtil.isTransactionClazz(BarFoo));
    assert.deepStrictEqual(barFooBuilder.build(), []);

    assert.throws(() => {
      Transactional({ propagation: 'xx' as PropagationType });
    }, new Error('unknown propagation type xx'));
  });

});
