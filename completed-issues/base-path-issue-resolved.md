# PackFS Dynamic Working Directory Issue [RESOLVED]

## Resolution Summary

**Status**: ✅ Resolved  
**Solution**: Implemented Option 1 - Parameter-Based Working Directory  
**Date**: 2025-06-22  

### What Was Done

1. **Updated DiskSemanticBackend** to accept `workingDirectory` parameter in operation options
2. **Modified all intent types** to support the workingDirectory option
3. **Updated Mastra integration** to pass through workingDirectory parameter
4. **Maintained backward compatibility** - existing code continues to work unchanged
5. **Added comprehensive tests** demonstrating multi-project support
6. **Created documentation** explaining the new feature

### How It Works Now

```typescript
// Single tool instance can access multiple projects
const result = await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'context-network/discovery.md' },
  workingDirectory: '/projects/project-a'  // Runtime override
});
```

### Files Modified

- `/src/semantic/disk-semantic-backend.ts` - Added runtime path support
- `/src/semantic/types.ts` - Added workingDirectory to intent options
- `/src/integrations/mastra.ts` - Updated to pass workingDirectory parameter
- `/src/semantic/dynamic-working-directory.test.ts` - New test suite
- `/docs/DYNAMIC_WORKING_DIRECTORY.md` - New documentation
- `/README.md` - Added feature announcement

---

# PackFS Dynamic Working Directory Issue

## Issue Summary

The Mastra integration of PackFS (`createMastraSemanticFilesystemTool`) creates a singleton tool with a fixed working directory at module initialization time. This prevents the tool from being used with different context networks within the same application.

## Current Behavior

```typescript
// Current implementation in packfsTool.ts
const workingDirectory = '/workspaces/packfs-test-client/context-network';
const semanticBackend = new DiskSemanticBackend(workingDirectory, {...});
const packfsTool = createMastraSemanticFilesystemTool({
  workingDirectory: workingDirectory,
  filesystem: semanticBackend
});
```

The tool is initialized once with a hardcoded path and cannot be reconfigured for different working directories during runtime.

## Impact

When working with multiple projects that each have their own context networks:

- Project A: `/projects/project-a/context-network/`
- Project B: `/projects/project-b/context-network/`
- Main: `/context-network/`

All PackFS operations always use the initially configured directory, causing cross-contamination between projects.

## Discovered During

Testing the context network workflow with the Transmission Zero project. The workflow correctly identifies project-specific context networks, but the PackFS tool continues to operate on the main context network regardless of which project is being processed.

## Reproduction

1. Initialize PackFS tool with main context network path
2. Create workflow that processes multiple projects
3. Observe that all file operations occur in the main context network, not project-specific ones

## Suggested Solutions

### Option 1: Parameter-Based Working Directory

Allow the working directory to be specified per operation:

```typescript
const result = await packfsTool.execute({
  workingDirectory: "/projects/transmission-zero/context-network",
  operation: "access",
  target: { path: "discovery.md" },
});
```

### Option 2: Tool Factory Pattern

Provide a factory function to create tool instances:

```typescript
const createPackfsTool = (workingDirectory: string) => {
  const backend = new DiskSemanticBackend(workingDirectory, {...});
  return createMastraSemanticFilesystemTool({
    workingDirectory,
    filesystem: backend
  });
};

// Usage
const projectTool = createPackfsTool('/projects/project-a/context-network');
```

### Option 3: Context-Aware Tool

Make the tool context-aware, allowing it to switch working directories:

```typescript
packfsTool.setWorkingDirectory("/projects/project-b/context-network");
// All subsequent operations use the new directory
```

### Option 4: Scoped Operations

Support scoped operations with a base path:

```typescript
const result = await packfsTool.executeInDirectory(
  "/projects/transmission-zero/context-network",
  async (scopedTool) => {
    return await scopedTool.execute({
      operation: "access",
      target: { path: "discovery.md" },
    });
  }
);
```

## Workaround Attempts

Currently working around this by:

1. Using absolute paths in operations (doesn't work - PackFS normalizes to relative)
2. Creating separate tool instances (not possible with current API)
3. Modifying the singleton at runtime (breaks encapsulation)

## Recommendation

The parameter-based approach (Option 1) would be most flexible and backward-compatible. Existing code would continue to work with the default working directory, while new code could specify project-specific directories as needed.

## Related Code

- Tool creation: `packfsTool.ts`
- Workflow using multiple projects: `contextNetworkFlow.ts`
- Agent needing dynamic context networks: `contextNetworkAgent.ts`

## Testing Considerations

Any solution should:

1. Maintain backward compatibility
2. Support concurrent operations on different directories
3. Handle initialization of semantic backends efficiently
4. Provide clear error messages for invalid directories

## Priority

High - This limitation prevents PackFS from being used effectively in multi-project environments or any scenario requiring dynamic filesystem contexts.

## Scaling Requirements

This issue becomes critical when scaling to production use cases:

- Managing dozens or hundreds of project context networks
- Multiple agents operating concurrently on different projects
- Per-request context switching (agent handles Project A, then Project B)
- Thread-safe operations across different filesystem contexts
- Resource-efficient handling without creating hundreds of backend instances

The current singleton pattern fundamentally blocks using PackFS as the foundation for multi-project agent systems.

## Core Design Issue

The working directory should be a runtime parameter, not a compile-time/initialization-time configuration. The current design assumes a single, static filesystem context, but real-world usage requires dynamic context switching based on:

- Which project is being accessed
- Which user is making the request
- Which environment is active (dev/staging/prod)
- Which tenant in a multi-tenant system

Making this a runtime parameter would align PackFS with standard filesystem operations where the path context is always part of the operation, not baked into the tool itself.
