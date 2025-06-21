# LangChain Integration Examples - v0.2.0

This document shows input/output examples for the LangChain.js framework integration with PackFS v0.2.0's flat output structure.

## Table of Contents
- [Setup](#setup)
- [Basic Tool Usage](#basic-tool-usage)
- [String-Based Inputs](#string-based-inputs)
- [Structured Inputs](#structured-inputs)
- [Tool Set Usage](#tool-set-usage)
- [Chain Integration](#chain-integration)
- [Agent Integration](#agent-integration)

## Setup

### Basic Tool Configuration

```typescript
import { createLangChainSemanticFilesystemTool } from 'packfs-core';

const packfsTool = createLangChainSemanticFilesystemTool({
  workingDirectory: '/path/to/project',
  langchain: {
    verbose: true,
    metadata: { 
      toolVersion: '0.2.0',
      environment: 'development'
    },
    callbacks: [] // LangChain callbacks
  }
});
```

### Tool Set Configuration

```typescript
import { createLangChainSemanticToolSet } from 'packfs-core';

const { readTool, writeTool, searchTool, organizeTool } = 
  createLangChainSemanticToolSet({
    workingDirectory: '/path/to/project',
    langchain: {
      verbose: true
    }
  });
```

## Basic Tool Usage

### Natural Language String Input

**Input:**
```typescript
const result = await packfsTool.func("read the configuration file");
```

**Output (v0.2.0):**
```json
"File: config.json\n\nContent:\n{\n  \"apiUrl\": \"https://api.example.com\",\n  \"port\": 3000,\n  \"debug\": true\n}\n\nMetadata:\n- Size: 89 bytes\n- Modified: 2024-06-20T10:00:00Z\n- Type: application/json"
```

### Natural Language File Creation

**Input:**
```typescript
const result = await packfsTool.func("create a README file with project information");
```

**Output (v0.2.0):**
```json
"Successfully created file: README.md\n\nContent preview:\n# Project Name\n\nThis project was created on 2024-06-20.\n\n## Description\n[Add project description here]\n\n## Installation\n[Add installation instructions here]\n\nFile created with 234 bytes"
```

### Natural Language Search

**Input:**
```typescript
const result = await packfsTool.func("find all TypeScript files that use React hooks");
```

**Output (v0.2.0):**
```json
"Found 3 files matching your search:\n\n1. src/components/UserList.tsx\n   - Relevance: 95%\n   - Uses: useState, useEffect\n   - Preview: \"import { useState, useEffect } from 'react';\"\n\n2. src/hooks/useAuth.tsx\n   - Relevance: 88%\n   - Uses: useState, useContext, useCallback\n   - Preview: \"export const useAuth = () => {\"\n\n3. src/pages/Dashboard.tsx\n   - Relevance: 76%\n   - Uses: useState, useMemo\n   - Preview: \"const Dashboard: React.FC = () => {\"\n\nSearch completed in 145ms"
```

## String-Based Inputs

### Simple Read Request

**Input:**
```typescript
const result = await packfsTool.func("show me what's in package.json");
```

**Output (v0.2.0):**
```json
"File: package.json\n\n{\n  \"name\": \"my-project\",\n  \"version\": \"1.0.0\",\n  \"description\": \"A sample project\",\n  \"main\": \"index.js\",\n  \"scripts\": {\n    \"start\": \"node index.js\",\n    \"test\": \"jest\"\n  },\n  \"dependencies\": {\n    \"express\": \"^4.18.0\"\n  }\n}\n\nFile info: 234 bytes, last modified 2024-06-20"
```

### Directory Listing Request

**Input:**
```typescript
const result = await packfsTool.func("list all files in the src directory");
```

**Output (v0.2.0):**
```json
"Directory: src/\n\nFiles (5):\n├── index.ts (2.3 KB)\n├── app.ts (4.5 KB)\n├── config.ts (1.2 KB)\n├── types.ts (890 B)\n└── utils.ts (3.1 KB)\n\nSubdirectories (3):\n├── components/ (12 files)\n├── services/ (8 files)\n└── tests/ (15 files)\n\nTotal: 5 files, 11.9 KB"
```

## Structured Inputs

### Object-Based Read

**Input:**
```typescript
const result = await packfsTool.func({
  operation: 'read',
  path: 'src/services/auth.service.ts'
});
```

**Output (v0.2.0) - Returns structured data as JSON string:**
```json
"{\n  \"success\": true,\n  \"content\": \"import { User } from '../types';\\n\\nexport class AuthService {\\n  async login(email: string, password: string): Promise<User> {\\n    // Authentication logic\\n  }\\n}\",\n  \"exists\": true,\n  \"metadata\": {\n    \"size\": 245,\n    \"lines\": 8,\n    \"language\": \"typescript\"\n  }\n}"
```

### Object-Based Search

**Input:**
```typescript
const result = await packfsTool.func({
  operation: 'search',
  query: 'database connection',
  path: 'src',
  maxResults: 5
});
```

**Output (v0.2.0) - Returns formatted string:**
```json
"Search Results for 'database connection':\n\n1. src/db/connection.ts (Score: 0.95)\n   Line 5: const connection = await createDatabaseConnection({\n   Line 12: if (!connection.isActive()) {\n\n2. src/config/database.ts (Score: 0.82)\n   Line 3: export const databaseConfig = {\n   Line 8: connectionTimeout: 5000,\n\n3. src/services/data.service.ts (Score: 0.71)\n   Line 15: const db = await getDatabaseConnection();\n\nFound 3 matches in 156ms"
```

### JSON String Input

**Input:**
```typescript
const jsonInput = JSON.stringify({
  query: "create a new test file for the auth service",
  type: "test"
});
const result = await packfsTool.func(jsonInput);
```

**Output (v0.2.0):**
```json
"Created: src/services/auth.service.test.ts\n\nGenerated content:\nimport { AuthService } from './auth.service';\n\ndescribe('AuthService', () => {\n  let authService: AuthService;\n\n  beforeEach(() => {\n    authService = new AuthService();\n  });\n\n  it('should be defined', () => {\n    expect(authService).toBeDefined();\n  });\n\n  // Add your test cases here\n});\n\nFile created successfully (367 bytes)"
```

## Tool Set Usage

### Read Tool

**Input:**
```typescript
const result = await readTool.func({
  path: '.env.example',
  includeMetadata: true
});
```

**Output (v0.2.0):**
```json
"File: .env.example\n\n# Environment Variables\nNODE_ENV=development\nPORT=3000\nDATABASE_URL=postgresql://localhost/mydb\nJWT_SECRET=your-secret-key\n\nMetadata:\n- Size: 123 bytes\n- Created: 2024-06-15\n- Modified: 2024-06-20\n- Permissions: rw-r--r--"
```

### Write Tool

**Input:**
```typescript
const result = await writeTool.func({
  path: 'logs/debug.log',
  content: '[2024-06-20 15:30:00] Debug: Application initialized\n',
  mode: 'append'
});
```

**Output (v0.2.0):**
```json
"Successfully appended to: logs/debug.log\n\nAdded 54 bytes\nNew file size: 1,234 bytes\nLast line: [2024-06-20 15:30:00] Debug: Application initialized"
```

### Search Tool

**Input:**
```typescript
const result = await searchTool.func({
  pattern: '*.test.{js,ts}',
  directory: 'src'
});
```

**Output (v0.2.0):**
```json
"Found 8 test files:\n\n1. src/utils/validator.test.ts (3.4 KB)\n2. src/utils/parser.test.ts (2.1 KB)\n3. src/services/auth.test.ts (4.5 KB)\n4. src/services/user.test.ts (3.8 KB)\n5. src/components/Button.test.js (1.9 KB)\n6. src/components/Form.test.js (2.7 KB)\n7. src/api/routes.test.ts (5.2 KB)\n8. src/api/middleware.test.ts (3.3 KB)\n\nTotal: 26.9 KB across 8 files"
```

### Organize Tool

**Input:**
```typescript
const result = await organizeTool.func({
  operation: 'move',
  pattern: 'temp/*.log',
  destination: 'logs/archive/',
  createPath: true
});
```

**Output (v0.2.0):**
```json
"File Organization Complete:\n\nMoved 4 files:\n- temp/app.log → logs/archive/app.log (2.3 KB)\n- temp/error.log → logs/archive/error.log (5.6 KB)\n- temp/access.log → logs/archive/access.log (8.9 KB)\n- temp/debug.log → logs/archive/debug.log (1.2 KB)\n\nTotal: 18.0 KB moved\nCreated directory: logs/archive/"
```

## Chain Integration

### Sequential Chain Example

```typescript
import { SequentialChain } from 'langchain/chains';

const searchAndReadChain = new SequentialChain({
  chains: [
    {
      name: 'search',
      tool: searchTool,
      outputKey: 'searchResults'
    },
    {
      name: 'read',
      tool: readTool,
      outputKey: 'fileContent'
    }
  ]
});

// Input
const chainResult = await searchAndReadChain.call({
  input: "find and read the main configuration file"
});
```

**Chain Execution Output:**
```json
{
  "searchResults": "Found configuration files:\n1. config/app.config.js (Main configuration)\n2. config/database.config.js\n3. .env.example",
  "fileContent": "File: config/app.config.js\n\nmodule.exports = {\n  app: {\n    name: 'My Application',\n    version: '1.0.0',\n    port: process.env.PORT || 3000\n  },\n  features: {\n    authentication: true,\n    logging: true\n  }\n};\n\nConfiguration loaded successfully"
}
```

## Agent Integration

### ReAct Agent Example

```typescript
import { OpenAI } from 'langchain/llms/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';

const tools = [packfsTool, readTool, writeTool, searchTool];

const agent = await initializeAgentExecutorWithOptions(
  tools,
  new OpenAI({ temperature: 0 }),
  {
    agentType: "zero-shot-react-description",
    verbose: true
  }
);

// Agent execution
const result = await agent.call({
  input: "Find all error handling files and create a summary document"
});
```

**Agent Execution Trace:**
```
Thought: I need to search for files related to error handling first
Action: semantic_filesystem
Action Input: find all files about error handling

Observation: Found 4 files matching your search:

1. src/utils/errorHandler.ts
   - Relevance: 95%
   - Preview: "export class ErrorHandler {"

2. src/middleware/errorMiddleware.ts
   - Relevance: 88%
   - Preview: "export const errorMiddleware = (err, req, res, next) => {"

3. src/types/errors.ts
   - Relevance: 76%
   - Preview: "export interface AppError extends Error {"

4. docs/error-handling.md
   - Relevance: 72%
   - Preview: "# Error Handling Guide"

Thought: Now I'll read the main error handler to understand the structure
Action: read_file
Action Input: { "path": "src/utils/errorHandler.ts" }

Observation: File: src/utils/errorHandler.ts

export class ErrorHandler {
  static handle(error: Error): void {
    console.error('[ERROR]', error.message);
    // Additional error handling logic
  }
}

Thought: I'll create a summary document with the findings
Action: write_file
Action Input: {
  "path": "docs/error-handling-summary.md",
  "content": "# Error Handling Summary\n\n## Files Overview\n\n1. **errorHandler.ts** - Main error handling class\n2. **errorMiddleware.ts** - Express middleware for errors\n3. **errors.ts** - Error type definitions\n4. **error-handling.md** - Documentation\n\n## Key Components\n\n- Centralized error handling via ErrorHandler class\n- Middleware integration for Express\n- Custom error types for different scenarios",
  "mode": "create"
}

Observation: Successfully created file: docs/error-handling-summary.md

Content preview:
# Error Handling Summary

## Files Overview
...

File created with 456 bytes

Final Answer: I've successfully found 4 error handling related files and created a summary document at docs/error-handling-summary.md. The summary includes an overview of the error handling architecture with the main ErrorHandler class, Express middleware integration, custom error types, and existing documentation.
```

## Error Handling

### Invalid Path Error

**Input:**
```typescript
const result = await packfsTool.func({
  operation: 'read',
  path: '../../../etc/passwd'
});
```

**Output (v0.2.0):**
```json
"Error: Security validation failed\n\nPath '../../../etc/passwd' is not allowed.\nAllowed paths must be within: /path/to/project/**\n\nPlease use a path within the project directory."
```

### Natural Language Ambiguity

**Input:**
```typescript
const result = await packfsTool.func("do something with files");
```

**Output (v0.2.0):**
```json
"I couldn't understand your request clearly.\n\nDid you mean:\n- List files? Try: \"show all files\"\n- Search for files? Try: \"find files containing [text]\"\n- Read a file? Try: \"read [filename]\"\n- Create a file? Try: \"create a file called [name]\"\n\nPlease be more specific about what you'd like to do."
```

### File Not Found with Suggestions

**Input:**
```typescript
const result = await readTool.func({
  path: 'confg.json'  // typo
});
```

**Output (v0.2.0):**
```json
"Error: File not found: confg.json\n\nDid you mean one of these?\n- config.json (similarity: 91%)\n- config.ts (similarity: 82%)\n- conf/app.json (similarity: 75%)\n\nTip: Use the search tool to find files when unsure of the exact name."
```

## Streaming Responses

For large file operations, LangChain can stream responses:

```typescript
const streamingTool = createLangChainSemanticFilesystemTool({
  workingDirectory: '/project',
  langchain: {
    streaming: true,
    callbacks: [
      {
        handleLLMNewToken(token: string) {
          process.stdout.write(token);
        }
      }
    ]
  }
});

// Streaming output appears token by token:
// "Reading large file: data.csv\n"
// "Line 1: header1,header2,header3\n"
// "Line 2: value1,value2,value3\n"
// ... (streams as it reads)
```

## Verbose Mode Output

When verbose mode is enabled, additional execution details are included:

```typescript
const verboseResult = await packfsTool.func("read config file");
```

**Verbose Output:**
```
[PackFS] Interpreting natural language query: "read config file"
[PackFS] Identified intent: { operation: "access", purpose: "read", confidence: 0.89 }
[PackFS] Searching for config files...
[PackFS] Found candidates: ["config.json", "config.ts", ".config.yml"]
[PackFS] Selected best match: "config.json" (confidence: 0.92)
[PackFS] Reading file: config.json
[PackFS] Operation completed in 67ms

File: config.json

{
  "apiUrl": "https://api.example.com",
  "timeout": 5000
}

Execution details:
- Intent parsing: 23ms
- File search: 31ms  
- File read: 13ms
- Total: 67ms
```