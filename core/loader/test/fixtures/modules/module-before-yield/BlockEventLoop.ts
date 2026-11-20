import { Prototype } from '@eggjs/core-decorator';

(global as any).__teggLoaderEventLoopYielded = false;
setImmediate(() => {
  (global as any).__teggLoaderEventLoopYielded = true;
});

const blockUntil = Date.now() + 20;
while (Date.now() < blockUntil) {
  // Simulate expensive synchronous module evaluation.
}

@Prototype()
export class BlockEventLoop {
}
