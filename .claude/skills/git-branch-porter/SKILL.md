---
name: git-branch-porter
description: Port (cherry-pick) commits between long-lived divergent branches in monorepos, especially CJS-to-ESM migrations. Use when asked to backport, forward-port, or cherry-pick batches of commits across branches that have diverged significantly (e.g., master → next). Covers git worktree setup, batch cherry-picking, ESM conversion, pnpm workspace/catalog fixes, test troubleshooting, and CI verification.
---

# Git Branch Porter

Port commits between divergent long-lived branches in a monorepo, handling module system differences (CJS → ESM), dependency management, and CI.

## Workflow

### 1. Setup

Use a **git worktree** to work on the target branch without disturbing the main checkout:

```bash
git worktree add ../repo-port target-branch
cd ../repo-port
git checkout -b port/source-to-target
git remote add fork git@github.com:USER/REPO.git  # if using a fork
```

### 2. Identify Commits

Find commits on the source branch not yet on the target:

```bash
# From target branch, find divergence point
git log --oneline target-branch..source-branch
```

Review each commit to assess portability. Skip version bumps (`chore(release)`) and commits already applied.

### 3. Batch Cherry-Pick

Cherry-pick in small batches (5-10 commits) for manageable conflict resolution:

```bash
git cherry-pick <oldest>^..<newest> --no-commit
# Resolve conflicts, then:
git commit --no-verify -m "port: batch N - description"
```

Use `--no-commit` to stage all changes, fix ESM issues, then commit once. When conflicts arise, prefer the target branch's patterns (ESM) over the source's (CJS).

### 4. Apply ESM Fixes

After cherry-picking CJS code onto an ESM branch, apply conversions. See [references/esm-patterns.md](references/esm-patterns.md) for the complete pattern catalog.

Key conversions:
- `require()` → `import` / `import type`
- `module.exports` → `export default`
- Add `.ts` extensions to relative imports
- `__dirname` → `import.meta.dirname`
- Router/config files: convert to `export default` function

### 5. Fix Dependencies

pnpm workspaces with `catalog:` protocol need special attention when versions drift. See [references/pnpm-troubleshooting.md](references/pnpm-troubleshooting.md) for common issues.

Key patterns:
- Pin floating dist-tags to exact versions in `pnpm-workspace.yaml` catalog
- Use pnpm `overrides` in root `package.json` for transitive dependency control
- Run `pnpm dedupe` after changes, verify with `pnpm dedupe --check`
- Add package `exports` entries when downstream packages need new entry points

### 6. Test & Verify

Run the full test suite locally before pushing:

```bash
pnpm test              # vitest (core packages)
pnpm run test:mocha    # mocha (plugin packages)
pnpm dedupe --check    # lockfile consistency
```

Common test fixes:
- Increase timeouts for app boot under concurrent load: `beforeAll(fn, 30_000)`
- Fix import paths in test fixtures (CJS → ESM)
- Update mock configurations for ESM module loading

### 7. Push & CI

```bash
git push fork port/source-to-target
gh pr create --base target-branch --title "port: commits from source"
gh pr checks <PR_NUMBER>          # monitor CI
gh run view <RUN_ID> --log-failed # inspect failures
```

## Tips

- Use `--no-verify` when pre-commit hooks fail due to cross-branch incompatibilities; run lint separately before the final push
- Commit after each batch for easier bisection if issues arise
- When `pnpm dedupe --check` fails in CI but passes locally, check for `--frozen-lockfile` differences — CI uses frozen lockfile which preserves exact lockfile state
- For packages that need new export paths, add them to both `exports` in `package.json` and create the corresponding source file
