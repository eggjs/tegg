import 'egg';
import '@eggjs/tegg-plugin';
import * as dns from 'node:dns';
import { DnsResolver, DnsCacheRecord } from '../lib';
export { DnsResolver, DnsCacheRecord };
export * from '../lib/agent';

declare module 'egg' {
  interface TeggDnsCacheApplication {
    /**
     * DNS resolver instance, provides DNS caching capabilities
     */
    dnsResolver: DnsResolver;
  }

  interface Application extends TeggDnsCacheApplication {}

  interface EggAppConfig {
    /**
     * DNS Cache Configuration
     */
    dnsCache: {
      /** Use dns.lookup or dns.resolve, default is 'resolve' */
      mode?: 'lookup' | 'resolve';
      /** Custom DNS nameservers for dns.resolve mode */
      dnsServers?: string[];
      /** Maximum number of DNS cache entries, default is 1000 */
      maxCacheLength?: number;
      /** DNS cache lookup interval in milliseconds, default is 10000 */
      lookupInterval?: number;
      /** Enable round-robin address rotation, default is true */
      addressRotation?: boolean;
      /** HTTP client connect options */
      debug?: boolean;
    };
  }
}
