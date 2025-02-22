import { defineConfig } from 'vitest/config';
import swc from 'vite-plugin-swc-transform';

export default defineConfig({
  plugins: [
    // https://timtech.blog/posts/transform-typescript-legacy-decorators-vite-swc-plugin/
    // support legacy decorator
    swc({
      swcOptions: {
        jsc: {
          target: 'es2021',
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
    coverage: {
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
        execArgv: [ '--import=tsx/esm' ],
      },
    },
  },
});
