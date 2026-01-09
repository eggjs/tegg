# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tegg is a TypeScript dependency injection framework and plugin system for [Egg.js](https://eggjs.org/). It provides decorator-based dependency injection, lifecycle management, and modular architecture for building scalable Node.js applications.

## Common Commands

```bash
# Install dependencies
npm install

# Run all tests across workspaces
npm test

# Run tests for a single package
npm test --workspace=core/metadata
npm test --workspace=plugin/tegg

# Run a single test file (from package directory)
cd core/metadata && npm test -- --grep "test name"

# Lint
npm run lint
npm run lint:fix

# Build TypeScript
npm run tsc

# Full CI (prepare + lint + test)
npm run ci

# Publish (requires permissions)
npm run bump    # version bump with lerna
npm run pub     # publish to npm
```

## Architecture

### Monorepo Structure

This is a Lerna monorepo with three workspace categories:

- **core/**: Core packages containing decorators, runtime, and utilities
- **plugin/**: Egg.js plugins that integrate tegg features
- **standalone/**: Standalone runtime without Egg.js dependency

### Key Packages

| Package | Description |
|---------|-------------|
| `@eggjs/tegg` | Main entry point, re-exports all decorator packages |
| `@eggjs/tegg-plugin` | Main Egg.js plugin for tegg integration |
| `@eggjs/core-decorator` | Core decorators: `@ContextProto`, `@SingletonProto`, `@Inject` |
| `@eggjs/tegg-types` | TypeScript type definitions |
| `@eggjs/tegg-metadata` | Metadata storage and graph building |
| `@eggjs/tegg-runtime` | Runtime container and object instantiation |
| `@eggjs/tegg-lifecycle` | Object lifecycle hooks |

### Core Concepts

**Prototype Types (instantiation modes):**
- `@ContextProto`: One instance per request context
- `@SingletonProto`: One instance for entire application lifecycle
- `@MultiInstanceProto`: Multiple instances with different qualifiers

**Access Levels:**
- `AccessLevel.PRIVATE`: Only accessible within the same module
- `AccessLevel.PUBLIC`: Accessible from other modules

**Object Init Types:**
- `ObjectInitType.CONTEXT`: New instance per request
- `ObjectInitType.SINGLETON`: Single instance for app lifetime
- `ObjectInitType.ALWAYS_NEW`: New instance on every injection

### Dependency Injection Flow

1. Decorators (`@ContextProto`, `@SingletonProto`, etc.) register metadata on classes
2. `@eggjs/tegg-loader` scans and loads modules
3. `@eggjs/tegg-metadata` builds a dependency graph (GlobalGraph, ModuleGraph)
4. `@eggjs/tegg-runtime` instantiates objects based on the graph
5. `@Inject` decorator triggers dependency resolution at runtime

### Lifecycle Hooks

Objects can implement `EggObjectLifecycle` interface or use decorators:
- `@LifecyclePostConstruct` / `postConstruct()`
- `@LifecyclePreInject` / `preInject()`
- `@LifecyclePostInject` / `postInject()`
- `@LifecycleInit` / `init()`
- `@LifecyclePreDestroy` / `preDestroy()`
- `@LifecycleDestroy` / `destroy()`

## Import Guidelines

### Application Code (Egg.js apps using tegg)

Always import from `@eggjs/tegg` - it re-exports everything needed:

```typescript
// Core decorators and enums
import {
  ContextProto,
  SingletonProto,
  Inject,
  AccessLevel,
  EggQualifier,
  EggType,
} from '@eggjs/tegg';

// Subpath imports for specific features
import { Advice, Crosscut, Pointcut } from '@eggjs/tegg/aop';
import { DataSource } from '@eggjs/tegg/orm';
import { Schedule } from '@eggjs/tegg/schedule';
import { Transactional } from '@eggjs/tegg/transaction';
```

Available subpaths: `aop`, `orm`, `dal`, `schedule`, `transaction`, `ajv`, `helper`, `standalone`

### Advanced Usage (custom loaders, lifecycle hooks)

Use `@eggjs/tegg/helper` for internal APIs:

```typescript
import {
  ModuleConfigUtil,
  LoaderFactory,
  EggObjectLifeCycleContext,
  EggObject,
} from '@eggjs/tegg/helper';
```

### Framework Internal Code (packages within this monorepo)

**For type-only imports**, use `@eggjs/tegg-types`:

```typescript
import type { EggPrototype, EggObject, EggObjectLifecycle } from '@eggjs/tegg-types';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';
```

**For decorator utilities**, import from `@eggjs/core-decorator`:

```typescript
import { PrototypeUtil, QualifierUtil, MetadataUtil } from '@eggjs/core-decorator';
```

### Package Dependency Rules

| If you're in... | Import decorators from | Import types from |
|-----------------|----------------------|-------------------|
| Application code | `@eggjs/tegg` | `@eggjs/tegg` |
| `plugin/*` packages | `@eggjs/tegg` | `@eggjs/tegg-types` |
| `core/*` packages | `@eggjs/core-decorator` | `@eggjs/tegg-types` |

## Best Practices

### Prefer SingletonProto for Performance

Use `@SingletonProto` by default unless you need request-scoped state. Singleton objects are created once at startup, avoiding repeated instantiation overhead per request.

```typescript
// Good: Stateless service as singleton
@SingletonProto()
export class UserRepository {
  async findById(id: string) { /* ... */ }
}

