# PackFS Features

## Core Features

### 1. [Semantic Filesystem Operations](../architecture/components/semantic-filesystem.md)
- Natural language file operations
- Intent-based API design
- Multiple targeting methods (path, pattern, semantic query, criteria)

### 2. [Multi-Backend Support](../architecture/components/backends.md)
- Memory backend for testing/temporary operations
- Disk backend with persistent storage
- Extensible backend interface

### 3. [Framework Integrations](../architecture/components/framework-integrations.md)
- Mastra (TypeScript-first, native integration)
- LangChain.js (DynamicTool interface)
- LlamaIndex.TS (FunctionTool interface)
- KaibanJS (Multi-agent support)

### 4. [Logging System](./logging-system.md)
- Configurable log levels
- Multiple transport types
- Hierarchical loggers
- Minimal performance overhead

### 5. [Error Recovery Suggestions](./error-recovery-suggestions.md) ⭐ NEW
- Intelligent suggestions when operations fail
- Directory listings, fuzzy matching, alternative paths
- Reduces LLM token usage and retry attempts
- 83% test coverage

### 6. [Semantic Indexing](../architecture/components/semantic-indexing.md)
- Keyword extraction and indexing
- Content-based file discovery
- Persistent index with incremental updates

### 7. [Security Features](../architecture/security-design.md)
- Path validation and sandboxing
- File size limits
- Extension filtering
- Rate limiting (in Mastra integration)

## Enhanced Features (Experimental)

### 8. [Compression Strategies](./compression-strategies.md)
- Brotli, LZ4, and Zstandard support
- Intelligent compression selection
- Content-aware compression

### 9. [Hybrid Storage](./hybrid-storage.md)
- Hot/cold data separation
- Automatic tiering
- Performance optimization

## Feature Status

| Feature | Status | Version Added | Test Coverage |
|---------|--------|---------------|---------------|
| Semantic Operations | ✅ Stable | v0.1.7 | High |
| Framework Integrations | ✅ Stable | v0.1.7-v0.1.12 | High |
| Logging System | ✅ Stable | v0.1.17 | Medium |
| Error Recovery | ✅ Stable | v0.1.21* | High (83%) |
| Compression | 🚧 Experimental | v0.1.18 | Low |
| Hybrid Storage | 🚧 Experimental | v0.1.18 | Low |

*Pending release

## Usage Patterns

### Basic Usage
```typescript
const fs = createFileSystem({ workingDirectory: '/project' });
const content = await fs.accessFile({
  purpose: 'read',
  target: { path: 'README.md' }
});
```

### With Error Recovery
```typescript
const result = await fs.accessFile({
  purpose: 'read',
  target: { path: 'non-existent.md' }
});
// Automatically includes suggestions for what to do next
```

### Framework Integration
```typescript
const tools = createMastraSemanticToolSuite({
  workingDirectory: '/project'
});
// Use with any Mastra agent
```