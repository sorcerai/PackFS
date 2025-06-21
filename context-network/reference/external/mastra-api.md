# Mastra Framework API Reference

Generated: 2025-06-20T18:54:05.465Z

## Core Concepts

### Tool Definition
```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  execute: (input: ToolInput, context: RuntimeContext) => Promise<ToolOutput>;
}
```

### Tool Input/Output
```typescript
interface ToolInput {
  [key: string]: any; // Validated by inputSchema
}

interface ToolOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}
```

### Runtime Context
```typescript
interface RuntimeContext {
  agentId?: string;
  sessionId?: string;
  userId?: string;
  [key: string]: any;
}
```

## PackFS Mastra Tools

### Tool Suite Creation
```typescript
const tools = createMastraSemanticToolSuite({
  workingDirectory: string;  // Required
  filesystem?: SemanticFileSystemInterface;
  maxFileSize?: number;
  allowedExtensions?: string[];
  pathRestrictions?: string[];
  rateLimit?: { requestsPerMinute: number };
});
```

### Available Tools

#### fileReader
- **Purpose**: Read files with semantic targeting
- **Input Schema**:
  - `filePath` (string): Path or semantic description
  - `encoding` (string, optional): File encoding
- **Output**: File content or error with suggestions

#### fileWriter  
- **Purpose**: Write or update files
- **Input Schema**:
  - `filePath` (string): Target file path
  - `content` (string): Content to write
  - `mode` (string, optional): 'overwrite' | 'append' | 'create'
- **Output**: Success status with bytes written

#### fileSearcher
- **Purpose**: Search for files by content or name
- **Input Schema**:
  - `query` (string): Search query
  - `searchType` (string): 'content' | 'filename' | 'semantic'
  - `maxResults` (number, optional): Result limit
- **Output**: Array of matching files with metadata

#### fileLister
- **Purpose**: List directory contents
- **Input Schema**:
  - `directory` (string): Directory to list
  - `recursive` (boolean, optional): Include subdirectories
  - `pattern` (string, optional): Filter pattern
- **Output**: Directory listing with file metadata

## Integration Examples

### With Mastra Agent
```typescript
import { Agent } from '@mastra/core';
import { createMastraSemanticToolSuite } from 'packfs-core';

const agent = new Agent({
  name: 'FileAssistant',
  tools: createMastraSemanticToolSuite({
    workingDirectory: '/project'
  })
});

const result = await agent.run({
  messages: [{ 
    role: 'user', 
    content: 'Find and read the configuration file' 
  }]
});
```

### Direct Tool Usage
```typescript
const tools = createMastraSemanticToolSuite({
  workingDirectory: '/project'
});

const readResult = await tools.fileReader.execute({
  filePath: 'config file'
}, {
  agentId: 'agent-123'
});
```

## Security Features

### Path Validation
- Prevents directory traversal attacks
- Validates against path restrictions
- Normalizes paths for consistency

### Rate Limiting  
- Configurable requests per minute
- Per-agent tracking
- Prevents abuse

### File Filtering
- Extension whitelist/blacklist
- Size limits
- Content type validation

## Error Handling

All tools return consistent error format:
```typescript
{
  success: false,
  error: string,
  suggestions?: Array<{
    type: string;
    description: string;
    data: any;
  }>
}
```

Common errors:
- File not found (includes suggestions)
- Permission denied
- Rate limit exceeded
- Invalid path
- File too large
