import mm from 'egg-mock';
import path from 'path';
import fs from 'fs/promises';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CallToolRequest, CallToolResultSchema, ListToolsRequest, ListToolsResultSchema, LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import assert from 'assert';

async function listTools(client: Client) {
  const toolsRequest: ListToolsRequest = {
    method: 'tools/list',
    params: {},
  };
  const toolsResult = await client.request(toolsRequest, ListToolsResultSchema);

  const tools: { name: string; description?: string; }[] = [];
  for (const tool of toolsResult.tools) {
    tools.push({
      name: tool.name,
      description: tool.description,
    });
  }
  return tools;
}
async function startNotificationTool(client: Client) {
  // Call the notification tool using reasonable defaults
  const request: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'start-notification-stream',
      arguments: {
        interval: 1000, // 1 second between notifications
        count: 5, // Send 5 notifications
      },
    },
  };
  const result = await client.request(request, CallToolResultSchema);

  const notifications: { text: string }[] = [];

  result.content.forEach(item => {
    if (item.type === 'text') {
      notifications.push({
        text: item.text,
      });
    } else {
      notifications.push({
        text: item.data!.toString(),
      });
    }
  });
  return notifications;
}

describe('plugin/controller/test/mcp/mcp.test.ts', () => {


  if (parseInt(process.version.slice(1, 3)) > 17) {
    let app;

    after(async () => {
      await app.close();
    });

    afterEach(() => {
      // mm.restore();
    });

    before(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return path.join(__dirname, '../..');
      });
      app = mm.app({
        baseDir: path.join(__dirname, '../fixtures/apps/mcp-app'),
        framework: path.dirname(require.resolve('egg')),
      });
      await app.ready();
    });

    after(() => {
      return app.close();
    });

    it('sse should work', async () => {
      const sseClient = new Client({
        name: 'sse-demo-client',
        version: '1.0.0',
      });
      const baseUrl = await app.httpRequest()
        .get('/mcp/init').url;
      const sseTransport = new SSEClientTransport(
        new URL(baseUrl),
        {
          authProvider: {
            get redirectUrl() { return 'http://localhost/callback'; },
            get clientMetadata() { return { redirect_uris: [ 'http://localhost/callback' ] }; },
            clientInformation: () => ({ client_id: 'test-client-id', client_secret: 'test-client-secret' }),
            tokens: () => {
              return {
                access_token: Buffer.from('akita').toString('base64'),
                token_type: 'Bearer',
              };
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            saveTokens: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            redirectToAuthorization: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            saveCodeVerifier: () => {},
            codeVerifier: () => '',
          },
        },
      );
      const sseNotifications: { level: string, data: string }[] = [];
      sseClient.setNotificationHandler(LoggingMessageNotificationSchema, notification => {
        sseNotifications.push({ level: notification.params.level, data: notification.params.data as string });
      });
      await sseClient.connect(sseTransport);
      // tool
      const tools = await listTools(sseClient);
      assert.deepEqual(tools, [
        {
          name: 'start-notification-stream',
          description: 'Starts sending periodic notifications for testing resumability',
        },
        {
          description: undefined,
          name: 'bar',
        },
        {
          description: undefined,
          name: 'echoUser',
        },
        {
          description: undefined,
          name: 'traceTest',
        },
      ]);

      const toolRes = await sseClient.callTool({
        name: 'bar',
        arguments: {
          name: 'aaa',
        },
      });
      assert.deepEqual(toolRes, {
        content: [{ type: 'text', text: 'npm package: aaa not found' }],
      });

      const userRes = await sseClient.callTool({
        name: 'echoUser',
        arguments: {},
      });
      assert.deepEqual(userRes, {
        content: [{ type: 'text', text: 'hello akita' }],
      });

      const traceRes = await sseClient.callTool({
        name: 'traceTest',
        arguments: {},
      });
      assert.deepEqual(traceRes, {
        content: [{ type: 'text', text: 'hello middleware' }],
      });
      // notification
      const notificationResp = await startNotificationTool(sseClient);
      await new Promise(resolve => setTimeout(resolve, 5000));
      assert.deepEqual(notificationResp, [{ text: 'Started sending periodic notifications every 1000ms' }]);
      assert.deepEqual(sseNotifications, [
        { level: 'info', data: 'Periodic notification #1' },
        { level: 'info', data: 'Periodic notification #2' },
        { level: 'info', data: 'Periodic notification #3' },
        { level: 'info', data: 'Periodic notification #4' },
        { level: 'info', data: 'Periodic notification #5' },
      ]);

      // resources
      const resources = await sseClient.listResources();
      assert.deepEqual(resources, {
        resources: [
          { uri: 'mcp://npm/egg?version=4.10.0', name: 'egg' },
          { uri: 'mcp://npm/mcp?version=0.10.0', name: 'mcp' },
        ],
      });

      const resourceRes = await sseClient.readResource({
        uri: 'mcp://npm/egg?version=4.10.0',
      });
      assert.deepEqual(resourceRes, {
        contents: [{ uri: 'mcp://npm/egg?version=4.10.0', text: 'MOCK TEXT' }],
      });

      // prompts
      const prompts = await sseClient.listPrompts();
      assert.deepEqual(prompts, {
        prompts: [
          { name: 'foo', arguments: [{ name: 'name', required: true }] },
        ],
      });

      const promptRes = await sseClient.getPrompt({
        name: 'foo',
        arguments: {
          name: 'bbb',
        },
      });
      assert.deepEqual(promptRes, {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Generate a concise but descriptive commit message for these changes:\n\nbbb',
            },
          },
        ],
      });
      await sseTransport.close();
    });

    it('streamable should work', async () => {
      const streamableClient = new Client({
        name: 'streamable-demo-client',
        version: '1.0.0',
      });
      const baseUrl = await app.httpRequest()
        .post('/mcp/stream').url;
      const streamableTransport = new StreamableHTTPClientTransport(
        new URL(baseUrl),
        {
          authProvider: {
            get redirectUrl() { return 'http://localhost/callback'; },
            get clientMetadata() { return { redirect_uris: [ 'http://localhost/callback' ] }; },
            clientInformation: () => ({ client_id: 'test-client-id', client_secret: 'test-client-secret' }),
            tokens: () => {
              return {
                access_token: Buffer.from('akita').toString('base64'),
                token_type: 'Bearer',
              };
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            saveTokens: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            redirectToAuthorization: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            saveCodeVerifier: () => {},
            codeVerifier: () => '',
          },
          requestInit: { headers: { 'custom-session-id': 'custom-session-id' } },
        },
      );
      const streamableNotifications: { level: string, data: string }[] = [];
      streamableClient.setNotificationHandler(LoggingMessageNotificationSchema, notification => {
        streamableNotifications.push({ level: notification.params.level, data: notification.params.data as string });
      });
      await streamableClient.connect(streamableTransport);
      // tool
      const tools = await listTools(streamableClient);
      assert.deepEqual(streamableTransport.sessionId, 'custom-session-id');
      assert.deepEqual(tools, [
        {
          name: 'start-notification-stream',
          description: 'Starts sending periodic notifications for testing resumability',
        },
        {
          description: undefined,
          name: 'bar',
        },
        {
          description: undefined,
          name: 'echoUser',
        },
        {
          description: undefined,
          name: 'traceTest',
        },
      ]);

      const toolRes = await streamableClient.callTool({
        name: 'bar',
        arguments: {
          name: 'aaa',
        },
      });
      assert.deepEqual(toolRes, {
        content: [{ type: 'text', text: 'npm package: aaa not found' }],
      });

      const userRes = await streamableClient.callTool({
        name: 'echoUser',
        arguments: {},
      });
      assert.deepEqual(userRes, {
        content: [{ type: 'text', text: 'hello akita' }],
      });

      const traceRes = await streamableClient.callTool({
        name: 'traceTest',
        arguments: {},
      });
      assert.deepEqual(traceRes, {
        content: [{ type: 'text', text: 'hello middleware' }],
      });
      // notification
      const notificationResp = await startNotificationTool(streamableClient);
      await new Promise(resolve => setTimeout(resolve, 5000));
      assert.deepEqual(notificationResp, [{ text: 'Started sending periodic notifications every 1000ms' }]);
      assert.deepEqual(streamableNotifications, [
        { level: 'info', data: 'Periodic notification #1' },
        { level: 'info', data: 'Periodic notification #2' },
        { level: 'info', data: 'Periodic notification #3' },
        { level: 'info', data: 'Periodic notification #4' },
        { level: 'info', data: 'Periodic notification #5' },
      ]);

      // resources
      const resources = await streamableClient.listResources();
      assert.deepEqual(resources, {
        resources: [
          { uri: 'mcp://npm/egg?version=4.10.0', name: 'egg' },
          { uri: 'mcp://npm/mcp?version=0.10.0', name: 'mcp' },
        ],
      });

      const resourceRes = await streamableClient.readResource({
        uri: 'mcp://npm/egg?version=4.10.0',
      });
      assert.deepEqual(resourceRes, {
        contents: [{ uri: 'mcp://npm/egg?version=4.10.0', text: 'MOCK TEXT' }],
      });

      // prompts
      const prompts = await streamableClient.listPrompts();
      assert.deepEqual(prompts, {
        prompts: [
          { name: 'foo', arguments: [{ name: 'name', required: true }] },
        ],
      });

      const promptRes = await streamableClient.getPrompt({
        name: 'foo',
        arguments: {
          name: 'bbb',
        },
      });
      assert.deepEqual(promptRes, {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Generate a concise but descriptive commit message for these changes:\n\nbbb',
            },
          },
        ],
      });

      await streamableTransport.terminateSession();
      await streamableClient.close();

      const logContent = await fs.readFile(path.join(__dirname, '../fixtures/apps/mcp-app/logs/mcp-app/mcp-app-web.log'));

      assert.ok(logContent.includes('startNotificationStream finish'));
    });

    it('stateless streamable should work', async () => {
      const streamableClient = new Client({
        name: 'streamable-demo-client',
        version: '1.0.0',
      });
      const baseUrl = await app.httpRequest()
        .post('/mcp/stateless/stream').url;
      const streamableTransport = new StreamableHTTPClientTransport(
        new URL(baseUrl),
        {
          authProvider: {
            get redirectUrl() { return 'http://localhost/callback'; },
            get clientMetadata() { return { redirect_uris: [ 'http://localhost/callback' ] }; },
            clientInformation: () => ({ client_id: 'test-client-id', client_secret: 'test-client-secret' }),
            tokens: () => {
              return {
                access_token: Buffer.from('akita').toString('base64'),
                token_type: 'Bearer',
              };
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            saveTokens: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            redirectToAuthorization: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            saveCodeVerifier: () => {},
            codeVerifier: () => '',
          },
        },
      );
      const streamableNotifications: { level: string, data: string }[] = [];
      streamableClient.setNotificationHandler(LoggingMessageNotificationSchema, notification => {
        streamableNotifications.push({ level: notification.params.level, data: notification.params.data as string });
      });
      await streamableClient.connect(streamableTransport);
      // tool
      const tools = await listTools(streamableClient);
      assert.deepEqual(tools, [
        {
          name: 'start-notification-stream',
          description: 'Starts sending periodic notifications for testing resumability',
        },
        {
          description: undefined,
          name: 'bar',
        },
        {
          description: undefined,
          name: 'echoUser',
        },
        {
          description: undefined,
          name: 'traceTest',
        },
      ]);

      const toolRes = await streamableClient.callTool({
        name: 'bar',
        arguments: {
          name: 'aaa',
        },
      });
      assert.deepEqual(toolRes, {
        content: [{ type: 'text', text: 'npm package: aaa not found' }],
      });

      const userRes = await streamableClient.callTool({
        name: 'echoUser',
        arguments: {},
      });
      assert.deepEqual(userRes, {
        content: [{ type: 'text', text: 'hello akita' }],
      });

      const traceRes = await streamableClient.callTool({
        name: 'traceTest',
        arguments: {},
      });
      assert.deepEqual(traceRes, {
        content: [{ type: 'text', text: 'hello middleware' }],
      });
      // notification
      const notificationResp = await startNotificationTool(streamableClient);
      await new Promise(resolve => setTimeout(resolve, 5000));
      assert.deepEqual(notificationResp, [{ text: 'Started sending periodic notifications every 1000ms' }]);
      assert.deepEqual(streamableNotifications, [
        { level: 'info', data: 'Periodic notification #1' },
        { level: 'info', data: 'Periodic notification #2' },
        { level: 'info', data: 'Periodic notification #3' },
        { level: 'info', data: 'Periodic notification #4' },
        { level: 'info', data: 'Periodic notification #5' },
      ]);

      // resources
      const resources = await streamableClient.listResources();
      assert.deepEqual(resources, {
        resources: [
          { uri: 'mcp://npm/egg?version=4.10.0', name: 'egg' },
          { uri: 'mcp://npm/mcp?version=0.10.0', name: 'mcp' },
        ],
      });

      const resourceRes = await streamableClient.readResource({
        uri: 'mcp://npm/egg?version=4.10.0',
      });
      assert.deepEqual(resourceRes, {
        contents: [{ uri: 'mcp://npm/egg?version=4.10.0', text: 'MOCK TEXT' }],
      });

      // prompts
      const prompts = await streamableClient.listPrompts();
      assert.deepEqual(prompts, {
        prompts: [
          { name: 'foo', arguments: [{ name: 'name', required: true }] },
        ],
      });

      const promptRes = await streamableClient.getPrompt({
        name: 'foo',
        arguments: {
          name: 'bbb',
        },
      });
      assert.deepEqual(promptRes, {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Generate a concise but descriptive commit message for these changes:\n\nbbb',
            },
          },
        ],
      });

      await streamableTransport.terminateSession();
      await streamableClient.close();
    });
  }
});
