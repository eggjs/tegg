import assert from 'node:assert/strict';

import { ClaudeAgentTracer } from '../src/ClaudeAgentTracer';
import { LangGraphTracer } from '../src/LangGraphTracer';
import { createMockLogger, createCapturingTracingService } from './TestUtils';

describe('test/Configure.test.ts', () => {
  describe('LangGraphTracer.configure()', () => {
    it('should set agentName and delegate to TracingService', () => {
      const { tracingService } = createCapturingTracingService();
      const tracer = new LangGraphTracer();
      (tracer as any).tracingService = tracingService;

      tracer.configure({
        agentName: 'MyAgent',
      });

      assert.strictEqual(tracer.agentName, 'MyAgent');
      assert.strictEqual(tracer.name, 'LangGraphTracer', 'name should remain default');
    });

    it('should not change agentName when not provided', () => {
      const { tracingService } = createCapturingTracingService();
      const tracer = new LangGraphTracer();
      (tracer as any).tracingService = tracingService;
      tracer.agentName = 'existing';

      tracer.configure({});

      assert.strictEqual(tracer.agentName, 'existing');
    });
  });

  describe('ClaudeAgentTracer.configure()', () => {
    it('should set agentName and delegate to TracingService', () => {
      const { tracingService } = createCapturingTracingService();
      const mockLogger = createMockLogger();
      const tracer = new ClaudeAgentTracer();
      (tracer as any).logger = mockLogger;
      (tracer as any).tracingService = tracingService;

      tracer.configure({
        agentName: 'MyClaude',
      });

      assert.strictEqual(tracer.agentName, 'MyClaude');
      assert.strictEqual(tracer.name, 'ClaudeAgentTracer', 'name should remain default');
    });

    it('should not change agentName when not provided', () => {
      const { tracingService } = createCapturingTracingService();
      const mockLogger = createMockLogger();
      const tracer = new ClaudeAgentTracer();
      (tracer as any).logger = mockLogger;
      (tracer as any).tracingService = tracingService;
      tracer.agentName = 'existing';

      tracer.configure({});

      assert.strictEqual(tracer.agentName, 'existing');
    });
  });
});
