# @eggjs/tegg-common-util

Common utility functions for tegg framework.

## ModuleConfigUtil.deduplicateModules

A utility method for deduplicating module references to avoid adding duplicate modules.

### Features

- **Path-based deduplication**: Removes modules with duplicate paths
- **Name-based deduplication**: Removes modules with duplicate names (throws error if found)
- **Priority handling**: Prioritizes non-optional modules over optional ones
- **Error handling**: Throws error for duplicate module names with different paths
- **Simple API**: No complex options, straightforward behavior

### API

```typescript
public static deduplicateModules(
  moduleReferences: readonly ModuleReference[]
): readonly ModuleReference[]
```

**Note**: This method does not accept options parameters. The behavior is fixed and optimized for common use cases.

### Behavior

1. **Path Deduplication**: If multiple modules have the same path, only one is kept
2. **Optional Priority**: When paths are the same, non-optional modules are prioritized over optional ones
3. **Name Validation**: If modules have the same name but different paths, an error is thrown
4. **First Occurrence**: When both modules have the same optional status, the first occurrence is kept

### Usage Examples

#### Basic Usage

```typescript
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';

const modules = [
  { name: 'module1', path: '/path/to/module1' },
  { name: 'module2', path: '/path/to/module2' },
  { name: 'module1', path: '/different/path/to/module1' }, // Will throw error
];

const result = ModuleConfigUtil.deduplicateModules(modules);
// Throws Error: Duplicate module name "module1" found
```

#### With Optional Modules

```typescript
const modules = [
  { name: 'module1', path: '/path/to/module1', optional: true },
  { name: 'module1', path: '/path/to/module1' }, // Non-optional version
];

const result = ModuleConfigUtil.deduplicateModules(modules);
// Result: 1 module, non-optional version kept
```

#### Path Deduplication

```typescript
const modules = [
  { name: 'module1', path: '/path/to/module1' },
  { name: 'module2', path: '/path/to/module1' }, // Same path, different name
];

const result = ModuleConfigUtil.deduplicateModules(modules);
// Result: 1 module, first occurrence kept
```

### Use Cases

#### 1. Plugin/Config Module Scanner

```typescript
// In ModuleScanner.loadModuleReferences()
return ModuleConfigUtil.deduplicateModules(allModuleReferences);
// Automatically handles deduplication with optimal defaults
```

#### 2. Standalone Runner

```typescript
// In Runner.getModuleReferences()
return ModuleConfigUtil.deduplicateModules(allModuleReferences);
// Simple and reliable deduplication
```

#### 3. Error Handling

```typescript
try {
  const result = ModuleConfigUtil.deduplicateModules(modules);
} catch (error) {
  if (error.message.includes('Duplicate module name')) {
    // Handle duplicate module name error
    console.error('Configuration error:', error.message);
  }
  throw error;
}
```

### Benefits

1. **Simplicity**: No complex configuration needed, works out of the box
2. **Reliability**: Consistent behavior across different use cases
3. **Performance**: Optimized for common scenarios
4. **Error Prevention**: Catches configuration errors early
5. **Maintainability**: Simple API reduces complexity

### Migration from Options-based API

#### Before (Options-based - Not Available)
```typescript
// This API never existed in the actual implementation
const result = ModuleConfigUtil.deduplicateModules(modules, {
  prioritizeNonOptional: true,
  allowNameDuplicates: false,
  logPrefix: '[tegg/config]',
  logger: customLogger,
});
```

#### After (Current Implementation)
```typescript
// Current implementation - simple and direct
const result = ModuleConfigUtil.deduplicateModules(modules);
// Automatically handles all deduplication logic
```

### Important Notes

- **No Options**: The method signature is fixed and does not accept configuration options
- **Error on Name Duplicates**: Duplicate names with different paths will cause an error
- **Automatic Priority**: Non-optional modules are automatically prioritized over optional ones
- **Path-based Deduplication**: Same path modules are deduplicated with smart priority handling
