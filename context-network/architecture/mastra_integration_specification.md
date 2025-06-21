# Mastra Integration Specification

## Purpose
This document provides detailed implementation specifications for the PackFS Mastra native integration layer, including API design, component architecture, and implementation guidelines.

## Classification
- **Domain:** Architecture  
- **Stability:** Semi-stable
- **Abstraction:** Implementation
- **Confidence:** Established

## Content

### Overview

The Mastra integration provides native tool factory support for the Mastra agent framework, eliminating the need for custom wrapper classes and providing a standardized, secure approach to filesystem operations within Mastra agents.

### Architecture Goals

1. **Simplicity**: Reduce integration complexity from 160+ lines to under 20 lines
2. **Security**: Built-in validation and sandboxing at the tool level
3. **Consistency**: Standardized patterns across all PackFS-using Mastra projects
4. **Performance**: Optimized implementations leveraging PackFS internals
5. **Extensibility**: Support for custom schemas and security policies

### Component Structure

```
src/integrations/mastra/
├── index.ts                 # Main exports and tool factory
├── intents/                 # Intent-based API definitions
│   ├── access.ts           # AccessIntent interface and implementation
│   ├── discover.ts         # DiscoverIntent interface and implementation
│   └── update.ts           # UpdateIntent interface and implementation
├── schemas/                # Pre-built Zod schemas
│   ├── access.ts           # Access operation schemas
│   ├── discover.ts         # Discovery operation schemas
│   ├── update.ts           # Update operation schemas
│   └── outputs.ts          # Standardized output schemas
├── security/               # Mastra-specific security layer
│   ├── validator.ts        # MastraSecurityValidator class
│   └── config.ts           # Security configuration types
├── semantic/               # Semantic content processing
│   ├── processor.ts        # Document relationship processing
│   └── search.ts           # Semantic search capabilities
├── tools/                  # Individual tool implementations
│   ├── reader.ts           # File reading tool
│   ├── searcher.ts         # File search/discovery tool
│   └── writer.ts           # File writing tool
└── types.ts                # TypeScript definitions
```

### Core API Design

#### Tool Factory Function

```typescript
export interface PackfsToolConfig {
  rootPath: string;
  permissions: ("read" | "write" | "search" | "list")[];
  schemas?: {
    access?: z.ZodSchema;
    discover?: z.ZodSchema;
    update?: z.ZodSchema;
  };
  security?: SecurityConfig;
  semantic?: SemanticConfig;
}

export interface SecurityConfig {
  maxFileSize?: number;
  allowedExtensions?: string[];
  blockedPaths?: string[];
  rateLimiting?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface SemanticConfig {
  enableRelationships?: boolean;
  chunkSize?: number;
  overlapSize?: number;
  relevanceThreshold?: number;
}

export function createPackfsTools(config: PackfsToolConfig): MastraToolSet {
  // Implementation details below
}
```

#### Intent-Based API

```typescript
// Access Intent - for read operations
export interface AccessIntent {
  purpose: "read" | "metadata" | "exists";
  target: {
    path: string;
    encoding?: BufferEncoding;
  };
  preferences?: {
    includeMetadata?: boolean;
    maxSize?: number;
    chunkIfLarge?: boolean;
  };
}

// Discover Intent - for search/list operations  
export interface DiscoverIntent {
  purpose: "list" | "search_content" | "search_semantic";
  target: {
    path: string;
    query?: string;
    criteria?: {
      content?: string;
      extension?: string;
      modified?: { after?: Date; before?: Date };
      size?: { min?: number; max?: number };
    };
  };
  options?: {
    recursive?: boolean;
    maxResults?: number;
    includeContent?: boolean;
    followRelationships?: boolean;
  };
}

// Update Intent - for write operations
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
    preserveRelationships?: boolean;
  };
}
```

### Tool Implementation Specifications

#### File Reader Tool

