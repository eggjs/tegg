import { Transactional } from '../../src/decorator/Transactional';
import { PropagationType } from '../../src/Common';

export class Foo {

  @Transactional()
  async defaultPropagation(msg) {
    console.log('msg: ', msg);
  }

  @Transactional({})
  async requiredPropagation(msg) {
    console.log('msg: ', msg);
  }

  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async alwaysNewPropagation(msg) {
    console.log('msg: ', msg);
  }

}

export class Bar {

  @Transactional()
  async foo(msg) {
    console.log('msg: ', msg);
  }

  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async bar(msg) {
    console.log('msg: ', msg);
  }

}

export class FooBar {

  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async foo(msg) {
    console.log('msg: ', msg);
  }

}

export class BarFoo {

  async foo(msg) {
    console.log('msg: ', msg);
  }

}
