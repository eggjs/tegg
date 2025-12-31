import assert from 'assert';
import { AssistantsRepository } from '../../lib/assistants/AssistantsRepository';

describe('test/assistants/repository.test.ts', () => {
  let repo: AssistantsRepository;

  beforeEach(() => {
    repo = new AssistantsRepository();
  });

  describe('AssistantsRepository.put', () => {
    it('should create a new assistant', async () => {
      const assistantId = 'test-assistant-id';
      const options = {
        graph_id: 'test-graph',
        name: 'Test Assistant',
        description: 'Test Description',
        config: { tags: [ 'test' ] },
        context: { foo: 'bar' },
        metadata: { created_by: 'test' },
        if_exists: 'raise' as const,
      };

      const assistant = await repo.put(assistantId, options);

      assert.strictEqual(assistant.assistant_id, assistantId);
      assert.strictEqual(assistant.graph_id, 'test-graph');
      assert.strictEqual(assistant.name, 'Test Assistant');
      assert.strictEqual(assistant.description, 'Test Description');
      assert.deepStrictEqual(assistant.config, { tags: [ 'test' ] });
      assert.deepStrictEqual(assistant.context, { foo: 'bar' });
      assert.deepStrictEqual(assistant.metadata, { created_by: 'test' });
      assert.strictEqual(assistant.version, 1);
      assert(assistant.created_at instanceof Date);
      assert(assistant.updated_at instanceof Date);
    });

    it('should use graph_id as name if name not provided', async () => {
      const assistant = await repo.put('test-id', {
        graph_id: 'my-graph',
        if_exists: 'raise',
      });

      assert.strictEqual(assistant.name, 'my-graph');
    });

    it('should throw error if assistant exists and if_exists=raise', async () => {
      await repo.put('test-id', {
        graph_id: 'test-graph',
        if_exists: 'raise',
      });

      await assert.rejects(
        async () => {
          await repo.put('test-id', {
            graph_id: 'test-graph',
            if_exists: 'raise',
          });
        },
        { message: 'Assistant with id "test-id" already exists' },
      );
    });

    it('should return existing assistant if if_exists=do_nothing', async () => {
      const first = await repo.put('test-id', {
        graph_id: 'test-graph',
        name: 'First',
        if_exists: 'raise',
      });

      const second = await repo.put('test-id', {
        graph_id: 'test-graph',
        name: 'Second',
        if_exists: 'do_nothing',
      });

      assert.strictEqual(second.assistant_id, first.assistant_id);
      assert.strictEqual(second.name, 'First');
      assert.strictEqual(second.version, first.version);
    });

    it('should set description to null if not provided', async () => {
      const assistant = await repo.put('test-id', {
        graph_id: 'test-graph',
        if_exists: 'raise',
      });

      assert.strictEqual(assistant.description, null);
    });

    it('should index by graph_id', async () => {
      await repo.put('assistant-1', {
        graph_id: 'graph-1',
        if_exists: 'raise',
      });

      const found = await repo.getByGraphId('graph-1');
      assert(found);
      assert.strictEqual(found.assistant_id, 'assistant-1');
    });
  });

  describe('AssistantsRepository.get', () => {
    it('should return assistant by id', async () => {
      await repo.put('test-id', {
        graph_id: 'test-graph',
        name: 'Test',
        if_exists: 'raise',
      });

      const assistant = await repo.get('test-id');
      assert(assistant);
      assert.strictEqual(assistant.assistant_id, 'test-id');
      assert.strictEqual(assistant.name, 'Test');
    });

    it('should return null for non-existent id', async () => {
      const assistant = await repo.get('non-existent');
      assert.strictEqual(assistant, null);
    });
  });

  describe('AssistantsRepository.getByGraphId', () => {
    it('should return assistant by graph_id', async () => {
      await repo.put('assistant-1', {
        graph_id: 'my-graph',
        name: 'Test',
        if_exists: 'raise',
      });

      const assistant = await repo.getByGraphId('my-graph');
      assert(assistant);
      assert.strictEqual(assistant.assistant_id, 'assistant-1');
      assert.strictEqual(assistant.graph_id, 'my-graph');
    });

    it('should return null for non-existent graph_id', async () => {
      const assistant = await repo.getByGraphId('non-existent');
      assert.strictEqual(assistant, null);
    });
  });

  describe('AssistantsRepository.search', () => {
    beforeEach(async () => {
      await repo.put('assistant-1', {
        graph_id: 'graph-1',
        name: 'Assistant 1',
        metadata: { type: 'chatbot' },
        if_exists: 'raise',
      });

      await repo.put('assistant-2', {
        graph_id: 'graph-2',
        name: 'Assistant 2',
        metadata: { type: 'agent' },
        if_exists: 'raise',
      });

      await repo.put('assistant-3', {
        graph_id: 'graph-1',
        name: 'Assistant 3',
        metadata: { type: 'chatbot' },
        if_exists: 'raise',
      });
    });

    it('should return all assistants with default options', async () => {
      const results = await repo.search({});
      assert.strictEqual(results.length, 3);
    });

    it('should filter by graph_id', async () => {
      const results = await repo.search({ graph_id: 'graph-1' });
      assert.strictEqual(results.length, 2);
      results.forEach(a => {
        assert.strictEqual(a.graph_id, 'graph-1');
      });
    });

    it('should filter by name', async () => {
      const results = await repo.search({ name: 'Assistant 2' });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Assistant 2');
    });

    it('should filter by metadata', async () => {
      const results = await repo.search({
        metadata: { type: 'chatbot' },
      });
      assert.strictEqual(results.length, 2);
      results.forEach(a => {
        assert.strictEqual(a.metadata.type, 'chatbot');
      });
    });

    it('should apply limit', async () => {
      const results = await repo.search({ limit: 2 });
      assert.strictEqual(results.length, 2);
    });

    it('should apply offset', async () => {
      const results = await repo.search({ limit: 10, offset: 1 });
      assert.strictEqual(results.length, 2);
    });

    it('should apply limit and offset together', async () => {
      const results = await repo.search({ limit: 1, offset: 1 });
      assert.strictEqual(results.length, 1);
    });

    it('should sort by created_at descending', async () => {
      const results = await repo.search({});
      assert.strictEqual(results[0].assistant_id, 'assistant-3');
      assert.strictEqual(results[2].assistant_id, 'assistant-1');
    });

    it('should combine filters', async () => {
      const results = await repo.search({
        graph_id: 'graph-1',
        metadata: { type: 'chatbot' },
      });
      assert.strictEqual(results.length, 2);
    });

    it('should return empty array if no matches', async () => {
      const results = await repo.search({
        graph_id: 'non-existent',
      });
      assert.strictEqual(results.length, 0);
    });
  });

  describe('AssistantsRepository.getAll', () => {
    it('should return all assistants', async () => {
      await repo.put('assistant-1', {
        graph_id: 'graph-1',
        if_exists: 'raise',
      });

      await repo.put('assistant-2', {
        graph_id: 'graph-2',
        if_exists: 'raise',
      });

      const all = repo.getAll();
      assert.strictEqual(all.length, 2);
    });

    it('should return empty array if no assistants', () => {
      const all = repo.getAll();
      assert.strictEqual(all.length, 0);
    });
  });
});