```typescript
export function createFileReaderTool(config: PackfsToolConfig): MastraTool {
  return createTool({
    id: "packfs-file-reader",
    description: "Read files and directories through PackFS with security validation",
    inputSchema: config.schemas?.access ?? defaultAccessSchema,
    outputSchema: fileOutputSchema,
    execute: async ({ context }) => {
      const intent: AccessIntent = context;
      const validator = new MastraSecurityValidator(config.security);
      
      // Security validation
      const validation = validator.validatePath(intent.target.path);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason,
          exists: false
        };
      }
      
      // Execute operation through PackFS
      const packfs = createPackfsInstance(config);
      
      switch (intent.purpose) {
        case "read":
          return await packfs.readFile(intent.target.path, {
            encoding: intent.target.encoding,
            maxSize: intent.preferences?.maxSize,
            includeMetadata: intent.preferences?.includeMetadata
          });
          
        case "metadata":
          return await packfs.stat(intent.target.path);
          
        case "exists":
          return {
            success: true,
            exists: await packfs.exists(intent.target.path)
          };
          
        default:
          return {
            success: false,
            error: `Unsupported access purpose: ${intent.purpose}`
          };
      }
    }
  });
}
```

#### File Searcher Tool

```typescript
export function createFileSearcherTool(config: PackfsToolConfig): MastraTool {
  return createTool({
    id: "packfs-file-searcher", 
    description: "Search files and content through PackFS with semantic capabilities",
    inputSchema: config.schemas?.discover ?? defaultDiscoverSchema,
    outputSchema: searchOutputSchema,
    execute: async ({ context }) => {
      const intent: DiscoverIntent = context;
      const validator = new MastraSecurityValidator(config.security);
      const packfs = createPackfsInstance(config);
      
      // Security validation
      const validation = validator.validatePath(intent.target.path);
      if (!validation.valid) {
        return {
          success: false,
          results: [],
          totalResults: 0,
          error: validation.reason
        };
      }
      
      switch (intent.purpose) {
        case "list":
          return await packfs.readdir(intent.target.path, {
            recursive: intent.options?.recursive,
            includeMetadata: true
          });
          
        case "search_content":
          return await packfs.searchContent(intent.target.query!, {
            basePath: intent.target.path,
            recursive: intent.options?.recursive,
            maxResults: intent.options?.maxResults,
            includeContent: intent.options?.includeContent
          });
          
        case "search_semantic":
          if (!config.semantic?.enableRelationships) {
            throw new Error("Semantic search requires semantic processing enabled");
          }
          return await packfs.searchSemantic(intent.target.query!, {
            basePath: intent.target.path,
            followRelationships: intent.options?.followRelationships,
            relevanceThreshold: config.semantic.relevanceThreshold
          });
          
        default:
          return {
            success: false,
            results: [],
            totalResults: 0,
            error: `Unsupported discover purpose: ${intent.purpose}`
          };
      }
    }
  });
}
```

#### File Writer Tool

```typescript
export function createFileWriterTool(config: PackfsToolConfig): MastraTool {
  return createTool({
    id: "packfs-file-writer",
    description: "Create and update files through PackFS with relationship preservation",
    inputSchema: config.schemas?.update ?? defaultUpdateSchema,
    outputSchema: updateOutputSchema,
    execute: async ({ context }) => {
      const intent: UpdateIntent = context;
      const validator = new MastraSecurityValidator(config.security);
      const packfs = createPackfsInstance(config);
      
      // Security validation
      const validation = validator.validateOperation(intent);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason
        };
      }
      
      switch (intent.purpose) {
        case "create":
          return await packfs.writeFile(intent.target.path, intent.content!, {
            createPath: intent.options?.createPath,
            exclusive: true, // Fail if file exists
            atomic: intent.options?.atomic,
            preserveRelationships: intent.options?.preserveRelationships
          });
          
        case "update":
          return await packfs.writeFile(intent.target.path, intent.content!, {
            backup: intent.options?.backup,
            atomic: intent.options?.atomic,
            preserveRelationships: intent.options?.preserveRelationships
          });
          
        case "append":
          return await packfs.appendFile(intent.target.path, intent.content!);
          
        case "delete":
          return await packfs.remove(intent.target.path);
          
        default:
          return {
            success: false,
            error: `Unsupported update purpose: ${intent.purpose}`
          };
      }
    }
  });
}
```

