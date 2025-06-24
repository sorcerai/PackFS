# Dynamic Working Directory Support

## Overview

PackFS now supports runtime-configurable working directories, allowing the same tool instance to operate on different project directories without requiring reinitialization. This feature addresses the limitations of the previous singleton pattern and enables multi-project workflows.

## Problem Statement

Previously, PackFS tools were initialized with a fixed working directory at startup:

```typescript
const backend = new DiskSemanticBackend('/main/context-network');
const tool = createMastraSemanticFilesystemTool({
  workingDirectory: '/main/context-network',
  filesystem: backend
});
```

This approach prevented the tool from accessing files in different project directories during runtime, making it unsuitable for multi-project agent systems.

## Solution

PackFS now supports a `workingDirectory` parameter that can be specified per operation:

```typescript
// Read from project A
const resultA = await tool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'config.json' },
  workingDirectory: '/projects/project-a'
});

// Read from project B
const resultB = await tool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'config.json' },
  workingDirectory: '/projects/project-b'
});
```

## Usage Examples

### Basic File Access

```typescript
// Using default working directory
const result1 = await tool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'README.md' }
});

// Using custom working directory
const result2 = await tool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'README.md' },
  workingDirectory: '/projects/my-project'
});
```

### Natural Language Queries

```typescript
// Natural language with custom directory
const result = await tool.execute({
  naturalLanguageQuery: 'read the configuration file',
  workingDirectory: '/projects/project-a'
});
```

### Multi-Project Workflows

```typescript
// Workflow that processes multiple projects
async function processProjects(projects: string[]) {
  for (const projectPath of projects) {
    // Read project-specific context
    const context = await tool.execute({
      operation: 'access',
      purpose: 'read',
      target: { path: 'context-network/discovery.md' },
      workingDirectory: projectPath
    });
    
    // Process based on project context
    await processProjectContext(context);
  }
}

// Usage
await processProjects([
  '/projects/project-a',
  '/projects/project-b',
  '/projects/project-c'
]);
```

### Concurrent Operations

The dynamic working directory feature is thread-safe and supports concurrent operations:

```typescript
// Concurrent operations on different directories
const operations = projects.map(projectPath => 
  tool.execute({
    operation: 'discover',
    purpose: 'list',
    target: { path: '.' },
    workingDirectory: projectPath
  })
);

const results = await Promise.all(operations);
```

## Implementation Details

### Backward Compatibility

The implementation maintains full backward compatibility:
- If no `workingDirectory` is specified, operations use the default directory from initialization
- Existing code continues to work without modification

### Index Behavior

- Operations using the default working directory update the semantic index
- Operations with custom `workingDirectory` do NOT update the index (to avoid index pollution)
- This ensures the semantic index remains focused on the primary workspace

### Supported Operations

All PackFS operations support the `workingDirectory` parameter:
- **File Access**: read, preview, metadata, verify_exists, create_or_get
- **Content Update**: create, append, overwrite, merge, patch
- **Discovery**: list, find, search_content, search_semantic
- **Organization**: create_directory, move, copy
- **Removal**: delete_file, delete_directory

## API Reference

### Parameter Format

```typescript
{
  // Standard operation parameters
  operation: 'access' | 'update' | 'discover' | 'organize' | 'remove',
  purpose: string,
  target: { path: string },
  
  // Optional working directory override
  workingDirectory?: string  // Absolute path to working directory
}
```

### Tool Creation

No changes required to tool creation:

```typescript
// Create tool as before
const tool = createMastraSemanticFilesystemTool({
  workingDirectory: '/default/workspace',
  filesystem: semanticBackend
});
```

## Use Cases

### 1. Multi-Project Agent Systems

Agents that manage multiple projects can now use a single PackFS instance:

```typescript
class ProjectManager {
  async analyzeProject(projectPath: string) {
    const files = await this.packfsTool.execute({
      operation: 'discover',
      purpose: 'search_semantic',
      target: { semanticQuery: 'architecture documentation' },
      workingDirectory: projectPath
    });
    
    return this.generateReport(files);
  }
}
```

### 2. Dynamic Environment Switching

Switch between development, staging, and production environments:

```typescript
const env = process.env.NODE_ENV;
const workingDirectory = {
  development: '/workspace/dev',
  staging: '/workspace/staging',
  production: '/workspace/prod'
}[env];

const result = await tool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'config.json' },
  workingDirectory
});
```

### 3. User-Specific Workspaces

In multi-tenant systems, each user can have their own workspace:

```typescript
async function getUserFile(userId: string, filePath: string) {
  const userWorkspace = `/workspaces/users/${userId}`;
  
  return await tool.execute({
    operation: 'access',
    purpose: 'read',
    target: { path: filePath },
    workingDirectory: userWorkspace
  });
}
```

## Best Practices

1. **Use Absolute Paths**: Always provide absolute paths for `workingDirectory`
2. **Validate Directories**: Ensure the directory exists before operations
3. **Security**: Implement proper access controls when using dynamic directories
4. **Caching**: Consider caching frequently accessed directories for performance

## Migration Guide

Existing code requires no changes. To use dynamic directories:

1. Add the `workingDirectory` parameter to your operation calls
2. Ensure the parameter is an absolute path
3. Test concurrent operations if using multiple directories

## Limitations

1. Semantic indexing only works with the default directory
2. The `workingDirectory` must be an absolute path
3. Cross-directory operations (e.g., copy from one dynamic directory to another) require multiple calls

## Future Enhancements

Potential future improvements:
- Support for relative paths in `workingDirectory`
- Per-directory semantic indexing
- Cross-directory operation support
- Directory-specific caching strategies