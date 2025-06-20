# PackFS Recursive Directory Indexing Issue Report

**Date:** 2025-06-20  
**Reporter:** PackFS Test Client Project  
**PackFS Version:** @packfs-core 0.1.15  
**Environment:** Mastra Framework v0.10.6, Node.js v22.9.0  

## Executive Summary

PackFS encounters infinite recursion errors when indexing directories during initialization with a valid `workingDirectory`. The `DiskSemanticBackend.indexDirectory` method appears to be stuck in an infinite loop, preventing the filesystem from initializing properly.

## Issue Description

After resolving the initial configuration issue by providing a `workingDirectory` parameter, PackFS now attempts to initialize but fails with stack overflow errors during the directory indexing phase. The error stack trace shows repeated calls to `DiskSemanticBackend.indexDirectory`.

## Error Details

### Stack Trace Pattern
```
at async DiskSemanticBackend.indexDirectory (file:///workspaces/packfs-test-client/packfs-test-client/node_modules/packfs-core/dist/esm/semantic/disk-semantic-backend.js:370:21)
at async DiskSemanticBackend.indexDirectory (file:///workspaces/packfs-test-client/packfs-test-client/node_modules/packfs-core/dist/esm/semantic/disk-semantic-backend.js:367:21)
at async DiskSemanticBackend.indexDirectory (file:///workspaces/packfs-test-client/packfs-test-client/node_modules/packfs-core/dist/esm/semantic/disk-semantic-backend.js:367:21)
[... repeating indefinitely ...]
```

### Configuration Used
```typescript
export const packfsTool = createMastraSemanticFilesystemTool({
  workingDirectory: '/workspaces/packfs-test-client'
});
```

## Potential Causes

1. **Circular Symlinks:** The directory structure might contain symbolic links that create cycles
2. **Missing Base Case:** The recursive indexing function may lack proper termination conditions
3. **Path Resolution Issues:** The indexer might be re-processing the same directories due to path resolution problems
4. **Large Directory Tree:** The workspace might contain deeply nested directories (e.g., node_modules) causing stack overflow

## Impact

This issue completely prevents PackFS from functioning, as the initialization phase never completes. The tool cannot be used for any file operations while this indexing error occurs.

## Affected Functionality

- Tool initialization
- All subsequent file operations (blocked by initialization failure)
- Agent integration (cannot use a tool that fails to initialize)

## Directory Structure Context

The working directory `/workspaces/packfs-test-client` contains:
- Standard Node.js project structure
- node_modules directory (potentially large)
- git repository (.git directory)
- Context network documentation structure
- Nested project subdirectories

## Recommendations

1. **Add Recursion Depth Limit:** Implement a maximum depth for directory traversal
2. **Skip Problematic Directories:** Exclude directories like node_modules, .git by default
3. **Detect and Handle Cycles:** Implement cycle detection for symlinks
4. **Provide Indexing Options:** Allow configuration of which directories to index/skip
5. **Async Initialization:** Consider making indexing asynchronous with progress callbacks

## Workaround Attempts

None successful - the issue occurs during the initialization phase before any operations can be performed.

## Test Environment

- Working Directory: `/workspaces/packfs-test-client`
- Contains: Monorepo structure with nested projects
- File Count: Likely thousands due to node_modules
- Notable Directories: node_modules, .git, context-network, packfs-test-client (nested)

---

This report documents issue #002 encountered during PackFS evaluation testing. This appears to be a critical bug in the directory indexing algorithm that prevents the tool from initializing in real-world project structures.