### Schema Specifications

#### Pre-built Zod Schemas

```typescript
// Access schemas
export const accessSchema = z.object({
  purpose: z.enum(["read", "metadata", "exists"]).describe("Type of access operation"),
  target: z.object({
    path: z.string().describe("Path to the file or directory"),
    encoding: z.string().optional().describe("Text encoding for file content")
  }),
  preferences: z.object({
    includeMetadata: z.boolean().optional().describe("Include file metadata in response"),
    maxSize: z.number().optional().describe("Maximum file size to read"),
    chunkIfLarge: z.boolean().optional().describe("Chunk large files automatically")
  }).optional()
});

// Discovery schemas
export const discoverSchema = z.object({
  purpose: z.enum(["list", "search_content", "search_semantic"]).describe("Discovery operation type"),
  target: z.object({
    path: z.string().describe("Directory path to search within"),
    query: z.string().optional().describe("Search query for content matching"),
    criteria: z.object({
      content: z.string().optional().describe("Content pattern to search for"),
      extension: z.string().optional().describe("File extension filter"),
      modified: z.object({
        after: z.date().optional(),
        before: z.date().optional()
      }).optional().describe("Date range filter"),
      size: z.object({
        min: z.number().optional(),
        max: z.number().optional()
      }).optional().describe("File size range filter")
    }).optional()
  }),
  options: z.object({
    recursive: z.boolean().optional().describe("Search subdirectories recursively"),
    maxResults: z.number().optional().describe("Maximum number of results to return"),
    includeContent: z.boolean().optional().describe("Include file content in results"),
    followRelationships: z.boolean().optional().describe("Follow document relationships in semantic search")
  }).optional()
});

// Update schemas  
export const updateSchema = z.object({
  purpose: z.enum(["create", "update", "append", "delete"]).describe("Update operation type"),
  target: z.object({
    path: z.string().describe("Path where to create/update the file")
  }),
  content: z.string().optional().describe("File content to write"),
  options: z.object({
    createPath: z.boolean().optional().describe("Create parent directories if needed"),
    backup: z.boolean().optional().describe("Create backup before updating"),
    atomic: z.boolean().optional().describe("Use atomic write operations"),
    preserveRelationships: z.boolean().optional().describe("Preserve document relationships during updates")
  }).optional()
});
```

### Security Integration

#### MastraSecurityValidator

```typescript
export class MastraSecurityValidator {
  private config: SecurityConfig;
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  constructor(config: SecurityConfig = {}) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      allowedExtensions: [".txt", ".md", ".json", ".js", ".ts"],
      blockedPaths: [".git", "node_modules", ".env"],
      ...config
    };
  }
  
  validatePath(path: string): ValidationResult {
    // Normalize and validate path
    const normalized = this.normalizePath(path);
    
    // Check if path is blocked
    for (const blocked of this.config.blockedPaths || []) {
      if (normalized.includes(blocked)) {
        return { valid: false, reason: `Path contains blocked segment: ${blocked}` };
      }
    }
    
    // Validate extension if file path
    if (this.isFilePath(normalized)) {
      const ext = this.getExtension(normalized);
      if (this.config.allowedExtensions && !this.config.allowedExtensions.includes(ext)) {
        return { valid: false, reason: `File extension not allowed: ${ext}` };
      }
    }
    
    return { valid: true };
  }
  
  validateOperation(intent: AccessIntent | DiscoverIntent | UpdateIntent): ValidationResult {
    // Path validation
    const pathValidation = this.validatePath(intent.target.path);
    if (!pathValidation.valid) {
      return pathValidation;
    }
    
    // Rate limiting
    if (this.config.rateLimiting) {
      const rateLimitCheck = this.checkRateLimit(intent.target.path);
      if (!rateLimitCheck.valid) {
        return rateLimitCheck;
      }
    }
    
    // Size validation for read operations
    if ('preferences' in intent && intent.preferences?.maxSize) {
      if (intent.preferences.maxSize > (this.config.maxFileSize || Infinity)) {
        return { 
          valid: false, 
          reason: `Requested size exceeds maximum: ${this.config.maxFileSize}` 
        };
      }
    }
    
    return { valid: true };
  }
  
  private checkRateLimit(path: string): ValidationResult {
    const now = Date.now();
    const key = path;
    const limits = this.config.rateLimiting!;
    
    let record = this.requestCounts.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + limits.windowMs
      };
    } else {
      record.count++;
    }
    
    this.requestCounts.set(key, record);
    
    if (record.count > limits.maxRequests) {
      return {
        valid: false,
        reason: `Rate limit exceeded: ${record.count}/${limits.maxRequests} requests`
      };
    }
    
    return { valid: true };
  }
}
```

