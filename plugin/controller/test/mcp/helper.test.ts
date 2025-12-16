import {
  MCPResourceMeta,
  MCPToolMeta,
  MCPPromptMeta,
} from '@eggjs/controller-decorator';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as z from 'zod/v4';
import assert from 'assert';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('plugin/controller/test/mcp/mcp.test.ts', () => {

  if (parseInt(process.versions.node, 10) < 18) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MCPServerHelper } = require('../../lib/impl/mcp/MCPServerHelper');
  it('MCPServerHelper should work', async () => {
    const PromptType = {
      name: z.string(),
    };

    const ToolType = {
      name: z.string().describe('npm package name'),
    };

    const helper = new MCPServerHelper({
      name: 'test',
      version: '1.0.0',
      hooks: [],
    });

    const resourceMeta = new MCPResourceMeta({
      name: 'testResource',
      needAcl: false,
      middlewares: [],
      uri: 'mcp://npm/egg?version=4.10.0',
    });

    const toolMeta = new MCPToolMeta({
      name: 'testTool',
      needAcl: false,
      middlewares: [],
      detail: {
        argsSchema: ToolType,
        index: 0,
      },
    });

    const promptMeta = new MCPPromptMeta({
      name: 'testPrompt',
      needAcl: false,
      middlewares: [],
      description: 'description',
      title: 'title',
      detail: {
        argsSchema: PromptType,
        index: 0,
      },
    });

    const getOrCreateEggObject = () => ({ obj: {
      [promptMeta.name]: args => {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Generate a concise but descriptive commit message for these changes:\n\n${args.name}`,
              },
            },
          ],
        };
      },
      [toolMeta.name]: args => {
        return {
          content: [
            {
              type: 'text',
              text: `npm package: ${args.name} not found`,
            },
          ],
        };
      },
      [resourceMeta.name]: uri => {
        return {
          contents: [
            {
              uri: uri.toString(),
              text: 'MOCK TEXT',
            },
          ],
        };
      },
    } });

    await helper.mcpToolRegister(getOrCreateEggObject as any, { getMetaData: () => ({}) } as any, toolMeta);
    await helper.mcpResourceRegister(getOrCreateEggObject as any, { getMetaData: () => ({}) } as any, resourceMeta);
    await helper.mcpPromptRegister(getOrCreateEggObject as any, { getMetaData: () => ({}) } as any, promptMeta);

    const [ clientTransport, serverTransport ] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      {
        name: 'test client',
        version: '1.0',
      },
      {
        capabilities: {
          // tools: {},
        },
      },
    );

    await Promise.all([
      client.connect(clientTransport),
      helper.server.connect(serverTransport),
    ]);
    const tools = await client.listTools();

    assert.deepEqual(tools.tools.map(tool => ({ name: tool.name, description: tool.description })), [
      {
        description: undefined,
        name: 'testTool',
      },
    ]);

    const toolRes = await client.callTool({
      name: 'testTool',
      arguments: {
        name: 'aaa',
      },
    });
    assert.deepEqual(toolRes, {
      content: [{ type: 'text', text: 'npm package: aaa not found' }],
    });
    const resources = await client.listResources();
    assert.deepEqual(resources, {
      resources: [
        { uri: 'mcp://npm/egg?version=4.10.0', name: 'testResource' },
      ],
    });
    const resourceRes = await client.readResource({
      uri: 'mcp://npm/egg?version=4.10.0',
    });
    assert.deepEqual(resourceRes, {
      contents: [{ uri: 'mcp://npm/egg?version=4.10.0', text: 'MOCK TEXT' }],
    });
    const prompts = await client.listPrompts();
    assert.deepEqual(prompts, {
      prompts: [
        { name: 'testPrompt', arguments: [{ name: 'name', required: true, description: undefined }], description: 'description', title: 'title' },
      ],
    });

    const promptRes = await client.getPrompt({
      name: 'testPrompt',
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

    await clientTransport.close();

  });
});
