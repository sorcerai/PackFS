# Multi-Project Usage Guide for PackFS

## Overview

PackFS v0.2.1+ supports dynamic working directories, allowing agents and applications to work with multiple projects without reinitializing the filesystem backend. This is achieved through the `workingDirectory` parameter available in all operations.

**Note**: The enhanced documentation and clearer agent instructions described in this guide are available in v0.2.2+

## Key Features

### Runtime Context Switching
The `workingDirectory` parameter allows you to specify which project directory to operate on at runtime:

```javascript
// Access files from different projects in the same application
const projectAFile = await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'README.md' },
  workingDirectory: '/projects/project-a'
});

const projectBFile = await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'README.md' },
  workingDirectory: '/projects/project-b'
});
```

### Concurrent Operations
Multiple agents can operate on different projects simultaneously:

```javascript
// Agent 1 working on Project A
const agent1Task = packfsTool.execute({
  operation: 'discover',
  purpose: 'search_semantic',
  target: { query: 'configuration files' },
  workingDirectory: '/projects/project-a/context-network'
});

// Agent 2 working on Project B
const agent2Task = packfsTool.execute({
  operation: 'update',
  purpose: 'create',
  target: { path: 'notes.md' },
  content: 'Project B notes',
  workingDirectory: '/projects/project-b/context-network'
});

// Both operations run concurrently
const [result1, result2] = await Promise.all([agent1Task, agent2Task]);
```

## Integration with AI Agents

### Agent Prompt Instructions
When instructing AI agents to use PackFS, include clear guidance about the `workingDirectory` parameter:

```javascript
const agentPrompt = `
You have access to a semantic filesystem tool. When using this tool, ALWAYS include the workingDirectory parameter set to: ${projectPath}

Example tool usage:
{
  "operation": "access",
  "purpose": "read",
  "target": { "path": "context-network/discovery.md" },
  "workingDirectory": "${projectPath}"
}
`;
```

### Mastra Integration Example
```javascript
import { createMastraTools } from '@packfs/core';

// Create tool with default working directory
const packfsTool = createMastraTools({ 
  workingDirectory: '/default/path' 
})[0];

// Override per operation
const result = await packfsTool.execute({
  operation: 'discover',
  purpose: 'list',
  target: { path: '.' },
  workingDirectory: '/specific/project/path'
});
```

## Common Use Cases

### 1. Context Network Management
Managing multiple context networks for different projects:

```javascript
const contextNetworks = [
  '/projects/transmission-zero/context-network',
  '/projects/packfs/context-network',
  '/projects/agent-framework/context-network'
];

// Search across all context networks
const searchResults = await Promise.all(
  contextNetworks.map(network => 
    packfsTool.execute({
      operation: 'discover',
      purpose: 'search_semantic',
      target: { query: 'architecture decisions' },
      workingDirectory: network
    })
  )
);
```

### 2. Multi-Tenant Applications
Supporting multiple tenants with isolated filesystems:

```javascript
async function handleTenantRequest(tenantId, request) {
  const tenantPath = `/data/tenants/${tenantId}`;
  
  return await packfsTool.execute({
    ...request,
    workingDirectory: tenantPath
  });
}
```

### 3. Environment-Specific Operations
Working with different environments:

```javascript
const environments = {
  dev: '/environments/development',
  staging: '/environments/staging',
  prod: '/environments/production'
};

async function deployConfig(env, config) {
  return await packfsTool.execute({
    operation: 'update',
    purpose: 'overwrite',
    target: { path: 'config.json' },
    content: JSON.stringify(config),
    workingDirectory: environments[env]
  });
}
```

## Best Practices

### 1. Always Specify Working Directory
Even if using a default, explicitly specify the working directory for clarity:

```javascript
// Good
const result = await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'file.txt' },
  workingDirectory: '/my/project'
});

// Avoid (relies on default)
const result = await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'file.txt' }
});
```

### 2. Use Absolute Paths
Always use absolute paths for the `workingDirectory`:

```javascript
// Good
workingDirectory: '/home/user/projects/my-project'

// Avoid
workingDirectory: './my-project'
workingDirectory: '~/projects/my-project'
```