### Semantic Processing

#### Document Relationship Processing

```typescript
export class SemanticProcessor {
  static extractRelationships(content: string, filePath: string): DocumentRelationships {
    const relationships: DocumentRelationships = {
      parent: [],
      children: [],
      related: []
    };
    
    // Extract markdown-style links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const [, text, link] = match;
      
      // Resolve relative paths
      const resolvedPath = this.resolvePath(filePath, link);
      
      // Classify relationship based on path structure
      if (this.isParentPath(filePath, resolvedPath)) {
        relationships.parent.push(resolvedPath);
      } else if (this.isChildPath(filePath, resolvedPath)) {
        relationships.children.push(resolvedPath);
      } else {
        relationships.related.push(resolvedPath);
      }
    }
    
    // Extract frontmatter relationships
    const frontmatterRelationships = this.extractFrontmatterRelationships(content);
    relationships.parent.push(...frontmatterRelationships.parent);
    relationships.children.push(...frontmatterRelationships.children);
    relationships.related.push(...frontmatterRelationships.related);
    
    return relationships;
  }
  
  static calculateRelevance(content: string, query: string): number {
    // Simple TF-IDF style relevance calculation
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let relevanceScore = 0;
    const contentLength = contentWords.length;
    
    for (const term of queryTerms) {
      const termCount = contentWords.filter(word => word.includes(term)).length;
      const termFrequency = termCount / contentLength;
      
      // Simple relevance boost for exact matches
      if (content.toLowerCase().includes(term)) {
        relevanceScore += termFrequency * 2;
      }
      
      // Boost for partial matches
      relevanceScore += termFrequency;
    }
    
    return Math.min(relevanceScore, 1.0);
  }
}
```

### Usage Examples

#### Basic Setup

```typescript
import { createPackfsTools } from "packfs-core/mastra";

// Simple configuration
export const { fileReader, fileSearcher, fileWriter } = createPackfsTools({
  rootPath: "/project/workspace",
  permissions: ["read", "write", "search"],
  security: {
    maxFileSize: 1024 * 1024, // 1MB
    allowedExtensions: [".md", ".txt", ".json"],
    blockedPaths: [".git", "node_modules"]
  }
});

// Register with Mastra agent
export const agent = new Agent({
  name: "File System Agent",
  tools: { fileReader, fileSearcher, fileWriter },
  instructions: "You can read, search, and write files within the project workspace."
});
```

#### Advanced Configuration

```typescript
import { createPackfsTools } from "packfs-core/mastra";
import { z } from "zod";

// Custom schema for specialized use case
const customAccessSchema = z.object({
  purpose: z.enum(["read", "analyze"]),
  target: z.object({
    path: z.string(),
    analysisType: z.enum(["security", "performance"]).optional()
  })
});

export const tools = createPackfsTools({
  rootPath: "/secure/workspace",
  permissions: ["read", "search"],
  schemas: {
    access: customAccessSchema
  },
  security: {
    maxFileSize: 5 * 1024 * 1024,
    allowedExtensions: [".js", ".ts", ".json", ".md"],
    rateLimiting: {
      maxRequests: 100,
      windowMs: 60 * 1000 // 1 minute
    }
  },
  semantic: {
    enableRelationships: true,
    relevanceThreshold: 0.3,
    chunkSize: 2000
  }
});
```