// Use ContextProto only when you need request-specific state
@ContextProto()
export class RequestTracer {
  @Inject()
  ctx: EggContext;  // needs access to current request
}
```

### Minimize AccessLevel Scope

Default is `AccessLevel.PRIVATE`. Only use `AccessLevel.PUBLIC` when the prototype genuinely needs to be accessed from other modules.

```typescript
// Good: explicitly public for cross-module access
@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class SharedConfigService { }

// Good: private by default, only used within module
@SingletonProto()
export class InternalHelper { }
```

### Use Lifecycle Hooks for Async Initialization

Constructors cannot be async. Use `init()` lifecycle hook for async setup like database connections or external service initialization.

```typescript
@SingletonProto()
export class DatabaseClient implements EggObjectLifecycle {
  private connection: Connection;

  async init() {
    // Async initialization here
    this.connection = await createConnection();
  }

  async destroy() {
    // Cleanup resources
    await this.connection.close();
  }
}
```

### Use BackgroundTaskHelper for Async Tasks

Never use raw `setTimeout`, `setInterval`, or `process.nextTick` in `@ContextProto` objects. The context may be destroyed before the task completes. Use `BackgroundTaskHelper` instead.

```typescript
@ContextProto()
export class OrderService {
  @Inject()
  backgroundTaskHelper: BackgroundTaskHelper;

  async createOrder(data: OrderData) {
    const order = await this.saveOrder(data);
    // Safe async task that survives request lifecycle
    this.backgroundTaskHelper.run(async () => {
      await this.sendNotification(order);
    });
    return order;
  }
}
```

### Inject What You Need

Avoid injecting `ctx` or `app` directly. Inject specific services or objects instead for better testability and clearer dependencies.

```typescript
// Avoid
@ContextProto()
export class BadService {
  @Inject()
  ctx: Context;  // too broad

  async doSomething() {
    return this.ctx.service.userService.find();
  }
}

// Better
@ContextProto()
export class GoodService {
  @Inject()
  userService: UserService;  // explicit dependency

  async doSomething() {
    return this.userService.find();
  }
}
```

### Module Organization

- One module per bounded context or feature domain
- Keep modules focused and cohesive
- Use `AccessLevel.PUBLIC` sparingly to define clear module boundaries
- Prefer injecting prototypes over direct module-to-module references

## Important Constraints

- `@ContextProto` objects can inject any prototype type
- `@SingletonProto` objects **can** inject `@ContextProto` objects via Proxy mechanism:
  - tegg uses `AsyncLocalStorage` to track the current request context
  - When SingletonProto injects ContextProto, a Proxy object is injected
  - The Proxy resolves to the correct ContextProto instance from current context on each access
  - **Caveat**: Accessing ContextProto from SingletonProto outside a request context will throw an error
- Circular dependencies between prototypes are not allowed
- Circular dependencies between modules are not allowed

## Code Conventions

- TypeScript strict mode with `experimentalDecorators` and `emitDecoratorMetadata` enabled
- ESLint with `eslint-config-egg/typescript`
- Tests use Mocha and are located in `test/` directories within each package
- Test fixtures are in `test/fixtures/` directories

---

## Framework Development Guide

This section is for contributors developing the tegg framework itself.

### Development Workflow

Before committing code, always run:

```bash
# 1. Lint check (required)
npm run lint

