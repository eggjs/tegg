const MCP_RE = /^\/mcp\//;

export default () => {

  const config = {
    security: {
      csrf: {
        ignore: MCP_RE,
      },
    },
  };

  return config;
};