### Output Structure Design

#### LLM-Friendly Flat Structure

All tool outputs follow a flat structure to ensure LLM compatibility:

```typescript
// Tool output structure
interface ToolOutput {
  success: boolean;
  error?: string;
  
  // All data properties are at top level for direct LLM access
  content?: string;      // File content for read operations
  exists?: boolean;      // File existence check
  created?: boolean;     // File creation status
  files?: FileInfo[];    // Search/list results
  totalFound?: number;   // Total count for search
  searchTime?: number;   // Search performance metric
  
  // Only metadata remains nested
  metadata?: {
    executionTime?: number;
    filesAccessed?: string[];
    operationType?: string;
    [key: string]: any;
  };
}
```

**Important**: Never nest operational data inside a `data` property. LLMs are trained on flat structures where properties like `content`, `files`, etc. are directly accessible at the top level.

Example correct output:
```javascript
{
  success: true,
  content: "# README\nProject documentation...",
  exists: true,
  metadata: {
    size: 1234,
    modified: "2024-06-20T10:00:00Z"
  }
}
```

Example incorrect output (DO NOT USE):
```javascript
{
  success: true,
  data: {  // ❌ Never wrap results in data
    content: "...",
    exists: true
  }
}
```

### Testing Strategy

#### Unit Tests

```typescript
describe('MastraSecurityValidator', () => {
  it('should validate allowed paths', () => {
    const validator = new MastraSecurityValidator({
      allowedExtensions: ['.md', '.txt']
    });
    
    expect(validator.validatePath('/workspace/file.md')).toEqual({
      valid: true
    });
    
    expect(validator.validatePath('/workspace/file.exe')).toEqual({
      valid: false,
      reason: 'File extension not allowed: .exe'
    });
  });
});

describe('createPackfsTools', () => {
  it('should create tools based on permissions', () => {
    const tools = createPackfsTools({
      rootPath: '/test',
      permissions: ['read', 'search']
    });
    
    expect(tools.fileReader).toBeDefined();
    expect(tools.fileSearcher).toBeDefined();
    expect(tools.fileWriter).toBeUndefined();
  });
});
```

#### Integration Tests

```typescript
describe('Mastra Integration E2E', () => {
  it('should process file operations through agent', async () => {
    const tools = createPackfsTools({
      rootPath: '/test/workspace',
      permissions: ['read', 'write']
    });
    
    const agent = new Agent({
      name: 'Test Agent',
      tools
    });
    
    // Test file creation
    const result = await agent.run('Create a README.md file with project info');
    expect(result.success).toBe(true);
    
    // Test file reading
    const content = await agent.run('Read the README.md file');
    expect(content).toContain('project info');
  });
});
```

## Relationships
- **Parent Nodes:** [decisions/adr_004_native_mastra_integration_layer.md]
- **Child Nodes:** Individual implementation files in `/workspace/code/src/integrations/mastra/`
- **Related Nodes:**
  - [component_map.md] - defines - Architectural component structure
  - [planning/roadmap.md] - schedules - Implementation timeline
  - [foundation/system_overview.md] - integrates - Overall system design

## Navigation Guidance
- **Access Context:** Use this document when implementing the Mastra integration or understanding its technical details
- **Common Next Steps:** After reviewing this specification, begin implementation or explore related architecture documents
- **Related Tasks:** Implementation, testing, documentation, integration validation
- **Update Patterns:** This document should be updated when API designs change or new features are added

## Metadata
- **Created:** 2024-06-19
- **Last Updated:** 2024-06-19  
- **Updated By:** Implementation team

## Change History
- 2024-06-19: Initial specification based on user feedback and ADR-004