# 2. Run full CI: prepare-test + lint + test (required)
npm run ci

# 3. Verify TypeScript compilation for publishing (required for core packages)
npm run tsc:pub
```

**CI Pipeline** (`npm run ci`) executes:
1. `ut prepare-test` - Prepare test fixtures
2. `ut lint` - ESLint check
3. `ut test` - Run all tests across workspaces

**Note**: Some tests require MySQL. CI runs against MySQL 5.7. To run locally:
- macOS: `brew install mysql && brew services start mysql`
- Linux: Use Docker or native MySQL installation

### Package Development Order

When developing a new feature for tegg, create packages in this order:

```
1. core/types        → Type definitions (interfaces, enums)
2. core/*-decorator  → Decorators and metadata utilities
3. core/*-runtime    → Runtime logic (if needed)
4. core/tegg         → Re-export from main package (add to index.ts or create subpath)
5. plugin/*          → Egg.js plugin integration
```

**Dependency direction**: `types` ← `decorator` ← `runtime` ← `plugin`

### Creating a New Decorator Package

1. Create package in `core/` directory:

```
core/my-decorator/
├── package.json
├── tsconfig.json
├── tsconfig.pub.json
├── src/
│   ├── decorator/
│   │   └── MyDecorator.ts
│   └── util/
│       └── MyDecoratorInfoUtil.ts
├── index.ts          # exports
└── test/
    └── MyDecorator.test.ts
```

2. Key dependencies in `package.json`:

```json
{
  "dependencies": {
    "@eggjs/core-decorator": "^3.x",
    "@eggjs/tegg-types": "^3.x"
  }
}
```

3. Decorator implementation pattern:

```typescript
// src/decorator/MyDecorator.ts
import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

export const MY_DECORATOR_META = Symbol('MY_DECORATOR_META');

export interface MyDecoratorParams {
  name?: string;
}

export function MyDecorator(params?: MyDecoratorParams) {
  return function(target: EggProtoImplClass) {
    PrototypeUtil.setMetaData(target, MY_DECORATOR_META, params || {});
  };
}
```

4. Add export to `core/tegg/`:
   - For core features: add to `index.ts`
   - For optional features: create new subpath file (e.g., `myfeature.ts`)

### Creating a New Plugin

1. Create package in `plugin/` directory:

```
plugin/my-plugin/
├── package.json
├── tsconfig.json
├── tsconfig.pub.json
├── app.ts              # Plugin entry point
├── config/
│   └── config.default.ts
├── lib/
│   ├── MyService.ts    # Injectable services
│   └── MyHook.ts       # Lifecycle hooks
├── typings/
│   └── index.d.ts      # Type extensions for egg
└── test/
    └── my-plugin.test.ts
```

2. Key fields in `package.json`:

```json
{
  "name": "@eggjs/tegg-my-plugin",
  "eggPlugin": {
    "name": "myPlugin",
    "dependencies": ["tegg"]
  },
  "eggModule": {
    "name": "teggMyPlugin"
  },
  "dependencies": {
    "@eggjs/tegg": "^3.x",
    "@eggjs/my-decorator": "^3.x"  // if you have decorator package
  }
}
```

- `eggPlugin`: Configuration for Egg.js plugin mode
- `eggModule`: Configuration for standalone mode (`@eggjs/standalone`), where the plugin runs as a module without Egg.js

3. Plugin entry point (`app.ts`):

```typescript
import { Application } from 'egg';

export default class MyPluginAppHook {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    // Register hooks before module loading
  }

  async didLoad() {
    // After modules are loaded
    await this.app.moduleHandler.ready();
  }

  beforeClose() {
    // Cleanup resources
  }
}
```

### Wrapping Third-Party SDK as Plugin

Pattern for wrapping external SDKs (e.g., database clients, API clients). See `mcp-client` plugin for a complete example.

**Step 1: Create core wrapper package** (`core/my-client`)

Wrap the third-party SDK with tegg-compatible interface (no tegg runtime dependency):

```typescript
// core/my-client/src/MyClient.ts
import { ThirdPartySDK } from 'third-party-sdk';
import type { Logger } from '@eggjs/tegg';

export interface MyClientOptions {
  logger: Logger;
  // ... other options
}

// Extend the third-party SDK class directly
export class MyClient extends ThirdPartySDK {
  protected logger: Logger;

  constructor(options: MyClientOptions) {
    super(options);
    this.logger = options.logger;
  }

  async init() {
    // Initialize connection
    await super.connect();
  }
}
```

**Step 2: Create Egg-specific subclass in plugin** (`plugin/my-plugin`)

Extend the core wrapper to add tegg-specific features (e.g., context tracking):

```typescript
// plugin/my-plugin/lib/EggMyClient.ts
import { Logger } from '@eggjs/tegg';
import { ContextHandler } from '@eggjs/tegg-runtime';
import { MyClient, MyClientOptions } from '@eggjs/my-client';

export interface EggMyClientOptions extends MyClientOptions {
  // additional egg-specific options
}

// Extend the core wrapper class
export class EggMyClient extends MyClient {
  constructor(options: EggMyClientOptions) {
    super(options);
  }

  // Override methods to add tegg-specific behavior
  async doSomething() {
    const context = ContextHandler.getContext();
    if (context) {
      // Set context-specific data for tracing, logging, etc.
      context.set('myClient.method', 'doSomething');
    }
    return super.doSomething();
  }
}
```

**Step 3: Create factory for instantiation**

Factory injects tegg dependencies and creates the client:

```typescript
// plugin/my-plugin/lib/MyClientFactory.ts
import {
  AccessLevel,
  Inject,
  Logger,
  SingletonProto,
} from '@eggjs/tegg';
import { EggMyClient, EggMyClientOptions } from './EggMyClient';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'myClientFactory',
})
export class MyClientFactory {
  @Inject()
  private readonly logger: Logger;

  async build(options: Omit<EggMyClientOptions, 'logger'>): Promise<EggMyClient> {
    const client = new EggMyClient({
      ...options,
      logger: this.logger,
    });
    await client.init();
    return client;
  }
}
```

**Summary of the pattern:**

```
third-party-sdk          →  core/my-client (MyClient extends SDK)
                         →  plugin/my-plugin (EggMyClient extends MyClient)
                         →  plugin/my-plugin (MyClientFactory creates EggMyClient)
```

This layered approach:
- Keeps core wrapper independent of tegg runtime
- Allows Egg-specific extensions (context tracking, tracing)
- Factory handles dependency injection (logger, config)

**Step 4: Register lifecycle hooks in plugin** (if needed):

```typescript
// plugin/my-plugin/app.ts
import { Application } from 'egg';
import { MyPrototypeHook } from './lib/MyPrototypeHook';

export default class MyPluginAppHook {
  private readonly app: Application;
  private myHook: MyPrototypeHook;

  constructor(app: Application) {
    this.app = app;
  }

  configDidLoad() {
    // Register prototype lifecycle hooks
    this.myHook = new MyPrototypeHook();
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.myHook);
  }

  beforeClose() {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.myHook);
  }
}
```

### Available Lifecycle Hooks

Plugins can register hooks at different levels:

| Hook Registry | Purpose |
|--------------|---------|
| `app.loadUnitLifecycleUtil` | Module loading/unloading |
| `app.eggPrototypeLifecycleUtil` | Prototype creation/destruction |
| `app.eggObjectLifecycleUtil` | Object instance creation/destruction |
| `app.eggContextLifecycleUtil` | Request context creation/destruction |

### Testing Plugins

Use `egg-mock` for plugin testing:

```typescript
import { app } from 'egg-mock/bootstrap';

describe('my-plugin', () => {
  it('should work', async () => {
    await app.mockModuleContextScope(async ctx => {
      const myClient = await ctx.getEggObject(MyClient);
      const result = await myClient.doSomething();
      assert(result);
    });
  });
});
```

### Core Package Internals

#### @eggjs/core-decorator (`core/core-decorator`)

Provides the fundamental decorators for dependency injection.

```
src/
├── decorator/
│   ├── ContextProto.ts      # @ContextProto decorator
│   ├── SingletonProto.ts    # @SingletonProto decorator
│   ├── MultiInstanceProto.ts # @MultiInstanceProto decorator
│   ├── Inject.ts            # @Inject decorator
│   ├── Prototype.ts         # Base prototype decorator logic
│   ├── InitTypeQualifier.ts # @InitTypeQualifier for disambiguation
│   ├── ModuleQualifier.ts   # @ModuleQualifier for cross-module injection
│   └── EggQualifier.ts      # @EggQualifier for egg ctx/app disambiguation
└── util/
    ├── PrototypeUtil.ts     # Read/write prototype metadata
    ├── QualifierUtil.ts     # Qualifier metadata operations
    └── MetadataUtil.ts      # General metadata utilities
```

#### @eggjs/tegg-metadata (`core/metadata`)

Builds and manages the dependency graph for all modules and prototypes.

```
src/
├── model/
│   ├── graph/
│   │   ├── GlobalGraph.ts       # Main dependency graph (modules + protos)
│   │   ├── GlobalModuleNode.ts  # Module node in graph
│   │   ├── ProtoNode.ts         # Prototype node in graph
│   │   └── ProtoSelector.ts     # Logic for finding matching prototypes
│   ├── ModuleDescriptor.ts      # Module metadata container
│   ├── LoadUnit.ts              # LoadUnit interface (module instance)
│   └── EggPrototype.ts          # Prototype metadata model
├── impl/
│   ├── EggPrototypeBuilder.ts   # Builds EggPrototype from class
│   ├── EggPrototypeImpl.ts      # EggPrototype implementation
│   └── ModuleLoadUnit.ts        # LoadUnit implementation for modules
└── factory/
    ├── EggPrototypeFactory.ts   # Creates prototypes from classes
    └── LoadUnitFactory.ts       # Manages LoadUnit instances
```

**Key class: `GlobalGraph`** - Manages two graphs:
- `moduleGraph`: Vertices are modules, edges are module dependencies
- `protoGraph`: Vertices are prototypes, edges are injection dependencies

The `build()` method resolves all injection edges, `sort()` produces instantiation order.

#### @eggjs/tegg-runtime (`core/runtime`)

Handles actual object instantiation and lifecycle management.

```
src/
├── model/
│   ├── EggObject.ts             # EggObject interface and lifecycle utils
│   ├── EggContext.ts            # Request context interface
│   ├── AbstractEggContext.ts    # Base context implementation
│   └── LoadUnitInstance.ts      # Runtime instance of a LoadUnit
├── impl/
│   ├── EggObjectImpl.ts         # Creates and initializes object instances
│   ├── EggObjectUtil.ts         # Injection and lifecycle utilities
│   ├── ModuleLoadUnitInstance.ts # LoadUnitInstance for modules
│   └── ContextObjectGraph.ts    # Per-request object graph
└── factory/
    ├── EggObjectFactory.ts      # Creates EggObject instances
    ├── EggContainerFactory.ts   # Manages object containers
    └── LoadUnitInstanceFactory.ts # Creates LoadUnitInstance
```

#### @eggjs/tegg-types (`core/types`)

TypeScript type definitions organized by domain:

```
├── core-decorator/          # Types for core decorators
│   ├── enum/               # AccessLevel, ObjectInitType, EggType, etc.
│   └── model/              # EggPrototypeInfo, InjectObjectInfo, etc.
├── metadata/               # Types for metadata layer
├── runtime/                # Types for runtime layer
├── lifecycle/              # Lifecycle hook interfaces
└── controller-decorator/   # HTTP controller types
```

#### @eggjs/tegg-plugin (`plugin/tegg`)

Main Egg.js plugin that integrates tegg into an Egg application.

```
├── app.ts                   # Plugin entry: lifecycle hooks (didLoad, beforeClose)
├── app/
│   ├── extend/
│   │   ├── application.ts   # Extends app with getEggObject, moduleHandler
│   │   └── context.ts       # Extends ctx with getEggObject, beginModuleScope
│   └── middleware/
│       └── tegg_ctx_lifecycle_middleware.ts  # Creates EggContext per request
└── lib/
    ├── ModuleHandler.ts     # Orchestrates module loading and initialization
    ├── EggModuleLoader.ts   # Loads modules using tegg-loader
    ├── EggContextHandler.ts # Manages EggContext lifecycle
    ├── EggContextImpl.ts    # EggContext implementation for Egg
    ├── EggCompatibleObject.ts    # Wraps egg app/ctx objects as prototypes
    └── EggCompatibleProtoImpl.ts # Makes egg objects injectable
```

**Initialization flow in `app.ts`:**
1. `configWillLoad`: Register middleware
2. `configDidLoad`: Setup EggContextHandler, ModuleHandler
3. `didLoad`: Register hooks, call `moduleHandler.init()` to load all modules
4. `beforeClose`: Cleanup and destroy
