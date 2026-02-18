# ESM Conversion Patterns

Pattern catalog for converting CJS code to ESM when cherry-picking between branches.

## Import Conversions

### require → import

```javascript
// CJS
const { Foo, Bar } = require('./foo');
const baz = require('baz');

// ESM
import { Foo, Bar } from './foo.ts';
import baz from 'baz';
```

### Type-only imports

```typescript
// CJS
const { SomeType } = require('./types');

// ESM — use `import type` when the import is only used in type positions
import type { SomeType } from './types.ts';
```

### Dynamic require → dynamic import

```javascript
// CJS
const mod = require(dynamicPath);

// ESM
const mod = await import(dynamicPath);
```

## Export Conversions

### module.exports → export default

```javascript
// CJS
module.exports = function(app) { ... };

// ESM
export default function(app) { ... };
```

### Named exports

```javascript
// CJS
exports.foo = foo;
exports.bar = bar;

// ESM
export { foo, bar };
```

## Path & Globals

### __dirname / __filename

```javascript
// CJS
const dir = __dirname;
const file = __filename;

// ESM (Node 22+)
const dir = import.meta.dirname;
const file = import.meta.filename;

// ESM (Node < 22)
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const file = fileURLToPath(import.meta.url);
const dir = dirname(file);
```

### Relative import extensions

In ESM source (TypeScript with `"type": "module"`), relative imports must include the file extension:

```typescript
// Wrong
import { Foo } from './foo';

// Correct — use .ts in source when TypeScript resolves .ts files directly
import { Foo } from './foo.ts';

// Correct — use .js when TypeScript emits .js files (outDir build)
import { Foo } from './foo.js';
```

Check the project's `tsconfig.json` `moduleResolution` and build setup to determine which extension to use.

## Egg.js-Specific Patterns

### Router files

```typescript
// CJS
module.exports = app => {
  app.router.get('/', app.controller.home.index);
};

// ESM
import type { Application } from 'egg';
export default (app: Application) => {
  app.router.get('/', app.controller.home.index);
};
```

### Config files

```typescript
// CJS
module.exports = appInfo => {
  const config = {};
  config.keys = appInfo.name;
  return config;
};

// ESM
import type { EggAppConfig } from 'egg';
export default (appInfo: { name: string }) => {
  const config = {} as Partial<EggAppConfig>;
  config.keys = appInfo.name;
  return config;
};
```

### Plugin config

```typescript
// CJS
exports.tegg = { enable: true, package: '@eggjs/tegg-plugin' };

// ESM
export const tegg = { enable: true, package: '@eggjs/tegg-plugin' };
```

## Test Fixture Conversions

Test fixtures often have their own `package.json`. Ensure:
- `"type": "module"` is set
- All imports use ESM syntax
- Mock setup uses ESM-compatible patterns

```typescript
// CJS test
const mm = require('egg-mock');
const assert = require('assert');

// ESM test
import { strict as assert } from 'node:assert';
import mm from '@eggjs/mock';
```
