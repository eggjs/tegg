import { AccessLevel } from '@eggjs/tegg';
import { AbstractEventHandler, EventHandlerProto } from '@eggjs/tegg/standalone';
import { CustomEvent } from './Event';

@EventHandlerProto('custom', { accessLevel: AccessLevel.PUBLIC })
export class FetchEventHandler extends AbstractEventHandler<CustomEvent, string> {
  async handleEvent(event: CustomEvent): Promise<string> {
    return 'hello:' + JSON.stringify(event.data);
  }
}
