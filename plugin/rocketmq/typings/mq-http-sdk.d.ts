declare module '@aliyunmq/mq-http-sdk' {
  interface ReceiptHandle {}
  interface ConsumeMessageResponse {
    requestId: string;
    code: number;
    body: ConsumeMessageResponseBody[];
  }
  interface ConsumeMessageResponseBody {
    MessageId: string;
    MessageTag: string;
    PublishTime: string;
    NextConsumeTime: string;
    FirstConsumeTime: string;
    ConsumedTimes: string;
    MessageBody: string;
    MessageKey:string;
    Properties: any;
    ReceiptHandle: ReceiptHandle;
  }
  interface AckMessageResponse {
    requestId: string;
    code: number;
    body: ConsumeMessageResponseBody[];
  }
  interface ConsumeMessageResponseBody {
    MessageId: string;
    ReceiptHandle: ReceiptHandle;
    ErrorCode: string;
    ErrorMessage: string;
  }
  declare class MQClient {
    constructor(endpint: string, accessKeyId: string, accessKeySecret: string);
    getProducer(instanceId, topic): MQProducer;
    getConsumer(instanceId: string, topic: string, groupId: string): MQConsumer;
  }
  declare class MQProducer {

  }
  declare class MQConsumer {
    consumeMessage(numOfMessages: number, waitSeconds: number): Promise<ConsumeMessageResponse>;
    ackMessage(handles: ReceiptHandle[]): Promise<AckMessageResponse>;
  }
  declare class MessageProperties {
    putProperty(key: string, value: any);
    messageKey(key: string);
  }
}
