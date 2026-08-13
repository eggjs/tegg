export default () => {

  const config = {
    mcp: {
      proxyPort: 17031,
      /**
       * Timeout in milliseconds for connecting to the cluster-client leader.
       * Leave it undefined to use cluster-client's default configuration.
       */
      proxyConnectTimeout: undefined as number | undefined,
    },
  };

  return config;
};
