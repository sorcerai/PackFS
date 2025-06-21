# PackFS v0.2.0 Examples

This directory contains comprehensive examples showing input/output patterns for PackFS v0.2.0 with its new **flat output structure** that ensures LLM compatibility.

## 🚀 What's New in v0.2.0

The most important change in v0.2.0 is the **flattened output structure**. All operational data (content, files, exists, etc.) now appears at the top level of responses, making PackFS fully compatible with LLMs like GPT-4, Claude, and Llama.

### Before (v0.1.x - LLMs couldn't access):
```json
{
  "success": true,
  "data": {
    "content": "file content",  // ❌ LLMs failed to find this
    "exists": true
  }
}
```

### After (v0.2.0 - LLM friendly):
```json
{
  "success": true,
  "content": "file content",    // ✅ Direct access
  "exists": true,
  "metadata": { ... }          // Only metadata remains nested
}
```

## 📚 Example Documentation

### Core Library
- **[Base PackFS Examples](./base-packfs-examples.md)** - Direct usage of the semantic filesystem
  - File access operations (read, preview, metadata, exists)
  - Content updates (create, append, overwrite)
  - File discovery (list, find, search, semantic search)
  - File organization (move, copy, create directories)
  - Natural language operations

### Framework Integrations

#### [Mastra Integration](./mastra-integration-examples.md)
Modern TypeScript framework for building AI agents
- Single tool usage with natural language
- Tool suite (fileReader, fileWriter, fileSearcher, fileOrganizer)
- Agent integration patterns
- Performance monitoring

#### [LangChain Integration](./langchain-integration-examples.md)
Popular framework for building LLM applications
- String-based natural language inputs
- Structured object inputs
- Tool sets for specialized operations
- Chain and agent integration
- Streaming responses

#### [LlamaIndex Integration](./llamaindex-integration-examples.md)
Data framework for LLM applications
- Function tool format
- ToolSpec format
- Tool suite usage
- Query engine integration
- Chat engine integration

#### [KaibanJS Integration](./kaiban-integration-examples.md)
Multi-agent orchestration framework
- Single agent tools
- Task actions
- Multi-agent coordination
- Collaborative workflows
- State management

## 🎯 Quick Start Examples

### Read a File (All Frameworks)

**Mastra:**
```typescript
const result = await packfsTool.execute({
  naturalLanguageQuery: "read the README file"
});
console.log(result.content); // Direct access in v0.2.0!
```

**LangChain:**
```typescript
const result = await packfsTool.func("read the README file");
// Returns formatted string with content
```

**LlamaIndex:**
```typescript
const result = await packfsTool.call({
  query: "read the README file"
});
console.log(result.content); // Direct access in v0.2.0!
```

**KaibanJS:**
```typescript
const result = await packfsTool.execute({
  query: "read the README file",
  agentContext: { agentId: 'reader' }
});
console.log(result.content); // Direct access in v0.2.0!
```

## 🔄 Migration from v0.1.x

If you're upgrading from v0.1.x, the main change is removing `.data` from property access:

```typescript
// Old (v0.1.x)
const content = result.data.content;
const exists = result.data.exists;

// New (v0.2.0)
const content = result.content;
const exists = result.exists;
```

See the [Migration Guide](../MIGRATION_v1.0.0.md) for detailed instructions.

## 💡 Common Patterns

### 1. Natural Language File Operations
All integrations support natural language queries that are interpreted into structured operations:
- "Read the configuration file"
- "Find all test files"
- "Create a new component called UserProfile"
- "Search for files about authentication"

### 2. Structured Operations
For precise control, use structured operations:
```typescript
{
  operation: 'access',
  purpose: 'read',
  target: { path: 'config.json' }
}
```

### 3. Semantic Search
Find files based on meaning, not just keywords:
```typescript
{
  operation: 'discover',
  purpose: 'search_semantic',
  target: { semanticQuery: 'user authentication flow' }
}
```

### 4. Error Handling
All frameworks provide consistent error responses:
```typescript
{
  success: false,
  error: "File not found: config.json",
  suggestions: [
    { path: "config.js", similarity: 0.85 }
  ]
}
```

## 📊 Output Structure Reference

### File Access Response
```typescript
{
  success: boolean;
  content?: string;        // File content (direct access)
  exists: boolean;         // File existence (direct access)
  preview?: string;        // File preview (direct access)
  metadata?: {            // Additional information (nested)
    size: number;
    modified: string;
    type: string;
  };
}
```

### File Search Response
```typescript
{
  success: boolean;
  files: Array<{          // Search results (direct access)
    path: string;
    relevanceScore?: number;
    snippet?: string;
  }>;
  totalFound: number;     // Result count (direct access)
  searchTime: number;     // Performance metric (direct access)
  metadata?: {...};       // Additional info (nested)
}
```

### File Update Response
```typescript
{
  success: boolean;
  created: boolean;       // Creation status (direct access)
  path: string;          // File path (direct access)
  bytesWritten: number;  // Bytes written (direct access)
  metadata?: {...};      // Additional info (nested)
}
```

## 🛠️ Testing Examples

Each example document includes real-world scenarios and expected outputs. Use these for:
- Understanding the API
- Testing your integration
- Debugging issues
- Training your LLM agents

## 📈 Performance Tips

1. **Use natural language** for flexibility and ease of use
2. **Use structured operations** for performance and precision
3. **Enable caching** in framework configurations
4. **Batch operations** when possible
5. **Use semantic search** for finding conceptually related files

## 🔗 Related Documentation

- [PackFS README](../../README.md) - Main project documentation
- [API Reference](../api-reference.md) - Detailed API documentation
- [Getting Started Guide](../GETTING_STARTED.md) - Installation and setup
- [Migration Guide](../MIGRATION_v1.0.0.md) - Upgrading from v0.1.x

## 💬 Need Help?

- Check the framework-specific examples for your use case
- Review the error handling sections for troubleshooting
- Open an issue on [GitHub](https://github.com/jwynia/PackFS/issues)

---

*These examples reflect PackFS v0.2.0 with LLM-friendly flat output structure. Last updated: 2024-06-20*