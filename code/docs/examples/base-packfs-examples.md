# Base PackFS Examples - v0.2.0

This document shows input/output examples for the base PackFS semantic filesystem operations. All examples use the new flat output structure introduced in v0.2.0.

## Table of Contents
- [File Access Operations](#file-access-operations)
- [Content Update Operations](#content-update-operations)
- [File Discovery Operations](#file-discovery-operations)
- [File Organization Operations](#file-organization-operations)
- [Natural Language Operations](#natural-language-operations)

## Setup

```typescript
import { DiskSemanticBackend } from 'packfs-core';

const filesystem = new DiskSemanticBackend('/path/to/project', {
  enableNaturalLanguage: true,
  semanticThreshold: 0.5
});

await filesystem.initialize();
```

## File Access Operations

### Read File Content

**Input:**
```typescript
await filesystem.accessFile({
  purpose: 'read',
  target: { path: 'README.md' }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "content": "# My Project\n\nThis is the project documentation...",
  "exists": true,
  "metadata": {
    "size": 1234,
    "modified": "2024-06-20T10:00:00Z",
    "type": "text/markdown"
  }
}
```

### Check File Existence

**Input:**
```typescript
await filesystem.accessFile({
  purpose: 'verify_exists',
  target: { path: 'config.json' }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "exists": true,
  "message": "Found 1 matching files"
}
```

### Get File Metadata

**Input:**
```typescript
await filesystem.accessFile({
  purpose: 'metadata',
  target: { path: 'package.json' }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "exists": true,
  "metadata": {
    "size": 2456,
    "created": "2024-01-15T08:00:00Z",
    "modified": "2024-06-20T14:30:00Z",
    "type": "application/json",
    "permissions": "rw-r--r--"
  }
}
```

### Preview File Content

**Input:**
```typescript
await filesystem.accessFile({
  purpose: 'preview',
  target: { path: 'src/index.ts' },
  preferences: { maxLines: 10 }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "exists": true,
  "preview": "import { Application } from './app';\nimport { Config } from './config';\n\n// Initialize application\nconst app = new Application();\n...",
  "metadata": {
    "totalLines": 150,
    "size": 4567
  }
}
```

## Content Update Operations

### Create New File

**Input:**
```typescript
await filesystem.updateContent({
  purpose: 'create',
  target: { path: 'notes/meeting.md' },
  content: '# Meeting Notes\n\n- Discussed project timeline\n- Reviewed requirements'
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": true,
  "path": "notes/meeting.md",
  "bytesWritten": 67,
  "metadata": {
    "created": "2024-06-20T15:00:00Z"
  }
}
```

### Append to File

**Input:**
```typescript
await filesystem.updateContent({
  purpose: 'append',
  target: { path: 'logs/app.log' },
  content: '\n[2024-06-20 15:30:00] User logged in'
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": false,
  "path": "logs/app.log",
  "bytesWritten": 38,
  "previousSize": 1024,
  "newSize": 1062
}
```

### Overwrite File

**Input:**
```typescript
await filesystem.updateContent({
  purpose: 'overwrite',
  target: { path: 'config/settings.json' },
  content: JSON.stringify({ theme: 'dark', language: 'en' }, null, 2),
  options: { backup: true }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": false,
  "path": "config/settings.json",
  "bytesWritten": 45,
  "backupPath": "config/settings.json.backup",
  "metadata": {
    "modified": "2024-06-20T15:45:00Z"
  }
}
```

## File Discovery Operations

### List Directory Contents

**Input:**
```typescript
await filesystem.discoverFiles({
  purpose: 'list',
  target: { path: 'src' },
  options: { recursive: false }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "src/index.ts",
      "type": "file",
      "size": 2345
    },
    {
      "path": "src/components",
      "type": "directory",
      "itemCount": 12
    },
    {
      "path": "src/utils.ts",
      "type": "file",
      "size": 1234
    }
  ],
  "totalFound": 3,
  "searchTime": 15
}
```

### Find Files by Pattern

**Input:**
```typescript
await filesystem.discoverFiles({
  purpose: 'find',
  target: { 
    pattern: '*.test.ts',
    path: 'src'
  },
  options: { recursive: true }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "src/components/Button.test.ts",
      "size": 3456,
      "matches": 1
    },
    {
      "path": "src/utils/validator.test.ts",
      "size": 2345,
      "matches": 1
    }
  ],
  "totalFound": 2,
  "searchTime": 45,
  "metadata": {
    "searchDepth": 3,
    "dirsScanned": 15
  }
}
```

### Search File Contents

**Input:**
```typescript
await filesystem.discoverFiles({
  purpose: 'search_content',
  target: {
    path: 'docs',
    query: 'authentication'
  },
  options: {
    maxResults: 5,
    includeContext: true
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "docs/api/auth.md",
      "matches": 8,
      "relevance": 0.95,
      "preview": "...handle user authentication using JWT tokens...",
      "lineNumbers": [15, 23, 45, 67, 89, 102, 145, 178]
    },
    {
      "path": "docs/setup.md",
      "matches": 3,
      "relevance": 0.72,
      "preview": "...configure authentication providers...",
      "lineNumbers": [34, 56, 78]
    }
  ],
  "totalFound": 2,
  "searchTime": 123,
  "metadata": {
    "filesScanned": 45,
    "totalMatches": 11
  }
}
```

### Semantic Search

**Input:**
```typescript
await filesystem.discoverFiles({
  purpose: 'search_semantic',
  target: {
    semanticQuery: 'how to handle user login',
    path: '.'
  },
  options: {
    threshold: 0.7,
    maxResults: 3
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
      "relevanceScore": 0.92,
      "snippet": "export async function handleUserLogin(credentials: LoginCredentials) {",
      "semanticMatches": ["user login", "authentication", "credentials"]
    },
    {
      "path": "docs/authentication-guide.md",
      "relevanceScore": 0.85,
      "snippet": "## User Login Flow\n\n1. User submits credentials\n2. Validate against database",
      "semanticMatches": ["login flow", "user authentication"]
    },
    {
      "path": "examples/login-form.tsx",
      "relevanceScore": 0.73,
      "snippet": "const LoginForm = () => {\n  const handleSubmit = async (formData) => {",
      "semanticMatches": ["login form", "user input"]
    }
  ],
  "totalFound": 3,
  "searchTime": 215,
  "metadata": {
    "semanticModel": "content-similarity",
    "threshold": 0.7
  }
}
```

## File Organization Operations

### Create Directory

**Input:**
```typescript
await filesystem.organizeFiles({
  purpose: 'create_directory',
  destination: { path: 'src/features/auth' },
  options: { createPath: true }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "created": true,
  "path": "src/features/auth",
  "filesAffected": 0,
  "metadata": {
    "created": "2024-06-20T16:00:00Z",
    "parentDirs": ["src", "src/features"]
  }
}
```

### Move Files

**Input:**
```typescript
await filesystem.organizeFiles({
  purpose: 'move',
  source: { path: 'temp/*.log' },
  destination: { path: 'logs/archive' },
  options: { overwrite: false }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "filesAffected": 5,
  "movedFiles": [
    {
      "from": "temp/app.log",
      "to": "logs/archive/app.log",
      "size": 2345
    },
    {
      "from": "temp/error.log",
      "to": "logs/archive/error.log",
      "size": 5678
    }
  ],
  "totalSize": 15234,
  "metadata": {
    "operation": "move",
    "timestamp": "2024-06-20T16:15:00Z"
  }
}
```

### Copy Files

**Input:**
```typescript
await filesystem.organizeFiles({
  purpose: 'copy',
  source: { path: 'templates/component.tsx' },
  destination: { path: 'src/components/NewFeature.tsx' }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "filesAffected": 1,
  "copiedFiles": [
    {
      "from": "templates/component.tsx",
      "to": "src/components/NewFeature.tsx",
      "size": 1234
    }
  ],
  "totalSize": 1234
}
```

## Natural Language Operations

### Natural Language File Access

**Input:**
```typescript
await filesystem.interpretNaturalLanguage({
  query: "show me the main configuration file",
  context: { workingDirectory: '/project' }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "interpretedIntent": {
    "operation": "access",
    "purpose": "read",
    "target": { 
      "path": "config/app.config.js",
      "confidence": 0.89
    }
  },
  "alternativeInterpretations": [
    {
      "path": "package.json",
      "confidence": 0.76
    },
    {
      "path": ".env",
      "confidence": 0.65
    }
  ],
  "metadata": {
    "interpretationTime": 45,
    "model": "semantic-intent"
  }
}
```

### Natural Language Search

**Input:**
```typescript
await filesystem.interpretNaturalLanguage({
  query: "find all files about user authentication",
  context: { projectType: 'web-app' }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "interpretedIntent": {
    "operation": "discover",
    "purpose": "search_semantic",
    "target": {
      "semanticQuery": "user authentication",
      "suggestedPaths": ["src/auth", "docs", "tests/auth"]
    }
  },
  "metadata": {
    "queryType": "semantic-search",
    "expandedTerms": ["authentication", "auth", "login", "user", "security"]
  }
}
```

### Natural Language File Creation

**Input:**
```typescript
await filesystem.interpretNaturalLanguage({
  query: "create a new test file for the user service",
  context: { 
    testFramework: 'jest',
    testDirectory: 'tests'
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "interpretedIntent": {
    "operation": "update",
    "purpose": "create",
    "target": {
      "path": "tests/services/user.service.test.ts",
      "confidence": 0.91
    },
    "suggestedContent": "import { UserService } from '../../src/services/user.service';\n\ndescribe('UserService', () => {\n  // Test cases here\n});"
  },
  "metadata": {
    "inferredFileType": "jest-test",
    "namingConvention": "service.test.ts"
  }
}
```

## Error Responses

### File Not Found

**Input:**
```typescript
await filesystem.accessFile({
  purpose: 'read',
  target: { path: 'non-existent.txt' }
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "exists": false,
  "error": "File not found: non-existent.txt",
  "suggestions": [
    {
      "path": "non-existent.md",
      "similarity": 0.85
    },
    {
      "path": "docs/existent.txt",
      "similarity": 0.72
    }
  ],
  "metadata": {
    "searchedPaths": [".", "docs", "src"],
    "timestamp": "2024-06-20T16:30:00Z"
  }
}
```

### Permission Denied

**Input:**
```typescript
await filesystem.updateContent({
  purpose: 'overwrite',
  target: { path: '/etc/system.conf' },
  content: 'new content'
});
```

**Output (v0.2.0):**
```json
{
  "success": false,
  "error": "Permission denied: cannot write to /etc/system.conf",
  "code": "EACCES",
  "metadata": {
    "requiredPermission": "write",
    "currentPermission": "read"
  }
}
```

## Performance Metadata

All operations include performance metrics in the metadata:

```json
{
  "success": true,
  "content": "...",
  "metadata": {
    "executionTime": 45,
    "cacheHit": true,
    "indexVersion": "2024.06.20.001",
    "operations": {
      "diskRead": 1,
      "indexLookup": 3,
      "semanticSearch": 0
    }
  }
}
```