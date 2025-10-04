import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  unused: true,
  dts: true,
  exports: {
    devExports: true,
  },
});
