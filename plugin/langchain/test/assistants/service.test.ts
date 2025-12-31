import assert from 'assert';
import { AssistantsInitService } from '../../lib/assistants/AssistantsInitService';
import { AssistantsRepository } from '../../lib/assistants/AssistantsRepository';
import { GraphInfoUtil } from '@eggjs/tegg-langchain-decorator';
import { v5 as uuidv5, parse as uuidParse } from 'uuid';

const NAMESPACE_GRAPH = uuidParse('6ba7b821-9dad-11d1-80b4-00c04fd430c8');

describe('test/assistants/service.test.ts', () => {
  let service: AssistantsInitService;
  let repo: AssistantsRepository;

  beforeEach(() => {
    service = new AssistantsInitService();
    repo = new AssistantsRepository();

    // 手动注入依赖
    (service as any).assistantsRepository = repo;
    (service as any).moduleConfigs = new Map();
  });

  describe('AssistantsInitService.getAssistantId', () => {
    it('should generate consistent assistant_id for same graph_id', () => {
      const graphId = 'test-graph';
      const assistantId1 = service.getAssistantId(graphId);
      const assistantId2 = service.getAssistantId(graphId);

      assert.strictEqual(assistantId1, assistantId2);
    });

    it('should generate different assistant_id for different graph_id', () => {
      const assistantId1 = service.getAssistantId('graph-1');
      const assistantId2 = service.getAssistantId('graph-2');

      assert.notStrictEqual(assistantId1, assistantId2);
    });

    it('should use uuid v5 with NAMESPACE_GRAPH', () => {
      const graphId = 'my-graph';
      const expected = uuidv5(graphId, NAMESPACE_GRAPH);
      const actual = service.getAssistantId(graphId);

      assert.strictEqual(actual, expected);
    });

    it('should generate valid UUID format', () => {
      const assistantId = service.getAssistantId('test-graph');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      assert(uuidRegex.test(assistantId), `${assistantId} should be a valid UUID v5`);
    });
  });

  describe('AssistantsInitService.getAssistant', () => {
    it('should get assistant by id', async () => {
      const assistantId = service.getAssistantId('test-graph');
      await repo.put(assistantId, {
        graph_id: 'test-graph',
        name: 'Test',
        if_exists: 'raise',
      });

      const assistant = await service.getAssistant(assistantId);
      assert(assistant);
      assert.strictEqual(assistant.assistant_id, assistantId);
    });

    it('should return null for non-existent assistant', async () => {
      const assistant = await service.getAssistant('non-existent');
      assert.strictEqual(assistant, null);
    });
  });

  describe('AssistantsInitService.getAssistantByGraphId', () => {
    it('should get assistant by graph_id', async () => {
      const assistantId = service.getAssistantId('test-graph');
      await repo.put(assistantId, {
        graph_id: 'test-graph',
        name: 'Test',
        if_exists: 'raise',
      });

      const assistant = await service.getAssistantByGraphId('test-graph');
      assert(assistant);
      assert.strictEqual(assistant.graph_id, 'test-graph');
    });

    it('should return null for non-existent graph_id', async () => {
      const assistant = await service.getAssistantByGraphId('non-existent');
      assert.strictEqual(assistant, null);
    });
  });

  describe('AssistantsInitService - GraphInfoUtil Integration', () => {
    it('should register graphs from GraphInfoUtil', async () => {
      const originalGetAllGraphMetadata = GraphInfoUtil.getAllGraphMetadata;
      const mockGraphMap = new Map();
      mockGraphMap.set(class TestGraph {}, {
        name: 'TestGraph',
        nodes: [],
        edges: [],
      });

      GraphInfoUtil.getAllGraphMetadata = () => mockGraphMap;

      try {
        await (service as any).registerGraphsFromUtil();

        const assistantId = service.getAssistantId('TestGraph');
        const assistant = await repo.get(assistantId);

        assert(assistant);
        assert.strictEqual(assistant.graph_id, 'TestGraph');
        assert.strictEqual(assistant.name, 'TestGraph');
        assert.strictEqual(assistant.metadata.source, 'GraphInfoUtil');
        assert.strictEqual(assistant.metadata.created_by, 'system');
      } finally {
        GraphInfoUtil.getAllGraphMetadata = originalGetAllGraphMetadata;
      }
    });

    it('should skip graphs without name', async () => {
      const originalGetAllGraphMetadata = GraphInfoUtil.getAllGraphMetadata;
      const mockGraphMap = new Map();
      mockGraphMap.set(class TestGraph {}, {
        nodes: [],
        edges: [],
      });

      GraphInfoUtil.getAllGraphMetadata = () => mockGraphMap;

      try {
        await (service as any).registerGraphsFromUtil();

        const all = repo.getAll();
        assert.strictEqual(all.length, 0);
      } finally {
        GraphInfoUtil.getAllGraphMetadata = originalGetAllGraphMetadata;
      }
    });

    it('should use do_nothing for duplicate registrations', async () => {
      const originalGetAllGraphMetadata = GraphInfoUtil.getAllGraphMetadata;
      const mockGraphMap = new Map();
      mockGraphMap.set(class TestGraph {}, {
        name: 'TestGraph',
        nodes: [],
        edges: [],
      });

      GraphInfoUtil.getAllGraphMetadata = () => mockGraphMap;

      try {
        await (service as any).registerGraphsFromUtil();

        const assistantId = service.getAssistantId('TestGraph');
        const first = await repo.get(assistantId);

        await (service as any).registerGraphsFromUtil();

        const second = await repo.get(assistantId);

        assert(first);
        assert(second);
        assert.strictEqual(first.version, second.version);
        assert.strictEqual(first.created_at.getTime(), second.created_at.getTime());
      } finally {
        GraphInfoUtil.getAllGraphMetadata = originalGetAllGraphMetadata;
      }
    });
  });

  describe('AssistantsInitService - ModuleConfigs Integration', () => {
    it('should register graphs from moduleConfigs', async () => {
      const moduleConfigs = new Map();
      moduleConfigs.set('testModule', {
        config: {
          agents: {
            AgentGraph1: { foo: 'bar' },
            AgentGraph2: { baz: 'qux' },
          },
        },
      });

      (service as any).moduleConfigs = moduleConfigs;

      await (service as any).registerGraphsFromModuleConfigs();

      const assistant1 = await service.getAssistantByGraphId('AgentGraph1');
      const assistant2 = await service.getAssistantByGraphId('AgentGraph2');

      assert(assistant1);
      assert.strictEqual(assistant1.graph_id, 'AgentGraph1');
      assert.strictEqual(assistant1.metadata.source, 'moduleConfigs');
      assert.strictEqual(assistant1.metadata.module, 'testModule');
      assert.deepStrictEqual(assistant1.config, { foo: 'bar' });

      assert(assistant2);
      assert.strictEqual(assistant2.graph_id, 'AgentGraph2');
      assert.deepStrictEqual(assistant2.config, { baz: 'qux' });
    });

    it('should skip modules without agents config', async () => {
      const moduleConfigs = new Map();
      moduleConfigs.set('module1', {
        config: {
          someOtherConfig: 'value',
        },
      });
      moduleConfigs.set('module2', {
        config: {
          agents: {
            TestAgent: {},
          },
        },
      });

      (service as any).moduleConfigs = moduleConfigs;

      await (service as any).registerGraphsFromModuleConfigs();

      const all = repo.getAll();
      assert.strictEqual(all.length, 1);
      assert.strictEqual(all[0].graph_id, 'TestAgent');
    });

    it('should handle empty agents object', async () => {
      const moduleConfigs = new Map();
      moduleConfigs.set('testModule', {
        config: {
          agents: {},
        },
      });

      (service as any).moduleConfigs = moduleConfigs;

      await (service as any).registerGraphsFromModuleConfigs();

      const all = repo.getAll();
      assert.strictEqual(all.length, 0);
    });
  });

  describe('AssistantsInitService.init', () => {
    it('should register graphs from both sources', async () => {
      const originalGetAllGraphMetadata = GraphInfoUtil.getAllGraphMetadata;
      const mockGraphMap = new Map();
      mockGraphMap.set(class UtilGraph {}, {
        name: 'UtilGraph',
        nodes: [],
        edges: [],
      });
      GraphInfoUtil.getAllGraphMetadata = () => mockGraphMap;

      const moduleConfigs = new Map();
      moduleConfigs.set('testModule', {
        config: {
          agents: {
            ConfigGraph: {},
          },
        },
      });
      (service as any).moduleConfigs = moduleConfigs;

      try {
        await (service as any).init();

        const all = repo.getAll();
        assert.strictEqual(all.length, 2);

        const utilGraph = await service.getAssistantByGraphId('UtilGraph');
        const configGraph = await service.getAssistantByGraphId('ConfigGraph');

        assert(utilGraph);
        assert.strictEqual(utilGraph.metadata.source, 'GraphInfoUtil');

        assert(configGraph);
        assert.strictEqual(configGraph.metadata.source, 'moduleConfigs');
      } finally {
        GraphInfoUtil.getAllGraphMetadata = originalGetAllGraphMetadata;
      }
    });
  });
});
