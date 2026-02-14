# @eggjs/tegg-vitest-adapter

Vitest adapter that provides tegg context injection and lifecycle handling via a custom Vitest runner.

## Install

This package lives in the tegg monorepo workspace.

## Usage

1. Create a Vitest setup file that calls `configureTeggRunner`:

```ts
// vitest.setup.ts
import path from 'path';
import mm from 'egg-mock';
import { configureTeggRunner } from '@eggjs/tegg-vitest-adapter';

const app = mm.app({
  baseDir: path.join(__dirname, 'fixtures/apps/my-app'),
  framework: require.resolve('egg'),
});

configureTeggRunner({
  getApp: () => app,
  restoreMocks: true,
  parallel: process.env.VITEST_WORKER_ID != null,
});
```

2. Wire it in `vitest.config.ts` with the custom runner:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    runner: '@eggjs/tegg-vitest-adapter/runner',
  },
});
```

## Options

- `getApp`: Provide a custom app getter. Default: `require('egg-mock/bootstrap').app`.
- `parallel`: Skip auto `app.close()` when running in parallel mode. Default: auto-detected from `VITEST_WORKER_ID`.
- `restoreMocks`: Restore mocks after each test (defaults to true).

## Lifecycle & Context Injection

The custom runner extends Vitest's `VitestTestRunner` and manages tegg context at the runner level:

- **`importFile` (collection phase)**: Captures per-file config from `configureTeggRunner()` and calls `app.ready()`.
- **`onBeforeRunSuite` (file suite)**: Creates a suite-scoped `ctx` via `app.mockContext()`, overrides `ctxStorage.getStore()`, and opens a held `beginModuleScope` that stays alive for the entire file.
- **`onBeforeRunTask` (per test)**: Creates a per-test `ctx` and opens a held `beginModuleScope` for the test.
- **`onAfterRunTask`**: Releases the test scope, restores mocks, and restores `ctxStorage.getStore()` back to the suite `ctx`.
- **`onAfterRunSuite`**: Releases the suite scope, restores original `getStore()`, and calls `app.close()` unless `parallel` is true.

## Limitations

- Context is managed at the **file suite** level. `egg-mock`'s Mocha runner patch can switch context at the **`describe` suite** level. If your tests rely on describe-scoped suite context, you must manage that manually.
- If `getApp` throws or returns `undefined`, the adapter will run tests without context injection.
