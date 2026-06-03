import mm from 'egg-mock';
import path from 'node:path';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const pluginRoot = process.cwd();
const requireModule = createRequire(path.join(pluginRoot, 'package.json'));

describe('plugin/controller/test/mcp/mcpRequest.test.ts', () => {
  if (parseInt(process.versions.node.split('.')[0], 10) >= 18) {
    let app;

    before(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return pluginRoot;
      });
      app = mm.app({
        baseDir: path.join(pluginRoot, 'test/fixtures/apps/mcp-app'),
        framework: path.dirname(requireModule.resolve('egg')),
      });
      await app.ready();
    });

    after(async () => {
      if (app) {
        await app.close();
      }
      mm.restore();
    });

    it('should request default mcp server with app.mcpRequest()', async () => {
      const mcp = app.mcpRequest();

      const tools = await mcp.listTools();
      assert.deepEqual(tools.tools.map(tool => tool.name), [
        'start-notification-stream',
        'bar',
        'mockError',
        'echoUser',
        'traceTest',
      ]);

      const toolRes = await mcp.callTool('bar', {
        name: 'aaa',
      });
      assert.deepEqual(toolRes, {
        content: [{ type: 'text', text: 'npm package: aaa not found' }],
      });

      const userRes = await mcp.callTool('echoUser');
      assert.deepEqual(userRes, {
        content: [{ type: 'text', text: 'hello akita' }],
      });

      const traceRes = await mcp.callTool('traceTest');
      assert.deepEqual(traceRes, {
        content: [{ type: 'text', text: 'hello middleware' }],
      });

      const resources = await mcp.listResources();
      assert.deepEqual(resources.resources.map(resource => resource.name), [ 'egg', 'mcp' ]);

      const resourceRes = await mcp.readResource('mcp://npm/egg?version=4.10.0');
      assert.deepEqual(resourceRes, {
        contents: [{ uri: 'mcp://npm/egg?version=4.10.0', text: 'MOCK TEXT' }],
      });

      const prompts = await mcp.listPrompts();
      assert.deepEqual(prompts.prompts.map(prompt => prompt.name), [ 'foo' ]);

      const promptRes = await mcp.getPrompt('foo', {
        name: 'bbb',
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

      const client = await app.mcpRequest()
        .set('custom-session-id', 'mcp-request-session')
        .connect();
      try {
        assert.equal(client.protocol, 'streamable');
        assert.equal(client.transport.sessionId, 'mcp-request-session');
        assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), [
          'start-notification-stream',
          'bar',
          'mockError',
          'echoUser',
          'traceTest',
        ]);
      } finally {
        await client.close();
      }
    });

    it('should request named mcp server with app.mcpRequest(name)', async () => {
      const mcp = app.mcpRequest('test').authToken('test-user');

      const tools = await mcp.listTools();
      assert.deepEqual(tools.tools.map(tool => tool.name), [
        'test-start-notification-stream',
        'testBar',
        'testEchoUser',
        'testTraceTest',
      ]);

      const toolRes = await mcp.callTool('testBar', {
        name: 'aaa',
      });
      assert.deepEqual(toolRes, {
        content: [{ type: 'text', text: 'npm package: aaa not found' }],
      });

      const userRes = await mcp.callTool('testEchoUser');
      assert.deepEqual(userRes, {
        content: [{ type: 'text', text: 'hello test-user' }],
      });

      const traceRes = await mcp.callTool('testTraceTest');
      assert.deepEqual(traceRes, {
        content: [{ type: 'text', text: 'hello middleware' }],
      });

      const resources = await mcp.listResources();
      assert.deepEqual(resources.resources.map(resource => resource.name), [ 'testEgg', 'testMcp' ]);

      const resourceRes = await mcp.readResource('mcp://npm/testEgg?version=4.10.0');
      assert.deepEqual(resourceRes, {
        contents: [{ uri: 'mcp://npm/testEgg?version=4.10.0', text: 'MOCK TEXT' }],
      });

      const prompts = await mcp.listPrompts();
      assert.deepEqual(prompts.prompts.map(prompt => prompt.name), [ 'testFoo' ]);

      const promptRes = await mcp.getPrompt('testFoo', {
        name: 'bbb',
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

      const statelessTools = await app.mcpRequest('test').stateless().listTools();
      assert.deepEqual(statelessTools.tools.map(tool => tool.name), [
        'test-start-notification-stream',
        'testBar',
        'testEchoUser',
        'testTraceTest',
      ]);
    });
  }
});
