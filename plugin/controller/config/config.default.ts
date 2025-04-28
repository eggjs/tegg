import { randomUUID } from 'node:crypto';

export default () => {

  const config = {
    mcp: {
      sseInitPath: '/mcp/init',
      sseMessagePath: '/mcp/message',
      streamPath: '/mcp/stream',
      sessionIdGenerator: randomUUID,
    },
  };

  return config;
};
