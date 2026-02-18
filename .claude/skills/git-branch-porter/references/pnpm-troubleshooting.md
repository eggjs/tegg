# pnpm Workspace Troubleshooting

Common issues when porting commits in pnpm monorepos with catalog mode.

## Floating Dist-Tags Resolve to Incompatible Versions

**Problem**: Catalog uses floating dist-tags like `egg: beta` which resolve to the latest beta. Over time, the resolved version changes and may be incompatible.

**Symptom**: `pnpm install --force` or `pnpm dedupe` upgrades transitive dependencies, breaking tests with errors like `GlobalGraph.instance is not set` or bundled plugin conflicts.

**Fix**: Pin exact versions in both catalog and overrides:

```yaml
# pnpm-workspace.yaml
catalog:
  egg: 4.1.0-beta.26          # was: beta
  '@eggjs/mock': 7.0.0-beta.26
  '@eggjs/bin': 8.0.0-beta.26
```

```json
// package.json
{
  "pnpm": {
    "overrides": {
      "egg": "4.1.0-beta.26",
      "@eggjs/mock": "7.0.0-beta.26",
      "@eggjs/bin": "8.0.0-beta.26"
    }
  }
}
```

**Why both?** Catalog pins affect workspace packages. Overrides affect transitive dependencies from published packages (e.g., `standalone` → `egg@beta` → `@eggjs/ajv-plugin@beta.36`).

**Note on catalog and publishing**: `catalog:` protocol is resolved to actual versions at publish time. Pinning in catalog affects what gets published. Overrides are workspace-only and don't affect published packages.

## pnpm dedupe --check Fails in CI but Passes Locally

**Problem**: CI uses `pnpm install --frozen-lockfile` which preserves the exact lockfile, while local `pnpm install` may subtly adjust resolution.

**Common causes**:
1. Peer dependency resolution differences (e.g., `axios@1.13.5` vs `axios@1.13.5(debug@4.4.3)`)
2. Different pnpm store state between local and CI

**Fix approaches**:
1. Run `pnpm dedupe` locally, commit the updated lockfile
2. If dedupe creates a circular issue (fix → check → wants reverse), try:
   - Add overrides for the problematic package
   - Delete `node_modules` and `pnpm-lock.yaml`, run fresh `pnpm install`, then `pnpm dedupe`
   - Pin the problematic transitive dependency version

## Adding New Package Export Paths

**Problem**: A published package at version X doesn't export a path that downstream packages need (e.g., `@eggjs/ajv-plugin@beta.36` imports `@eggjs/tegg-plugin/types` but the workspace version doesn't export it).

**Fix**: Add the export in the workspace package:

```json
// plugin/tegg/package.json
{
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",    // add new export
    "./package.json": "./package.json"
  }
}
```

Create the source file if it doesn't exist:

```typescript
// plugin/tegg/src/types.ts
import '@eggjs/tegg-plugin/types';
```

## Bundled Dependencies in Newer Versions

**Problem**: A newer version of a package (e.g., `egg@4.1.0-beta.36`) bundles sub-packages (like `@eggjs/aop-plugin`, `@eggjs/eventbus-plugin`) that conflict with workspace versions.

**Symptom**: Published bundled packages have `GlobalGraph.instance` assertions that fail because they get a different `GlobalGraph` singleton from the workspace packages.

**Fix**: Pin to the older version that doesn't bundle these packages, using both catalog pins and overrides as described above.

## Test Timeout Issues Under Concurrent Load

**Problem**: vitest runs tests concurrently. App boot in `beforeAll` hooks can take >5s under load, exceeding the default 5000ms timeout.

**Fix**: Add explicit timeouts to slow hooks:

```typescript
// vitest
beforeAll(async () => {
  app = mm.app({ baseDir: '...' });
  await app.ready();
}, 30_000);  // 30 second timeout

it('slow test', async () => {
  // ...
}, 30_000);
```

For mocha, set timeout in the describe/it block:

```typescript
describe('suite', function() {
  this.timeout(30000);
  // ...
});
```
