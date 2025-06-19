# PackFS Mastra Tool Integration Improvements

## Executive Summary

Based on analysis of the PackFS Test Client project, this document outlines specific improvements needed in the PackFS library to better support Mastra framework integration. The current implementation requires significant boilerplate code and custom wrapper classes that could be eliminated with native Mastra support.

## Current Implementation Analysis

### Existing Challenges

1. **Custom Wrapper Requirements**: Projects must implement custom wrapper classes like `SimpleFilesystemWrapper` to bridge PackFS and Mastra patterns
2. **Boilerplate Code**: Each project recreates similar filesystem operation patterns
3. **Inconsistent Error Handling**: No standardized error patterns for Mastra tool integration
4. **Schema Duplication**: Zod schemas must be manually created for each tool implementation
5. **Security Pattern Inconsistency**: Each project implements its own security validation approach

### Current Pattern Analysis

From the context-network-tools.ts implementation:

```typescript
// Current approach requires 160+ lines of wrapper code
class SimpleFilesystemWrapper {
  constructor(private rootPath: string) {}

  async accessFile(intent: {
    purpose: string;
    target: { path: string };
    preferences?: any;
  }) {
    // Custom implementation...
  }

  async discoverFiles(intent: {
    purpose: string;
    target: { path: string };
    options?: any;
  }) {
    // Custom implementation...
  }

  async updateContent(intent: {
    purpose: string;
    target: { path: string };
    content: string;
    options?: any;
  }) {
    // Custom implementation...
  }
}
```

This pattern is repeated across multiple projects, indicating a need for standardization.

## Proposed PackFS Library Enhancements

### 1. Native Mastra Tool Factory

**Implementation**: Add a new export to PackFS core:

```typescript
// packfs-core/mastra/index.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export interface PackfsToolConfig {
  rootPath: string;
  permissions: ("read" | "write" | "search" | "list")[];
  schemas?: {
    access?: z.ZodSchema;
    discover?: z.ZodSchema;
    update?: z.ZodSchema;
  };
  security?: {
    validatePath?: (path: string) => boolean;
    maxFileSize?: number;
    allowedExtensions?: string[];
  };
}

export function createPackfsTools(config: PackfsToolConfig) {
  const packfs = new PackFS({ rootPath: config.rootPath });

  const tools = {};

  if (config.permissions.includes("read")) {
    tools.fileReader = createTool({
      id: "packfs-file-reader",
      description: "Read files through PackFS with security validation",
      inputSchema: config.schemas?.access ?? defaultAccessSchema,
      outputSchema: standardOutputSchema,
      execute: async ({ context }) => {
        return packfs.access(context);
      },
    });
  }

  if (config.permissions.includes("search")) {
    tools.fileSearcher = createTool({
      id: "packfs-file-searcher",
      description: "Search files and content through PackFS",
      inputSchema: config.schemas?.discover ?? defaultDiscoverSchema,
      outputSchema: searchOutputSchema,
      execute: async ({ context }) => {
        return packfs.discover(context);
      },
    });
  }

  if (config.permissions.includes("write")) {
    tools.fileWriter = createTool({
      id: "packfs-file-writer",
      description: "Create and update files through PackFS",
      inputSchema: config.schemas?.update ?? defaultUpdateSchema,
      outputSchema: updateOutputSchema,
      execute: async ({ context }) => {
        return packfs.update(context);
      },
    });
  }

  return tools;
}
```

### 2. Standardized Intent-Based API

**Implementation**: Enhance PackFS core with consistent intent patterns:

```typescript
// packfs-core/intents.ts
export interface AccessIntent {
  purpose: "read" | "metadata" | "exists";
  target: {
    path: string;
    encoding?: string;
  };
  preferences?: {
    includeMetadata?: boolean;
    maxSize?: number;
  };
}

export interface DiscoverIntent {
  purpose: "list" | "search_content" | "search_semantic";
  target: {
    path: string;
    query?: string;
    criteria?: {
      content?: string;
      extension?: string;
      modified?: { after?: Date; before?: Date };
    };
  };
  options?: {
    recursive?: boolean;
    maxResults?: number;
    includeContent?: boolean;
  };
}

export interface UpdateIntent {
  purpose: "create" | "update" | "append" | "delete";
  target: {
    path: string;
  };
  content?: string;
  options?: {
    createPath?: boolean;
    backup?: boolean;
    atomic?: boolean;
  };
}
```

### 3. Pre-Built Zod Schemas

**Implementation**: Export ready-to-use schemas:

```typescript
// packfs-core/mastra/schemas.ts
import { z } from "zod";

export const accessSchema = z.object({
  path: z.string().describe("Path to the file or directory"),
  operation: z
    .enum(["read", "metadata", "exists"])
    .describe("Type of access operation"),
  includeMetadata: z
    .boolean()
    .optional()
    .describe("Include file metadata in response"),
  encoding: z.string().optional().describe("Text encoding for file content"),
});

export const discoverSchema = z.object({
  path: z.string().describe("Directory path to search within"),
  operation: z.enum(["list", "search"]).describe("Discovery operation type"),
  query: z.string().optional().describe("Search query for content matching"),
  recursive: z
    .boolean()
    .optional()
    .describe("Search subdirectories recursively"),
  maxResults: z
    .number()
    .optional()
    .describe("Maximum number of results to return"),
  includeContent: z
    .boolean()
    .optional()
    .describe("Include file content in results"),
});

export const updateSchema = z.object({
  path: z.string().describe("Path where to create/update the file"),
  content: z.string().describe("File content to write"),
  operation: z
    .enum(["create", "update", "append"])
    .describe("Update operation type"),
  createPath: z
    .boolean()
    .optional()
    .describe("Create parent directories if needed"),
  backup: z.boolean().optional().describe("Create backup before updating"),
});

// Standardized output schemas
export const fileOutputSchema = z.object({
  success: z.boolean(),
  exists: z.boolean().optional(),
  content: z.string().optional(),
  metadata: z
    .object({
      size: z.number(),
      modified: z.string(),
      type: z.string(),
      permissions: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export const searchOutputSchema = z.object({
  success: z.boolean(),
  results: z.array(
    z.object({
      path: z.string(),
      type: z.enum(["file", "directory"]),
      content: z.string().optional(),
      snippet: z.string().optional(),
      relevance: z.number().optional(),
      metadata: z
        .object({
          size: z.number(),
          modified: z.string(),
        })
        .optional(),
    })
  ),
  totalResults: z.number(),
  error: z.string().optional(),
});
```

