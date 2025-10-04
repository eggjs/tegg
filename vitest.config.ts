import { defineConfig } from 'vitest/config';
import swc from 'vite-plugin-swc-transform';

export default defineConfig({
  plugins: [
    // https://timtech.blog/posts/transform-typescript-legacy-decorators-vite-swc-plugin/
    // https://github.com/ziir/vite-plugin-swc-transform
    // support legacy decorator
    // MEMO: support design:type metadata https://www.typescriptlang.org/docs/handbook/decorators.html
    swc({
      swcOptions: {
        jsc: {
          target: 'es2022',
          transform: {
            useDefineForClassFields: true,
            legacyDecorator: true,
            decoratorMetadata: true,
          },
          // externalHelpers: true,
        },
      },
    }),
  ],
  test: {
    exclude: [
      'plugin/(dal|tegg|orm)/test/**/*.test.ts',
      'standalone/standalone/test/**/*.test.ts',
      '**/node_modules',
    ],
    coverage: {
      provider: 'v8',
      reporter: [
        'json',
        'text-summary',
        'html',
        'lcov',
      ],
      exclude: [
        '*/*/test',
        'benchmark',
        '**/*/typings',
        'vitest.config.ts',
      ],
    },
    testTimeout: 60000,
    poolOptions: {
      forks: {
        execArgv: [
          // TODO: aop plugin required this flag, otherwise there will be a SyntaxError: Invalid or unexpected token
          '--import=tsx/esm',
          // TODO: TypeScript enum is not supported in strip-only mode
          // '--experimental-transform-types',
        ],
      },
    },
  },
});
