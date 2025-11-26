import {
  MCPController,
  ToolArgs,
  MCPToolResponse,
  MCPTool,
  ToolExtra,
  ToolArgsSchema,
  Extra,
  Logger,
  Inject,
} from '@eggjs/tegg';
import * as z from 'zod/v4';

export const NotificationType = {
  interval: z
    .number()
    .describe('Interval in milliseconds between notifications')
    .default(100),
  count: z
    .number()
    .describe('Number of notifications to send (0 for 100)')
    .default(50),
};

@MCPController({
  name: 'test',
})
export class TestAppController {
  @Inject()
  logger: Logger;

  @MCPTool({
    name: 'test-start-notification-stream',
    description:
      'Starts sending periodic notifications for testing resumability',
  })
  async startNotificationStream(@ToolArgsSchema(NotificationType) args: ToolArgs<typeof NotificationType>, @Extra() extra :ToolExtra): Promise<MCPToolResponse> {
    const { interval, count } = args;
    const { sendNotification } = extra;
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let counter = 0;

    while (count === 0 || counter < count) {
      counter++;
      try {
        await sendNotification({
          method: 'notifications/message',
          params: {
            level: 'info',
            data: `Periodic notification #${counter}`,
          },
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
      await sleep(interval);
    }

    this.logger.info('startNotificationStream finish');

    return {
      content: [
        {
          type: 'text',
          text: `Started sending periodic notifications every ${interval}ms`,
        },
      ],
    };
  }
}
