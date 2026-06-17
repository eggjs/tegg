import assert from 'assert';
import { ControllerType } from '@eggjs/tegg-types';
import { MCPFooController, ToolType, PromptType } from './fixtures/MCPController';
import { ControllerMetaBuilderFactory, MCPControllerMeta } from '..';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('test/MCPMeta.test.ts', () => {
  it('should work', () => {
    const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(MCPFooController, ControllerType.MCP)!;
    const fooControllerMetaData = builder.build()! as MCPControllerMeta;
    assert(fooControllerMetaData);
    assert(fooControllerMetaData.type === ControllerType.MCP);
    assert(fooControllerMetaData.name === 'HelloChairMCP');
    assert(fooControllerMetaData.version === '1.0.0');
    assert(fooControllerMetaData.protoName === 'mCPFooController');
    assert(fooControllerMetaData.controllerName === 'MCPFooController');
    assert(fooControllerMetaData.className === 'MCPFooController');
    assert(fooControllerMetaData.prompts[0].name === 'foo');
    assert(fooControllerMetaData.tools[0].name === 'bar');
    assert(fooControllerMetaData.resources[0].name === 'car');
    assert(fooControllerMetaData.resources[0].template instanceof ResourceTemplate);
    assert.strictEqual(fooControllerMetaData.tools[0].detail?.argsSchema as unknown, ToolType);
    assert.strictEqual(fooControllerMetaData.prompts[0].detail?.argsSchema as unknown, PromptType);
    assert(fooControllerMetaData.prompts[0].contextParamIndex === 0);
    assert(fooControllerMetaData.tools[0].contextParamIndex === 1);
    assert(fooControllerMetaData.resources[0].contextParamIndex === 1);
    assert(fooControllerMetaData.timeout === 60000);
  });
});
