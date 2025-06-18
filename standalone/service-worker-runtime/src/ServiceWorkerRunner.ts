import { SingletonProto, Inject, EggObjectFactory } from '@eggjs/tegg';
import { Runner, AbstractEventHandler } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class ServiceWorkerRunner {
  @Inject()
  private readonly event: Event;
  @Inject()
  private readonly eggObjectFactory: EggObjectFactory;

  async main(): Promise<unknown> {
    const handler = await this.eggObjectFactory.getEggObject(AbstractEventHandler, this.event.type);
    return await handler.handleEvent(this.event);
  }
}
