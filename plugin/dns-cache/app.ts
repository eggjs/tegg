import { Application } from 'egg';
import { DnsResolver } from './lib/DnsResolver';

export default class DnsCacheAppHook {
  private readonly app: Application;
  private dnsResolver: DnsResolver;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    if (!this.app.config.dnsCache) {
      this.app.logger.warn(
        '[tegg-dns-cache-plugin] DNS cache is disabled, please setup dnsCache config.',
      );
    }
  }

  async configDidLoad() {
    const config = this.app.config.dnsCache || {};

    // Get or create dedicated logger for DNS cache plugin
    // If custom logger not configured, fallback to app logger
    const dnsCacheLogger =
      this.app.getLogger('dnsCacheLogger') || this.app.logger;

    // Create DNS resolver instance
    const useDNSResolver = config.mode !== 'lookup';
    this.dnsResolver = new DnsResolver(
      {
        useResolver: useDNSResolver,
        servers: config.dnsServers,
        max: config.maxCacheLength || 1000,
        dnsCacheLookupInterval: config.lookupInterval || 10000,
        addressRotation: config.addressRotation !== false,
      },
      { logger: dnsCacheLogger },
    );

    const lookupFunction = this.dnsResolver.getLookupFunction();
    this.app.config.httpclient = this.app.config.httpclient || {};
    this.app.config.httpclient.lookup = lookupFunction;

    // Add dnsResolver to app
    this.app.dnsResolver = this.dnsResolver;
  }

  async didLoad() {
    await this.app.moduleHandler.ready();
  }

  beforeClose() {
    // Cleanup DNS cache resources
    if (this.app.dnsResolver) {
      this.app.dnsResolver.resetCache();
    }
  }
}
