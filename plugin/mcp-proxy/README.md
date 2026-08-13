# @eggjs/mcp-Proxy

## Usage

```js
// plugin.js
export.mcpProxy = {
  enable: true,
  package: '@eggjs/mcp-Proxy',
};
```

### Configuration

```js
// config/config.default.js
exports.mcp = {
  // Timeout in milliseconds for connecting to the cluster-client leader.
  // Defaults to cluster-client's configuration (10 seconds by default).
  proxyConnectTimeout: 30000,
};
```
