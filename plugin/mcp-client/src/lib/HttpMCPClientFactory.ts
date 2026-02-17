import {
  AccessLevel,
  Inject,
  SingletonProto,
} from '@eggjs/tegg';
import type { Logger } from '@eggjs/tegg';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import type { HttpClientOptions } from '@eggjs/mcp-client';
import { EggHttpMCPClient } from './EggHttpMCPClient.ts';
import { fetch } from 'urllib';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'httpMcpClientFactory',
})
export class HttpMCPClientFactory {
  @Inject()
  private readonly logger: Logger;


  async build(clientInfo: Implementation, options: Omit<HttpClientOptions, 'logger'>): Promise<EggHttpMCPClient> {
    const httpMCPClient = new EggHttpMCPClient({
      clientName: clientInfo.name,
      clientVersion: clientInfo.version,
      fetch,
      ...options as HttpClientOptions,
      logger: this.logger,
    });
    await httpMCPClient.init();
    return httpMCPClient;
  }
}
