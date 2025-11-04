import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { Type, Static } from '@eggjs/tegg/ajv';
import 'egg';
import '@eggjs/tegg-plugin/typings';
import '@eggjs/tegg-controller-plugin/typings';

export const ChatModelConfigModuleConfigSchema = Type.Object({
  clients: Type.Record(Type.String(), Type.Object({
    temperature: Type.Optional(Type.Number({
      description: 'Sampling temperature to use',
    })),
    maxTokens: Type.Optional(Type.Number({
      description: 'Maximum number of tokens to generate in the completion. -1 returns as many tokens as possible given the prompt and the model\'s maximum context size.',
    })),
    topP: Type.Optional(Type.Number({
      description: 'Total probability mass of tokens to consider at each step',
    })),
    frequencyPenalty: Type.Optional(Type.Number({
      description: 'Penalizes repeated tokens according to frequency',
    })),
    presencePenalty: Type.Optional(Type.Number({
      description: 'Penalizes repeated tokens',
    })),
    n: Type.Optional(Type.Number({
      description: 'Number of completions to generate for each prompt',
    })),
    logitBias: Type.Optional(Type.Record(Type.String(), Type.Number(), {
      description: 'Dictionary used to adjust the probability of specific tokens being generated',
    })),
    user: Type.Optional(Type.String({
      description: 'Unique string identifier representing your end-user, which can help OpenAI to monitor and detect abuse.',
    })),
    streaming: Type.Optional(Type.Boolean({
      description: 'Whether to stream the results or not. Enabling disables tokenUsage reporting',
    })),
    streamUsage: Type.Optional(Type.Boolean({
      description: 'Whether or not to include token usage data in streamed chunks. @default true',
    })),
    modelName: Type.Optional(Type.String({
      description: 'Model name to use, Alias for `model`',
    })),
    model: Type.Optional(Type.String({
      description: 'Model name to use.',
    })),
    modelKwargs: Type.Optional(Type.Record(Type.String(), Type.Any(), {
      description: 'Holds any additional parameters that are valid to pass to {@link https://platform.openai.com/docs/api-reference/completions/create | `openai.createCompletion`} that are not explicitly specified on this class.',
    })),
    /**
     * List of stop words to use when generating. Alias for `stopSequences`
     */
    stop: Type.Optional(Type.Array(Type.String(), {
      description: 'List of stop words to use when generating. Alias for `stopSequences`',
    })),
    stopSequences: Type.Optional(Type.Array(Type.String(), {
      description: 'List of stop words to use when generating.',
    })),
    timeout: Type.Optional(Type.Number({
      description: 'Timeout to use when making requests to OpenAI.',
    })),
    /**
     * API key to use when making requests to OpenAI. Defaults to the value of `OPENAI_API_KEY` environment variable. Alias for `apiKey`
     */
    openAIApiKey: Type.Optional(Type.String({
      description: 'API key to use when making requests to OpenAI. Defaults to the value of `OPENAI_API_KEY` environment variable. Alias for `apiKey`',
    })),
    apiKey: Type.Optional(Type.String({
      description: 'API key to use when making requests to OpenAI. Defaults to the value of `OPENAI_API_KEY` environment variable.',
    })),
    maxConcurrency: Type.Optional(Type.Number({
      description: 'The maximum number of concurrent calls that can be made. Defaults to `Infinity`, which means no limit.',
    })),
    maxRetries: Type.Optional(Type.Number({
      description: 'The maximum number of retries that can be made for a single call, with an exponential backoff between each attempt. Defaults to 6.',
    })),
    verbose: Type.Optional(Type.Boolean({
      description: 'debug option',
    })),
    tags: Type.Optional(Type.Array(Type.String())),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
    configuration: Type.Optional(Type.Object({
      apiKey: Type.Optional(Type.String({
        description: 'The OpenAI API key to use.',
      })),
      baseURL: Type.Optional(Type.String({
        description: 'Override the default base URL for the API, e.g., "https://api.example.com/v2/"',
      })),
      timeout: Type.Optional(Type.Number({
        description: 'The maximum amount of time (in milliseconds) that the client should wait for a response from the server before timing out a single request. Note that request timeouts are retried by default, so in a worst-case scenario you may wait much longer than this timeout before the promise succeeds or fails.',
      })),
      maxRetries: Type.Optional(Type.Number({
        description: 'The maximum number of times that the client will retry a request in case of a temporary failure, like a network error or a 5XX error from the server.',
        default: 2,
      })),
      defaultHeaders: Type.Optional(Type.Record(Type.String(), Type.Union([
        Type.String(),
        Type.Array(Type.String()),
      ]), {
        description: 'Default headers to include with every request to the API. These can be removed in individual requests by explicitly setting the header to `undefined` or `null` in request options.',
      })),
      defaultQuery: Type.Optional(Type.Record(Type.String(), Type.String(), {
        description: 'Default query parameters to include with every request to the API. These can be removed in individual requests by explicitly setting the param to `undefined` in request options.',
      })),
    })),
  })),
}, {
  title: 'ChatModel 设置',
  name: 'ChatModel',
});

export type ChatModelConfigModuleConfigType = Static<typeof ChatModelConfigModuleConfigSchema>;

declare module '@eggjs/tegg' {
  export type LangChainModuleConfig = {
    ChatModel?: ChatModelConfigModuleConfigType;
  };

  export interface ModuleConfig extends LangChainModuleConfig {
  }
}

declare module 'egg' {
  export interface ModuleConfigApplication {
    moduleReferences: readonly ModuleReference[];
    moduleConfigs: Record<string, ModuleConfigHolder>;
    eggContainerFactory: typeof EggContainerFactory;
  }

  export interface Application extends ModuleConfigApplication {

  }
}