### 3. Validate Paths
Validate that the working directory exists before operations:

```javascript
async function safeExecute(params) {
  // First check if directory exists
  const checkResult = await packfsTool.execute({
    operation: 'access',
    purpose: 'verify_exists',
    target: { path: '.' },
    workingDirectory: params.workingDirectory
  });
  
  if (!checkResult.exists) {
    throw new Error(`Working directory not found: ${params.workingDirectory}`);
  }
  
  // Proceed with actual operation
  return await packfsTool.execute(params);
}
```

## Migration from v0.1.x

If you're upgrading from v0.1.x which used a singleton pattern:

### Before (v0.1.x)
```javascript
// Fixed at initialization
const packfs = createPackFS('/fixed/path');
// All operations use /fixed/path
```

### After (v0.2.1+, enhanced in v0.2.2)
```javascript
// Initialize with default
const packfsTool = createMastraTools({ 
  workingDirectory: '/default/path' 
})[0];

// Override per operation
await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'file.txt' },
  workingDirectory: '/dynamic/path'
});
```

## Troubleshooting

### Issue: Agent doesn't use workingDirectory
**Problem**: AI agents don't include the `workingDirectory` parameter in their tool calls.

**Solution**: Update agent instructions to explicitly mention the parameter:
```javascript
const instruction = `IMPORTANT: Always include "workingDirectory": "${projectPath}" in every filesystem tool call.`;
```

### Issue: Operations use wrong directory
**Problem**: Operations execute in the default directory instead of specified one.

**Solution**: Ensure you're using PackFS v0.2.1+ and the parameter is at the top level:
```javascript
// Correct
{
  operation: 'access',
  workingDirectory: '/my/path',  // Top level
  target: { path: 'file.txt' }
}

// Incorrect
{
  operation: 'access',
  target: { path: 'file.txt' },
  options: {
    workingDirectory: '/my/path'  // Not in options!
  }
}
```

### Issue: Performance with many directories
**Problem**: Switching between many directories impacts performance.

**Solution**: The semantic backend maintains separate indices per directory. For optimal performance:
- Limit the number of unique working directories
- Consider implementing a cache layer for frequently accessed directories
- Use the discovery operations to batch file operations

## Future Enhancements

While the current implementation supports dynamic working directories, future versions may include:

1. **Factory Pattern**: Create separate instances for different projects
2. **Connection Pooling**: Manage multiple backend instances efficiently
3. **Workspace Management**: Higher-level APIs for project workspace management
4. **Context Inheritance**: Inherit context from parent directories

## Example: Complete Multi-Project Agent

Here's a complete example of an agent that manages multiple projects:

```javascript
import { createMastraTools } from '@packfs/core';

class MultiProjectAgent {
  constructor() {
    this.tool = createMastraTools({ 
      workingDirectory: '/workspace' 
    })[0];
  }

  async analyzeProject(projectPath) {
    // Discover project structure
    const structure = await this.tool.execute({
      operation: 'discover',
      purpose: 'list',
      target: { path: '.' },
      workingDirectory: projectPath
    });

    // Find configuration files
    const configs = await this.tool.execute({
      operation: 'discover',
      purpose: 'find',
      target: { pattern: '*.config.*' },
      workingDirectory: projectPath
    });

    // Read main documentation
    const readme = await this.tool.execute({
      operation: 'access',
      purpose: 'read',
      target: { path: 'README.md' },
      workingDirectory: projectPath
    });

    return {
      structure: structure.results,
      configurations: configs.results,
      documentation: readme.content
    };
  }

  async compareProjects(projectA, projectB) {
    const [analysisA, analysisB] = await Promise.all([
      this.analyzeProject(projectA),
      this.analyzeProject(projectB)
    ]);

    return {
      projectA: analysisA,
      projectB: analysisB,
      comparison: this.generateComparison(analysisA, analysisB)
    };
  }
}

// Usage
const agent = new MultiProjectAgent();
const comparison = await agent.compareProjects(
  '/projects/transmission-zero',
  '/projects/packfs'
);
```

This pattern allows agents to work across multiple projects efficiently while maintaining clean separation of concerns.