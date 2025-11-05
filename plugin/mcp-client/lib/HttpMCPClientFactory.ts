import {
  AccessLevel,
  Inject,
  Logger,
  SingletonProto,
} from '@eggjs/tegg';
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import {
  HttpClientOptions,
} from '@eggjs/mcp-client';
import type { EggApplication } from 'egg';
import { EggHttpMCPClient } from './EggHttpMCPClient';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'httpMcpClientFactory',
})
export class HttpMCPClientFactory {
  @Inject()
  private readonly logger: Logger;
  @Inject()
  private readonly FetchFactory: EggApplication['FetchFactory'];


  async build(clientInfo: Implementation, options: Omit<HttpClientOptions, 'logger'>): Promise<EggHttpMCPClient> {
    const httpMCPClient = new EggHttpMCPClient({
      clientName: clientInfo.name,
      clientVersion: clientInfo.version,
      fetch: this.FetchFactory.fetch,
      ...options as HttpClientOptions,
      logger: this.logger,
    });
    await httpMCPClient.init();
    return httpMCPClient;
  }
}
