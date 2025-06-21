# LlamaIndex Integration Examples - v0.2.0

This document shows input/output examples for the LlamaIndex.TS framework integration with PackFS v0.2.0's flat output structure.

## Table of Contents
- [Setup](#setup)
- [Function Tool Usage](#function-tool-usage)
- [ToolSpec Format](#toolspec-format)
- [Tool Suite Usage](#tool-suite-usage)
- [Query Engine Integration](#query-engine-integration)
- [Chat Engine Integration](#chat-engine-integration)

## Setup

### Basic Tool Configuration

```typescript
import { createLlamaIndexSemanticFilesystemTool } from 'packfs-core';

const packfsTool = createLlamaIndexSemanticFilesystemTool({
  workingDirectory: '/path/to/project',
  llamaindex: {
    serviceContext: null, // Optional service context
    metadata: {
      toolId: 'packfs-semantic',
      version: '0.2.0'
    }
  }
});
```

### ToolSpec Configuration

```typescript
import { createLlamaIndexSemanticToolSpec } from 'packfs-core';

const packfsToolSpec = createLlamaIndexSemanticToolSpec({
  workingDirectory: '/path/to/project',
  security: {
    allowedExtensions: ['.ts', '.js', '.md', '.json'],
    maxFileSize: 5 * 1024 * 1024 // 5MB
  }
});
```

### Tool Suite Configuration

```typescript
import { createLlamaIndexSemanticToolSuite } from 'packfs-core';

const { fileAccessTool, fileModifyTool, fileSearchTool, fileManageTool } = 
  createLlamaIndexSemanticToolSuite({
    workingDirectory: '/path/to/project'
  });
```

## Function Tool Usage

### Natural Language Query

**Input:**
```typescript
const result = await packfsTool.call({
  query: "read the main application file"
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "content": "import express from 'express';\nimport { config } from './config';\n\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello World' });\n});\n\napp.listen(config.port, () => {\n  console.log(`Server running on port ${config.port}`);\n});",
  "path": "src/index.ts",
  "exists": true,
  "metadata": {
    "size": 298,
    "language": "typescript",
    "lastModified": "2024-06-20T10:00:00Z"
  }
}
```

### Structured Action

**Input:**
```typescript
const result = await packfsTool.call({
  action: {
    operation: 'access',
    purpose: 'metadata',
    target: { path: 'package.json' }
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "exists": true,
  "metadata": {
    "size": 456,
    "created": "2024-01-15T08:00:00Z",
    "modified": "2024-06-20T14:30:00Z",
    "type": "application/json",
    "permissions": "rw-r--r--",
    "lines": 23,
    "encoding": "utf8"
  }
}
```

### File Creation Action

**Input:**
```typescript
const result = await packfsTool.call({
  action: {
    operation: 'update',
    purpose: 'create',
    target: { path: 'docs/API.md' },
    content: '# API Documentation\n\n## Endpoints\n\n### GET /api/users\nReturns list of users'
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": true,
  "path": "docs/API.md",
  "bytesWritten": 79,
  "metadata": {
    "created": "2024-06-20T15:00:00Z",
    "parentDir": "docs"
  }
}
```

### Semantic Search Action

**Input:**
```typescript
const result = await packfsTool.call({
  action: {
    operation: 'discover',
    purpose: 'search_semantic',
    target: {
      semanticQuery: 'authentication and security',
      path: 'src'
    },
    options: {
      maxResults: 5,
      includeContent: true
    }
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "src/middleware/auth.ts",
      "relevanceScore": 0.94,
      "snippet": "export const authenticate = async (req: Request, res: Response, next: NextFunction) => {",
      "content": "// Full file content here...",
      "metadata": {
        "size": 2345,
        "semanticTags": ["authentication", "jwt", "middleware"]
      }
    },
    {
      "path": "src/utils/security.ts",
      "relevanceScore": 0.87,
      "snippet": "export function hashPassword(password: string): Promise<string> {",
      "content": "// Full file content here...",
      "metadata": {
        "size": 1567,
        "semanticTags": ["security", "hashing", "bcrypt"]
      }
    },
    {
      "path": "src/config/auth.config.ts",
      "relevanceScore": 0.75,
      "snippet": "export const authConfig = {",
      "content": "// Full file content here...",
      "metadata": {
        "size": 890,
        "semanticTags": ["configuration", "jwt", "auth"]
      }
    }
  ],
  "totalFound": 3,
  "searchTime": 187,
  "metadata": {
    "searchMethod": "semantic",
    "modelUsed": "content-embeddings",
    "threshold": 0.7
  }
}
```

## ToolSpec Format

### Tool Specification Structure

```typescript
const toolSpec = createLlamaIndexSemanticToolSpec(config);

// The returned ToolSpec format:
{
  name: "semantic_filesystem",
  description: "Perform intelligent file operations using natural language or structured commands",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language query describing the file operation"
      },
      action: {
        type: "object",
        description: "Structured action for precise operations",
        properties: {
          operation: {
            type: "string",
            enum: ["access", "update", "discover", "organize", "remove"]
          },
          purpose: {
            type: "string",
            description: "Specific purpose within the operation"
          },
          target: {
            type: "object",
            description: "Target specification"
          },
          content: {
            type: "string",
            description: "Content for write operations"
          }
        }
      }
    }
  },
  fn: async (args: any) => {
    // Tool execution function
  }
}
```

### ToolSpec Execution Example

**Input:**
```typescript
const result = await toolSpec.fn({
  query: "find all test files and list them"
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "src/__tests__/app.test.ts",
      "type": "file",
      "size": 3456
    },
    {
      "path": "src/components/__tests__/Button.test.tsx",
      "type": "file", 
      "size": 2345
    },
    {
      "path": "tests/integration/api.test.js",
      "type": "file",
      "size": 5678
    },
    {
      "path": "tests/unit/utils.test.js",
      "type": "file",
      "size": 1234
    }
  ],
  "totalFound": 4,
  "searchTime": 89,
  "metadata": {
    "pattern": "**/*.test.*",
    "dirsScanned": 15
  }
}
```

## Tool Suite Usage

### File Access Tool

**Input:**
```typescript
const result = await fileAccessTool.call({
  path: "README.md",
  options: { includeMetadata: true }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "content": "# My Project\n\n## Description\nThis is a sample project demonstrating PackFS integration.\n\n## Installation\n```bash\nnpm install\n```\n\n## Usage\n```javascript\nimport { PackFS } from 'packfs-core';\n```",
  "exists": true,
  "metadata": {
    "size": 234,
    "lines": 15,
    "language": "markdown",
    "headings": ["My Project", "Description", "Installation", "Usage"],
    "codeBlocks": 2
  }
}
```

### File Modify Tool

**Input:**
```typescript
const result = await fileModifyTool.call({
  path: "src/config.ts",
  content: "export const config = {\n  apiUrl: process.env.API_URL || 'http://localhost:3000',\n  timeout: 5000\n};",
  operation: "overwrite"
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "path": "src/config.ts",
  "operation": "overwrite",
  "bytesWritten": 112,
  "previousSize": 98,
  "created": false,
  "metadata": {
    "backupCreated": false,
    "syntaxValid": true,
    "fileType": "typescript"
  }
}
```

### File Search Tool

**Input:**
```typescript
const result = await fileSearchTool.call({
  query: "database models",
  searchType: "semantic",
  options: {
    includeSnippets: true,
    maxResults: 3
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "results": [
    {
      "path": "src/models/User.ts",
      "score": 0.92,
      "type": "semantic",
      "snippet": "export class User extends Model {\n  static tableName = 'users';\n  \n  id!: number;\n  email!: string;",
      "highlights": ["Model", "tableName", "users"]
    },
    {
      "path": "src/models/Product.ts", 
      "score": 0.88,
      "type": "semantic",
      "snippet": "export class Product extends Model {\n  static tableName = 'products';",
      "highlights": ["Model", "tableName", "products"]
    },
    {
      "path": "src/database/schema.sql",
      "score": 0.76,
      "type": "semantic",
      "snippet": "CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email VARCHAR(255) UNIQUE NOT NULL",
      "highlights": ["TABLE", "users", "PRIMARY KEY"]
    }
  ],
  "totalMatches": 3,
  "searchTime": 145,
  "metadata": {
    "searchStrategy": "semantic-similarity",
    "filesScanned": 67,
    "indexHit": true
  }
}
```

### File Manage Tool

**Input:**
```typescript
const result = await fileManageTool.call({
  operation: "organize",
  source: "src/components/*.test.{ts,tsx}",
  destination: "src/__tests__/components/",
  options: {
    createDestination: true,
    preserveStructure: true
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "operation": "organize",
  "movedFiles": [
    {
      "from": "src/components/Button.test.tsx",
      "to": "src/__tests__/components/Button.test.tsx"
    },
    {
      "from": "src/components/Form.test.tsx",
      "to": "src/__tests__/components/Form.test.tsx"
    },
    {
      "from": "src/components/Modal.test.ts",
      "to": "src/__tests__/components/Modal.test.ts"
    }
  ],
  "filesAffected": 3,
  "totalSize": 8901,
  "metadata": {
    "dirsCreated": ["src/__tests__", "src/__tests__/components"],
    "operation": "move",
    "timestamp": "2024-06-20T16:00:00Z"
  }
}
```

## Query Engine Integration

### Document Query Example

```typescript
import { VectorStoreIndex } from 'llamaindex';

// Create index from files
const documents = await fileSearchTool.call({
  query: "all documentation files",
  returnContent: true
});

const index = await VectorStoreIndex.fromDocuments(
  documents.results.map(file => ({
    text: file.content,
    metadata: { path: file.path }
  }))
);

const queryEngine = index.asQueryEngine({
  tools: [packfsTool]
});

// Query execution
const response = await queryEngine.query(
  "What are the authentication requirements?"
);
```

**Query Engine Output:**
```json
{
  "response": "Based on the documentation, the authentication requirements are:\n\n1. JWT tokens are required for all API endpoints except /auth/login\n2. Tokens expire after 24 hours\n3. Refresh tokens are valid for 7 days\n4. Password requirements: minimum 8 characters, at least one uppercase, one number\n\nSource: docs/authentication.md",
  "sourceNodes": [
    {
      "node": {
        "text": "## Authentication Requirements\n\nAll API endpoints require JWT authentication...",
        "metadata": {
          "path": "docs/authentication.md",
          "relevance": 0.94
        }
      }
    }
  ],
  "metadata": {
    "toolsUsed": ["semantic_filesystem"],
    "queryTime": 234
  }
}
```

## Chat Engine Integration

### Interactive Chat Example

```typescript
import { OpenAI } from 'llamaindex';

const chatEngine = new SimpleChatEngine({
  llm: new OpenAI(),
  tools: [fileAccessTool, fileModifyTool, fileSearchTool]
});

// Chat interaction
const session = await chatEngine.chat(
  "I need to update the API documentation with the new endpoints"
);
```

**Chat Interaction Flow:**

**User:** "I need to update the API documentation with the new endpoints"

**Assistant Response:**
```json
{
  "message": "I'll help you update the API documentation. Let me first check the current documentation.",
  "toolCalls": [
    {
      "tool": "fileSearchTool",
      "args": { "query": "API documentation", "searchType": "name" },
      "result": {
        "success": true,
        "results": [
          { "path": "docs/api.md", "score": 0.98 },
          { "path": "docs/api-reference.md", "score": 0.89 }
        ]
      }
    }
  ]
}
```

**Assistant:** "I found the API documentation at docs/api.md. Let me read it to see the current structure."

**Tool Execution:**
```json
{
  "toolCalls": [
    {
      "tool": "fileAccessTool",
      "args": { "path": "docs/api.md" },
      "result": {
        "success": true,
        "content": "# API Documentation\n\n## Endpoints\n\n### GET /api/users\n### POST /api/auth/login",
        "exists": true
      }
    }
  ]
}
```

**Assistant:** "I see the current documentation has 2 endpoints. What new endpoints would you like to add?"

**User:** "Add GET /api/products and POST /api/orders"

**Assistant Response with Tool Call:**
```json
{
  "message": "I'll add those new endpoints to the documentation.",
  "toolCalls": [
    {
      "tool": "fileModifyTool",
      "args": {
        "path": "docs/api.md",
        "content": "# API Documentation\n\n## Endpoints\n\n### GET /api/users\nReturns a list of all users.\n\n### POST /api/auth/login\nAuthenticates a user and returns a JWT token.\n\n### GET /api/products\nReturns a list of all products.\n\n### POST /api/orders\nCreates a new order.",
        "operation": "overwrite"
      },
      "result": {
        "success": true,
        "bytesWritten": 267,
        "path": "docs/api.md"
      }
    }
  ],
  "finalMessage": "I've successfully updated the API documentation with the new endpoints:\n- GET /api/products\n- POST /api/orders\n\nThe documentation now includes 4 endpoints total."
}
```

## Error Handling Examples

### File Not Found

**Input:**
```typescript
const result = await fileAccessTool.call({
  path: "non-existent-file.txt"
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "exists": false,
  "error": "File not found: non-existent-file.txt",
  "suggestions": [
    {
      "path": "existing-file.txt",
      "similarity": 0.78,
      "type": "name"
    },
    {
      "path": "docs/non-existent.md",
      "similarity": 0.65,
      "type": "partial"
    }
  ],
  "metadata": {
    "searchPerformed": true,
    "suggestionsFrom": ["name-similarity", "partial-match"]
  }
}
```

### Invalid Operation

**Input:**
```typescript
const result = await packfsTool.call({
  action: {
    operation: "invalid-op",
    target: { path: "file.txt" }
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "error": "Invalid operation: invalid-op",
  "validOperations": ["access", "update", "discover", "organize", "remove"],
  "suggestion": "Did you mean 'access' to read the file?",
  "metadata": {
    "requestedOperation": "invalid-op",
    "closestMatch": "access"
  }
}
```

### Permission Denied

**Input:**
```typescript
const result = await fileModifyTool.call({
  path: "/system/critical.conf",
  content: "new content",
  operation: "overwrite"
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "error": "Permission denied: /system/critical.conf is outside allowed paths",
  "code": "PERMISSION_DENIED",
  "allowedPaths": ["/path/to/project/**"],
  "metadata": {
    "securityCheck": "path-validation",
    "blockedPath": "/system"
  }
}
```

## Advanced Features

### Multi-File Operations

**Input:**
```typescript
const result = await packfsTool.call({
  action: {
    operation: "discover",
    purpose: "search_integrated",
    target: {
      semanticQuery: "user authentication flow",
      pattern: "*.{ts,js}",
      path: "src"
    },
    options: {
      crossReference: true,
      includeImports: true
    }
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "src/auth/login.ts",
      "relevanceScore": 0.95,
      "type": "primary",
      "imports": ["./validateUser", "../utils/jwt"],
      "exportedFunctions": ["login", "logout"],
      "crossReferences": [
        {
          "file": "src/routes/auth.ts",
          "type": "imported-by",
          "usage": "login handler"
        }
      ]
    },
    {
      "path": "src/auth/validateUser.ts",
      "relevanceScore": 0.88,
      "type": "dependency",
      "imports": ["../models/User"],
      "exportedFunctions": ["validateUser", "checkPassword"],
      "crossReferences": [
        {
          "file": "src/auth/login.ts",
          "type": "imports",
          "usage": "user validation"
        }
      ]
    }
  ],
  "totalFound": 2,
  "searchTime": 234,
  "metadata": {
    "crossReferenceDepth": 2,
    "importGraphBuilt": true,
    "semanticClusters": ["authentication", "user-management"]
  }
}
```

### Batch Operations

**Input:**
```typescript
const result = await fileManageTool.call({
  operation: "batch",
  actions: [
    {
      type: "create",
      path: "src/features/newFeature/index.ts",
      content: "export * from './component';"
    },
    {
      type: "create", 
      path: "src/features/newFeature/component.tsx",
      content: "export const NewFeature = () => <div>New Feature</div>;"
    },
    {
      type: "create",
      path: "src/features/newFeature/styles.css",
      content: ".new-feature { padding: 20px; }"
    }
  ]
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "operation": "batch",
  "results": [
    {
      "action": "create",
      "path": "src/features/newFeature/index.ts",
      "success": true,
      "bytesWritten": 30
    },
    {
      "action": "create",
      "path": "src/features/newFeature/component.tsx",
      "success": true,
      "bytesWritten": 58
    },
    {
      "action": "create",
      "path": "src/features/newFeature/styles.css",
      "success": true,
      "bytesWritten": 33
    }
  ],
  "summary": {
    "totalActions": 3,
    "successful": 3,
    "failed": 0,
    "totalBytesWritten": 121
  },
  "metadata": {
    "batchId": "batch_1719234567890",
    "atomic": false,
    "duration": 145
  }
}
```