### 4. Enhanced Security Integration

**Implementation**: Build security directly into the tool factory:

```typescript
// packfs-core/mastra/security.ts
export interface SecurityConfig {
  rootPath: string;
  allowedPaths?: string[];
  blockedPaths?: string[];
  maxFileSize?: number;
  allowedExtensions?: string[];
  rateLimiting?: {
    maxRequests: number;
    windowMs: number;
  };
}

export class MastraSecurityValidator {
  constructor(private config: SecurityConfig) {}

  validatePath(path: string): { valid: boolean; reason?: string } {
    // Validate path is within root
    const resolved = resolve(this.config.rootPath, path);
    if (!resolved.startsWith(this.config.rootPath)) {
      return { valid: false, reason: "Path outside allowed root" };
    }

    // Check allowed/blocked paths
    if (
      this.config.blockedPaths?.some((blocked) => resolved.includes(blocked))
    ) {
      return { valid: false, reason: "Path is blocked" };
    }

    return { valid: true };
  }

  validateOperation(intent: AccessIntent | DiscoverIntent | UpdateIntent): {
    valid: boolean;
    reason?: string;
  } {
    // Validate file size limits, extensions, etc.
    return { valid: true };
  }
}
```

### 5. Context Network Semantic Support

**Implementation**: Add specialized support for structured content:

```typescript
// packfs-core/mastra/semantic.ts
export interface DocumentRelationships {
  parent: string[];
  children: string[];
  related: string[];
}

export class SemanticProcessor {
  static extractRelationships(content: string): DocumentRelationships {
    // Implementation for extracting markdown relationships
  }

  static mergeRelationships(
    newContent: string,
    existing: DocumentRelationships
  ): string {
    // Implementation for preserving relationships during updates
  }

  static calculateRelevance(content: string, query: string): number {
    // Semantic relevance scoring
  }
}

// Enhanced search with semantic capabilities
export function createSemanticSearchTool(config: PackfsToolConfig) {
  return createTool({
    id: "packfs-semantic-search",
    description: "Search with semantic understanding of document relationships",
    inputSchema: z.object({
      query: z.string(),
      scope: z.string().optional(),
      followRelationships: z.boolean().optional(),
      maxDepth: z.number().optional(),
    }),
    outputSchema: z.object({
      results: z.array(
        z.object({
          path: z.string(),
          relevance: z.number(),
          relationships: z
            .object({
              parent: z.array(z.string()),
              children: z.array(z.string()),
              related: z.array(z.string()),
            })
            .optional(),
          content: z.string().optional(),
        })
      ),
      relationshipMap: z.record(z.array(z.string())).optional(),
    }),
    execute: async ({ context }) => {
      // Semantic search implementation
    },
  });
}
```

## Usage Example

With these improvements, the current 160+ line wrapper implementation becomes:

```typescript
// Simplified implementation in consuming projects
import { createPackfsTools } from "packfs-core/mastra";

export const {
  fileReader: contextNetworkNavigator,
  fileSearcher: contextNetworkSearcher,
  fileWriter: contextNetworkUpdater,
} = createPackfsTools({
  rootPath: "/workspaces/packfs-test-client/context-network",
  permissions: ["read", "write", "search"],
  security: {
    maxFileSize: 1024 * 1024, // 1MB
    allowedExtensions: [".md", ".txt", ".json"],
  },
});

// Tools are immediately ready for Mastra agent registration
export const contextNetworkAgent = new Agent({
  name: "Context Network Agent",
  tools: {
    contextNetworkNavigator,
    contextNetworkSearcher,
    contextNetworkUpdater,
  },
  // ... rest of agent config
});
```

## Implementation Priority

1. **High Priority**: Native Mastra tool factory and standardized intent API
2. **High Priority**: Pre-built Zod schemas and security integration
3. **Medium Priority**: Semantic processing capabilities
4. **Low Priority**: Advanced features like relationship mapping and batch operations

## Migration Path

1. **Phase 1**: Add new Mastra integration module alongside existing API
2. **Phase 2**: Update documentation and examples to use new patterns
3. **Phase 3**: Deprecate old patterns while maintaining backward compatibility
4. **Phase 4**: Remove deprecated code in next major version

## Expected Benefits

- **90% reduction** in boilerplate code for Mastra integrations
- **Consistent security patterns** across all PackFS-using projects
- **Improved developer experience** with ready-to-use tools
- **Better maintainability** through standardized approaches
- **Enhanced performance** through optimized implementations

This enhancement would make PackFS the go-to filesystem library for Mastra-based projects, significantly reducing integration complexity while improving security and consistency.
