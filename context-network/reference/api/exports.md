# PackFS API Reference

Generated: 2025-06-20T18:53:59.096Z

## Main Exports

The following items are exported from `packfs-core`:


### Utilities

- `createFileSystem` - from index.ts

## Usage Examples

### Basic Filesystem Creation
```typescript
import { createFileSystem } from 'packfs-core';

const fs = createFileSystem({
  workingDirectory: '/path/to/project'
});
```

### Framework Integration
```typescript
import { createMastraSemanticToolSuite } from 'packfs-core';

const tools = createMastraSemanticToolSuite({
  workingDirectory: '/path/to/project'
});
```

### Direct Backend Usage
```typescript
import { DiskSemanticBackend, MemorySemanticBackend } from 'packfs-core';

const diskFs = new DiskSemanticBackend('/path/to/project');
const memFs = new MemorySemanticBackend();
```
