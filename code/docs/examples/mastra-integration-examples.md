# Mastra Integration Examples - v0.2.0

This document shows input/output examples for the Mastra framework integration with PackFS v0.2.0's flat output structure.

## Table of Contents
- [Setup](#setup)
- [Single Tool Usage](#single-tool-usage)
- [Tool Suite Usage](#tool-suite-usage)
- [Natural Language Queries](#natural-language-queries)
- [Agent Integration](#agent-integration)

## Setup

### Basic Configuration

```typescript
import { createMastraSemanticFilesystemTool } from 'packfs-core';

const packfsTool = createMastraSemanticFilesystemTool({
  workingDirectory: '/path/to/project',
  security: {
    allowedPaths: ['/path/to/project/**'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['txt', 'md', 'json', 'js', 'ts']
  },
  mastra: {
    autoRetry: true,
    maxRetries: 3,
    enableTracing: true
  }
});
```

### Tool Suite Configuration

```typescript
import { createMastraSemanticToolSuite } from 'packfs-core';

const { fileReader, fileWriter, fileSearcher, fileOrganizer } = 
  createMastraSemanticToolSuite({
    workingDirectory: '/path/to/project',
    mastra: {
      agentContext: { 
        agentId: 'file-assistant',
        role: 'developer'
      }
    }
  });
```

## Single Tool Usage

### Natural Language File Read

**Input:**
```typescript
const result = await packfsTool.execute({
  naturalLanguageQuery: "read the README file"
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "content": "# Project Name\n\nThis project is a web application built with...",
  "exists": true,
  "path": "README.md",
  "metadata": {
    "executionTime": 45,
    "filesAccessed": ["README.md"],
    "operationType": "natural_language",
    "size": 2345,
    "modified": "2024-06-20T10:00:00Z"
  }
}
```

### Natural Language File Creation

**Input:**
```typescript
const result = await packfsTool.execute({
  naturalLanguageQuery: "create a todo list file with my tasks for today"
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": true,
  "path": "todo.md",
  "bytesWritten": 156,
  "content": "# Tasks for Today\n\n- [ ] Review pull requests\n- [ ] Update documentation\n- [ ] Fix authentication bug\n- [ ] Team meeting at 2pm",
  "metadata": {
    "executionTime": 67,
    "filesAccessed": ["todo.md"],
    "operationType": "natural_language",
    "interpretedIntent": "create_todo_file"
  }
}
```

### Structured File Access

**Input:**
```typescript
const result = await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'src/config.json' },
  preferences: { encoding: 'utf8' }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "content": "{\n  \"apiUrl\": \"https://api.example.com\",\n  \"timeout\": 5000,\n  \"retries\": 3\n}",
  "exists": true,
  "metadata": {
    "executionTime": 23,
    "filesAccessed": ["src/config.json"],
    "operationType": "access",
    "encoding": "utf8",
    "size": 89
  }
}
```

### Structured File Update

**Input:**
```typescript
const result = await packfsTool.execute({
  operation: 'update',
  purpose: 'create',
  target: { path: 'docs/api-reference.md' },
  content: '# API Reference\n\n## Endpoints\n\n### GET /api/users\nReturns a list of users.',
  options: { createPath: true }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": true,
  "path": "docs/api-reference.md",
  "bytesWritten": 78,
  "metadata": {
    "executionTime": 89,
    "filesAccessed": ["docs/api-reference.md"],
    "operationType": "update",
    "dirsCreated": ["docs"]
  }
}
```

### Structured File Discovery

**Input:**
```typescript
const result = await packfsTool.execute({
  operation: 'discover',
  purpose: 'search_semantic',
  target: { 
    semanticQuery: 'error handling',
    path: 'src'
  },
  options: {
    maxResults: 5,
    threshold: 0.7
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "src/utils/errorHandler.ts",
      "relevanceScore": 0.95,
      "snippet": "export class ErrorHandler {\n  static handle(error: Error): void {",
      "lastAccessed": "2024-06-20T14:00:00Z"
    },
    {
      "path": "src/middleware/errorMiddleware.ts",
      "relevanceScore": 0.88,
      "snippet": "export const errorMiddleware = (err: Error, req: Request, res: Response) => {",
      "lastAccessed": "2024-06-20T13:30:00Z"
    },
    {
      "path": "src/services/logger.ts",
      "relevanceScore": 0.72,
      "snippet": "logError(error: Error, context?: any): void {",
      "lastAccessed": "2024-06-20T12:00:00Z"
    }
  ],
  "totalFound": 3,
  "searchTime": 156,
  "metadata": {
    "executionTime": 178,
    "filesAccessed": ["src/utils/errorHandler.ts", "src/middleware/errorMiddleware.ts", "src/services/logger.ts"],
    "operationType": "discover",
    "semanticModel": "content-similarity",
    "filesScanned": 45
  }
}
```

## Tool Suite Usage

### File Reader Tool

**Input:**
```typescript
const result = await fileReader.execute({
  query: "show me the package.json file"
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "content": "{\n  \"name\": \"my-project\",\n  \"version\": \"1.0.0\",\n  \"dependencies\": {\n    \"express\": \"^4.18.0\"\n  }\n}",
  "exists": true,
  "metadata": {
    "size": 234,
    "type": "application/json",
    "executionTime": 34
  }
}
```

### File Writer Tool

**Input:**
```typescript
const result = await fileWriter.execute({
  path: 'logs/app.log',
  content: '[2024-06-20] Application started successfully\n',
  mode: 'append'
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": false,
  "path": "logs/app.log",
  "bytesWritten": 46,
  "previousSize": 1024,
  "newSize": 1070,
  "metadata": {
    "executionTime": 45,
    "operation": "append"
  }
}
```

### File Searcher Tool

**Input:**
```typescript
const result = await fileSearcher.execute({
  query: "find all test files",
  maxResults: 10
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "results": [
    {
      "path": "src/utils/validator.test.ts",
      "type": "file",
      "size": 3456
    },
    {
      "path": "src/components/Button.test.tsx",
      "type": "file",
      "size": 2345
    },
    {
      "path": "tests/integration/api.test.js",
      "type": "file",
      "size": 5678
    }
  ],
  "totalFound": 3,
  "searchTime": 89,
  "metadata": {
    "executionTime": 95,
    "pattern": "*.test.*",
    "dirsScanned": 12
  }
}
```

### File Organizer Tool

**Input:**
```typescript
const result = await fileOrganizer.execute({
  operation: 'move',
  source: 'temp/upload.csv',
  destination: 'data/processed/upload_2024_06_20.csv'
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "operation": "move",
  "source": "temp/upload.csv",
  "destination": "data/processed/upload_2024_06_20.csv",
  "filesAffected": 1,
  "totalSize": 45678,
  "metadata": {
    "executionTime": 123,
    "dirsCreated": ["data", "data/processed"],
    "timestamp": "2024-06-20T16:45:00Z"
  }
}
```

## Natural Language Queries

### Complex Natural Language Request

**Input:**
```typescript
const result = await packfsTool.execute({
  naturalLanguageQuery: "find all JavaScript files in the src folder that mention API calls"
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "src/services/apiClient.js",
      "matches": 15,
      "relevance": 0.98,
      "preview": "import axios from 'axios';\n\nconst apiClient = axios.create({",
      "semanticMatches": ["API calls", "axios", "http requests"]
    },
    {
      "path": "src/utils/fetchData.js",
      "matches": 8,
      "relevance": 0.85,
      "preview": "export async function fetchData(endpoint) {\n  const response = await fetch(`${API_URL}/${endpoint}`);",
      "semanticMatches": ["API calls", "fetch", "endpoint"]
    },
    {
      "path": "src/hooks/useApi.js",
      "matches": 6,
      "relevance": 0.76,
      "preview": "export function useApi(endpoint) {\n  const [data, setData] = useState(null);",
      "semanticMatches": ["API", "hook", "data fetching"]
    }
  ],
  "totalFound": 3,
  "searchTime": 234,
  "metadata": {
    "executionTime": 256,
    "filesAccessed": ["src/services/apiClient.js", "src/utils/fetchData.js", "src/hooks/useApi.js"],
    "operationType": "natural_language",
    "interpretedIntent": {
      "operation": "discover",
      "purpose": "search_integrated",
      "fileType": "javascript",
      "searchTerms": ["API", "calls"]
    }
  }
}
```

### Context-Aware Natural Language

**Input:**
```typescript
const result = await packfsTool.execute({
  naturalLanguageQuery: "create a new component for user profile",
  context: {
    framework: 'react',
    componentPath: 'src/components'
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": true,
  "path": "src/components/UserProfile.tsx",
  "bytesWritten": 456,
  "content": "import React from 'react';\n\ninterface UserProfileProps {\n  userId: string;\n}\n\nexport const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {\n  return (\n    <div className=\"user-profile\">\n      {/* User profile content */}\n    </div>\n  );\n};",
  "metadata": {
    "executionTime": 189,
    "filesAccessed": ["src/components/UserProfile.tsx"],
    "operationType": "natural_language",
    "templateUsed": "react-component",
    "contextApplied": {
      "framework": "react",
      "fileExtension": ".tsx",
      "componentStyle": "functional"
    }
  }
}
```

## Agent Integration

### Complete Agent Example

```typescript
import { Agent } from '@mastra/core';
import { createMastraSemanticToolSuite } from 'packfs-core';

const tools = createMastraSemanticToolSuite({
  workingDirectory: '/project',
  mastra: {
    agentContext: {
      agentId: 'file-manager',
      capabilities: ['read', 'write', 'organize']
    }
  }
});

const agent = new Agent({
  name: 'File Manager Agent',
  tools,
  instructions: `You are a helpful file management assistant. 
    You can read, write, search, and organize files in the project directory.`
});

// Agent usage
const response = await agent.run('Organize all test files into a tests directory');
```

**Agent Execution Output:**
```json
{
  "success": true,
  "actions": [
    {
      "tool": "fileSearcher",
      "input": { "query": "find all test files" },
      "output": {
        "success": true,
        "results": [
          { "path": "src/user.test.js" },
          { "path": "src/api.test.js" },
          { "path": "utils/helper.test.js" }
        ],
        "totalFound": 3
      }
    },
    {
      "tool": "fileOrganizer",
      "input": {
        "operation": "create_directory",
        "destination": "tests"
      },
      "output": {
        "success": true,
        "created": true,
        "path": "tests"
      }
    },
    {
      "tool": "fileOrganizer",
      "input": {
        "operation": "move",
        "source": "src/user.test.js",
        "destination": "tests/user.test.js"
      },
      "output": {
        "success": true,
        "filesAffected": 1
      }
    }
  ],
  "summary": "Successfully organized 3 test files into the tests directory",
  "metadata": {
    "totalExecutionTime": 567,
    "toolsUsed": ["fileSearcher", "fileOrganizer"],
    "filesModified": 3
  }
}
```

## Error Handling Examples

### Permission Error

**Input:**
```typescript
const result = await packfsTool.execute({
  operation: 'update',
  purpose: 'create',
  target: { path: '/etc/passwd' },
  content: 'should not work'
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "error": "Security validation failed: Path contains blocked segment: /etc",
  "code": "SECURITY_VIOLATION",
  "metadata": {
    "executionTime": 12,
    "operationType": "update",
    "blockedPath": "/etc",
    "allowedPaths": ["/path/to/project/**"]
  }
}
```

### File Size Limit Error

**Input:**
```typescript
const result = await fileReader.execute({
  path: 'large-file.bin',
  purpose: 'read'
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "error": "File size exceeds maximum allowed: 15MB > 10MB",
  "code": "FILE_TOO_LARGE",
  "metadata": {
    "fileSize": 15728640,
    "maxAllowedSize": 10485760,
    "path": "large-file.bin"
  }
}
```

### Natural Language Interpretation Error

**Input:**
```typescript
const result = await packfsTool.execute({
  naturalLanguageQuery: "do something with the files maybe"
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "error": "Could not interpret query with sufficient confidence",
  "interpretations": [
    {
      "intent": "list_files",
      "confidence": 0.3
    },
    {
      "intent": "search_files",
      "confidence": 0.25
    }
  ],
  "suggestions": [
    "Try: 'list all files in the project'",
    "Try: 'search for files containing specific text'",
    "Try: 'create a new file called filename.ext'"
  ],
  "metadata": {
    "executionTime": 67,
    "operationType": "natural_language",
    "minConfidenceRequired": 0.6
  }
}
```

## Performance Monitoring

All Mastra integration responses include detailed performance metadata:

```json
{
  "success": true,
  "content": "...",
  "metadata": {
    "executionTime": 145,
    "filesAccessed": ["file1.txt", "file2.txt"],
    "operationType": "access",
    "mastra": {
      "retries": 0,
      "cacheHit": true,
      "traceId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "performance": {
      "indexLookup": 23,
      "fileRead": 89,
      "semanticSearch": 0,
      "total": 145
    }
  }
}
```