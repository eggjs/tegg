import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';

interface Tracer {
  traceId: string;
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class TraceService {
  @Inject()
  tracer: Tracer;

  getTraceId(): string {
    return this.tracer.traceId;
  }
}
