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
});
