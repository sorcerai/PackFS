# KaibanJS Integration Examples - v0.2.0

This document shows input/output examples for the KaibanJS multi-agent framework integration with PackFS v0.2.0's flat output structure.

## Table of Contents
- [Setup](#setup)
- [Single Agent Tool Usage](#single-agent-tool-usage)
- [Task Actions](#task-actions)
- [Multi-Agent Coordination](#multi-agent-coordination)
- [Collaborative Workflows](#collaborative-workflows)
- [State Management](#state-management)

## Setup

### Basic Agent Configuration

```typescript
import { createKaibanSemanticFilesystemTool } from 'packfs-core';
import { Agent } from 'kaibanjs';

const packfsTool = createKaibanSemanticFilesystemTool({
  workingDirectory: '/path/to/project',
  kaiban: {
    agentId: 'file-assistant',
    teamId: 'dev-team',
    capabilities: ['read', 'write', 'analyze'],
    sharedState: true,
    errorHandler: (error) => console.error('Agent error:', error),
    stateChangeHandler: (state) => console.log('State:', state)
  }
});

const fileAgent = new Agent({
  name: 'File Assistant',
  role: 'File Management Specialist',
  goal: 'Efficiently manage project files',
  tools: [packfsTool]
});
```

### Task Actions Configuration

```typescript
import { createKaibanFileSystemActions } from 'packfs-core';

const fileActions = createKaibanFileSystemActions({
  workingDirectory: '/path/to/project',
  kaiban: {
    enableStateSync: true,
    taskPrefix: 'FS'
  }
});
```

### Multi-Agent Coordinator

```typescript
import { createKaibanMultiAgentFileCoordinator } from 'packfs-core';

const coordinator = createKaibanMultiAgentFileCoordinator({
  workingDirectory: '/path/to/project',
  agents: ['researcher', 'developer', 'reviewer'],
  kaiban: {
    coordinationStrategy: 'parallel',
    conflictResolution: 'timestamp'
  }
});
```

## Single Agent Tool Usage

### Natural Language Query with Agent Context

**Input:**
```typescript
const result = await packfsTool.execute({
  query: "find all configuration files that need updating",
  agentContext: {
    agentId: 'config-manager',
    previousFindings: ['old-config.json', 'legacy-settings.ini']
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "files": [
    {
      "path": "config/app.config.js",
      "needsUpdate": true,
      "reason": "Using deprecated API endpoints",
      "lastModified": "2024-01-15T10:00:00Z",
      "relevance": 0.92
    },
    {
      "path": ".env.example",
      "needsUpdate": true,
      "reason": "Missing new required environment variables",
      "lastModified": "2024-02-20T14:30:00Z",
      "relevance": 0.85
    },
    {
      "path": "docker-compose.yml",
      "needsUpdate": true,
      "reason": "Outdated service versions",
      "lastModified": "2024-03-10T09:15:00Z",
      "relevance": 0.78
    }
  ],
  "totalFound": 3,
  "searchTime": 234,
  "metadata": {
    "agentId": "config-manager",
    "analysisMethod": "semantic-outdated-pattern-detection",
    "executionTime": 256
  },
  "agentState": {
    "tasksCompleted": 1,
    "currentFocus": "configuration-analysis"
  }
}
```

### Collaborative File Operation

**Input:**
```typescript
const result = await packfsTool.execute({
  operation: 'update',
  target: { path: 'docs/architecture.md' },
  content: '## New Section: Microservices Architecture\n\n...',
  collaborative: {
    lockFile: true,
    notifyAgents: ['reviewer', 'tech-writer'],
    mergeStrategy: 'append'
  }
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "path": "docs/architecture.md",
  "operation": "collaborative-update",
  "bytesWritten": 456,
  "created": false,
  "lockAcquired": true,
  "lockId": "lock_123456",
  "collaborativeMetadata": {
    "mergedWith": "existing-content",
    "conflictsResolved": 0,
    "notifiedAgents": [
      {
        "agentId": "reviewer",
        "notificationSent": true,
        "acknowledged": false
      },
      {
        "agentId": "tech-writer",
        "notificationSent": true,
        "acknowledged": true
      }
    ]
  },
  "metadata": {
    "agentId": "file-assistant",
    "teamId": "dev-team",
    "timestamp": "2024-06-20T15:30:00Z"
  }
}
```

## Task Actions

### Read Task Action

**Input:**
```typescript
const readTask = fileActions.createReadTask({
  taskId: 'FS-001',
  targetFile: 'src/services/user.service.ts',
  requirements: {
    extractImports: true,
    analyzeComplexity: true
  }
});

const result = await readTask.execute();
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "taskId": "FS-001",
  "content": "import { Injectable } from '@nestjs/common';\nimport { User } from '../models/user.model';\nimport { DatabaseService } from './database.service';\n\n@Injectable()\nexport class UserService {\n  constructor(private db: DatabaseService) {}\n  \n  async findAll(): Promise<User[]> {\n    return this.db.users.findMany();\n  }\n}",
  "exists": true,
  "analysis": {
    "imports": [
      { "module": "@nestjs/common", "items": ["Injectable"] },
      { "module": "../models/user.model", "items": ["User"] },
      { "module": "./database.service", "items": ["DatabaseService"] }
    ],
    "complexity": {
      "cyclomatic": 2,
      "cognitive": 3,
      "linesOfCode": 15,
      "methods": 1
    }
  },
  "taskMetadata": {
    "executionTime": 145,
    "taskStatus": "completed",
    "nextTasks": ["FS-002-analyze-dependencies"]
  }
}
```

### Write Task Action

**Input:**
```typescript
const writeTask = fileActions.createWriteTask({
  taskId: 'FS-002',
  targetFile: 'tests/user.service.test.ts',
  template: 'jest-service-test',
  context: {
    serviceName: 'UserService',
    methods: ['findAll', 'findById', 'create']
  }
});

const result = await writeTask.execute();
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "taskId": "FS-002",
  "created": true,
  "path": "tests/user.service.test.ts",
  "bytesWritten": 678,
  "generatedContent": "import { Test, TestingModule } from '@nestjs/testing';\nimport { UserService } from '../src/services/user.service';\n\ndescribe('UserService', () => {\n  let service: UserService;\n\n  beforeEach(async () => {\n    const module: TestingModule = await Test.createTestingModule({\n      providers: [UserService],\n    }).compile();\n\n    service = module.get<UserService>(UserService);\n  });\n\n  describe('findAll', () => {\n    it('should return an array of users', async () => {\n      const result = await service.findAll();\n      expect(Array.isArray(result)).toBe(true);\n    });\n  });\n});",
  "taskMetadata": {
    "templateUsed": "jest-service-test",
    "templateVersion": "2.0",
    "generationStrategy": "context-aware",
    "taskStatus": "completed",
    "dependencies": ["FS-001"]
  }
}
```

### Search Task Action

**Input:**
```typescript
const searchTask = fileActions.createSearchTask({
  taskId: 'FS-003',
  searchCriteria: {
    pattern: 'TODO|FIXME|HACK',
    scope: 'src/**/*.{ts,js}',
    contextLines: 2
  },
  priority: 'high'
});

const result = await searchTask.execute();
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "taskId": "FS-003",
  "findings": [
    {
      "path": "src/api/auth.controller.ts",
      "line": 45,
      "match": "TODO",
      "content": "// TODO: Implement rate limiting for login attempts",
      "context": {
        "before": ["  async login(credentials: LoginDto) {", "    const user = await this.authService.validateUser(credentials);"],
        "after": ["    return this.authService.generateToken(user);", "  }"]
      },
      "priority": "medium",
      "category": "security"
    },
    {
      "path": "src/utils/validator.ts",
      "line": 23,
      "match": "FIXME",
      "content": "// FIXME: This regex doesn't handle international phone numbers",
      "context": {
        "before": ["function validatePhone(phone: string): boolean {", "  const phoneRegex = /^\\d{10}$/;"],
        "after": ["  return phoneRegex.test(phone);", "}"]
      },
      "priority": "high",
      "category": "bug"
    },
    {
      "path": "src/services/cache.service.ts",
      "line": 67,
      "match": "HACK",
      "content": "// HACK: Clearing cache by restarting - need proper cache invalidation",
      "context": {
        "before": ["  clearCache() {", "    // This is a temporary solution"],
        "after": ["    process.exit(0);", "  }"]
      },
      "priority": "critical",
      "category": "technical-debt"
    }
  ],
  "summary": {
    "total": 3,
    "byType": { "TODO": 1, "FIXME": 1, "HACK": 1 },
    "byPriority": { "critical": 1, "high": 1, "medium": 1 }
  },
  "taskMetadata": {
    "filesScanned": 45,
    "executionTime": 234,
    "taskStatus": "completed",
    "reportGenerated": true
  }
}
```

## Multi-Agent Coordination

### Parallel File Analysis

**Input:**
```typescript
const result = await coordinator.executeParallelTask({
  taskType: 'analyze-codebase',
  assignments: [
    {
      agentId: 'security-analyst',
      scope: 'src/**/*.ts',
      focus: 'security vulnerabilities'
    },
    {
      agentId: 'performance-analyst',
      scope: 'src/**/*.ts',
      focus: 'performance bottlenecks'
    },
    {
      agentId: 'quality-analyst',
      scope: 'src/**/*.ts',
      focus: 'code quality issues'
    }
  ]
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "coordinationId": "coord_789012",
  "results": {
    "security-analyst": {
      "success": true,
      "findings": [
        {
          "path": "src/api/user.controller.ts",
          "issue": "SQL injection vulnerability",
          "severity": "critical",
          "line": 34,
          "suggestion": "Use parameterized queries"
        },
        {
          "path": "src/utils/crypto.ts",
          "issue": "Weak encryption algorithm",
          "severity": "high",
          "line": 12,
          "suggestion": "Use bcrypt or argon2"
        }
      ],
      "filesAnalyzed": 23,
      "executionTime": 345
    },
    "performance-analyst": {
      "success": true,
      "findings": [
        {
          "path": "src/services/data.service.ts",
          "issue": "N+1 query problem",
          "impact": "high",
          "line": 67,
          "suggestion": "Use eager loading or data loader pattern"
        }
      ],
      "filesAnalyzed": 23,
      "executionTime": 298
    },
    "quality-analyst": {
      "success": true,
      "findings": [
        {
          "path": "src/utils/helpers.ts",
          "issue": "Function complexity too high",
          "complexity": 15,
          "line": 89,
          "suggestion": "Refactor into smaller functions"
        }
      ],
      "filesAnalyzed": 23,
      "executionTime": 267
    }
  },
  "summary": {
    "totalFindings": 4,
    "criticalIssues": 1,
    "totalExecutionTime": 345,
    "parallelEfficiency": "87%"
  },
  "metadata": {
    "coordinationStrategy": "parallel",
    "startTime": "2024-06-20T16:00:00Z",
    "endTime": "2024-06-20T16:00:00.345Z"
  }
}
```

### Sequential Workflow Coordination

**Input:**
```typescript
const result = await coordinator.executeSequentialWorkflow({
  workflowId: 'feature-implementation',
  steps: [
    {
      agentId: 'architect',
      task: 'design-api-structure',
      input: { feature: 'user-notifications' }
    },
    {
      agentId: 'developer',
      task: 'implement-api',
      dependsOn: 'design-api-structure'
    },
    {
      agentId: 'tester',
      task: 'write-tests',
      dependsOn: 'implement-api'
    },
    {
      agentId: 'reviewer',
      task: 'code-review',
      dependsOn: 'write-tests'
    }
  ]
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "workflowId": "feature-implementation",
  "steps": [
    {
      "stepId": "design-api-structure",
      "agentId": "architect",
      "status": "completed",
      "output": {
        "designDoc": "docs/api/notifications-design.md",
        "created": true,
        "specs": {
          "endpoints": ["/api/notifications", "/api/notifications/:id"],
          "methods": ["GET", "POST", "DELETE"],
          "schema": "defined"
        }
      },
      "duration": 123
    },
    {
      "stepId": "implement-api",
      "agentId": "developer",
      "status": "completed",
      "output": {
        "filesCreated": [
          "src/api/notifications.controller.ts",
          "src/services/notifications.service.ts",
          "src/models/notification.model.ts"
        ],
        "linesOfCode": 345,
        "testsRequired": 8
      },
      "duration": 456
    },
    {
      "stepId": "write-tests",
      "agentId": "tester",
      "status": "completed",
      "output": {
        "testsCreated": [
          "tests/api/notifications.test.ts",
          "tests/services/notifications.service.test.ts"
        ],
        "coverage": "92%",
        "testsPassed": 8
      },
      "duration": 234
    },
    {
      "stepId": "code-review",
      "agentId": "reviewer",
      "status": "completed",
      "output": {
        "reviewStatus": "approved",
        "comments": 3,
        "suggestions": [
          "Add input validation for notification content",
          "Consider caching for frequent queries"
        ],
        "qualityScore": 8.5
      },
      "duration": 189
    }
  ],
  "summary": {
    "totalDuration": 1002,
    "allStepsCompleted": true,
    "filesCreated": 6,
    "finalStatus": "ready-for-deployment"
  },
  "metadata": {
    "workflowType": "sequential",
    "parallelSteps": 0,
    "timestamp": "2024-06-20T17:00:00Z"
  }
}
```

## Collaborative Workflows

### Conflict Resolution

**Input:**
```typescript
const result = await coordinator.resolveConflict({
  conflictId: 'conflict_456',
  file: 'src/config.ts',
  agents: [
    {
      agentId: 'dev-1',
      changes: "export const API_URL = 'https://api.prod.com';"
    },
    {
      agentId: 'dev-2', 
      changes: "export const API_URL = process.env.API_URL || 'https://api.dev.com';"
    }
  ],
  strategy: 'intelligent-merge'
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "conflictId": "conflict_456",
  "resolution": "merged",
  "finalContent": "export const API_URL = process.env.API_URL || 'https://api.prod.com';",
  "mergeDetails": {
    "strategy": "intelligent-merge",
    "conflictType": "value-difference",
    "resolution": "combined-with-env-precedence",
    "agentContributions": {
      "dev-1": "production URL value",
      "dev-2": "environment variable pattern"
    }
  },
  "file": {
    "path": "src/config.ts",
    "updated": true,
    "bytesWritten": 67
  },
  "metadata": {
    "resolvedBy": "coordinator",
    "timestamp": "2024-06-20T18:00:00Z",
    "consensusReached": true
  }
}
```

### Team Code Review

**Input:**
```typescript
const result = await packfsTool.execute({
  operation: 'team-review',
  target: { 
    path: 'src/features/payment/**/*.ts',
    pullRequest: 'PR-123'
  },
  reviewers: ['senior-dev', 'security-expert', 'architect'],
  criteria: ['security', 'performance', 'architecture']
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "reviewId": "review_789",
  "files": [
    {
      "path": "src/features/payment/payment.service.ts",
      "reviews": {
        "senior-dev": {
          "status": "approved",
          "comments": [
            {
              "line": 45,
              "comment": "Consider extracting this logic to a separate method",
              "severity": "minor"
            }
          ],
          "score": 8
        },
        "security-expert": {
          "status": "changes-requested",
          "comments": [
            {
              "line": 67,
              "comment": "PCI compliance: Card numbers must be encrypted",
              "severity": "critical"
            }
          ],
          "score": 4
        },
        "architect": {
          "status": "approved",
          "comments": [
            {
              "line": 23,
              "comment": "Good separation of concerns",
              "severity": "positive"
            }
          ],
          "score": 9
        }
      }
    }
  ],
  "summary": {
    "overallStatus": "changes-requested",
    "criticalIssues": 1,
    "minorIssues": 1,
    "positiveComments": 1,
    "averageScore": 7,
    "consensusReached": false
  },
  "nextSteps": [
    {
      "action": "address-critical-security-issue",
      "assignedTo": "dev-1",
      "deadline": "2024-06-21T10:00:00Z"
    }
  ],
  "metadata": {
    "reviewDuration": 567,
    "teamId": "dev-team",
    "pullRequest": "PR-123"
  }
}
```

## State Management

### Agent State Synchronization

**Input:**
```typescript
const result = await packfsTool.execute({
  operation: 'access',
  purpose: 'read',
  target: { path: 'src/index.ts' },
  syncState: true
});
```

**Output (v0.2.0) with State Updates:**
```json
{
  "success": true,
  "content": "import { App } from './app';\n\nconst app = new App();\napp.start();",
  "exists": true,
  "stateUpdates": {
    "before": {
      "filesAccessed": 5,
      "lastFile": "package.json",
      "currentTask": "analyze-dependencies"
    },
    "after": {
      "filesAccessed": 6,
      "lastFile": "src/index.ts",
      "currentTask": "analyze-entry-point",
      "discoveries": ["entry-point-identified"]
    }
  },
  "sharedState": {
    "teamKnowledge": {
      "entryPoint": "src/index.ts",
      "appStructure": "modular",
      "initializationPattern": "class-based"
    }
  },
  "metadata": {
    "stateVersion": 23,
    "syncedWith": ["architect", "developer"],
    "timestamp": "2024-06-20T19:00:00Z"
  }
}
```

### Error Recovery with State

**Input:**
```typescript
packfsTool.onError = async (error, context) => {
  return await packfsTool.recoverWithState({
    error,
    lastKnownGoodState: context.state,
    recovery: 'rollback'
  });
};

// Trigger an error
const result = await packfsTool.execute({
  operation: 'update',
  target: { path: '/restricted/file.txt' },
  content: 'test'
});
```

**Error Output with Recovery:**
```json
{
  "success": false,
  "error": "Permission denied: /restricted/file.txt",
  "recovery": {
    "attempted": true,
    "strategy": "rollback",
    "stateRestored": true,
    "previousState": {
      "filesAccessed": 6,
      "lastSuccessfulOperation": "read",
      "lastFile": "src/index.ts"
    },
    "alternativeActions": [
      {
        "suggestion": "Write to allowed directory",
        "command": "update file.txt in project directory"
      }
    ]
  },
  "metadata": {
    "errorId": "err_123",
    "errorHandler": "custom",
    "recoveryTime": 45
  }
}
```

## Advanced Multi-Agent Patterns

### Consensus-Based File Modification

**Input:**
```typescript
const result = await coordinator.consensusModification({
  file: 'src/core/algorithm.ts',
  proposedChanges: [
    {
      agentId: 'optimizer',
      change: 'Replace bubble sort with quick sort',
      code: 'function quickSort(arr: number[]): number[] { ... }'
    },
    {
      agentId: 'maintainer',
      change: 'Keep bubble sort but optimize',
      code: 'function optimizedBubbleSort(arr: number[]): number[] { ... }'
    }
  ],
  votingAgents: ['architect', 'senior-dev', 'performance-expert'],
  threshold: 0.66
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "consensusReached": true,
  "selectedProposal": {
    "agentId": "optimizer",
    "change": "Replace bubble sort with quick sort",
    "votes": {
      "architect": { "vote": "approve", "reason": "Better algorithmic complexity" },
      "senior-dev": { "vote": "approve", "reason": "Industry standard" },
      "performance-expert": { "vote": "approve", "reason": "O(n log n) vs O(n²)" }
    },
    "approvalRate": 1.0
  },
  "implementation": {
    "file": "src/core/algorithm.ts",
    "changeApplied": true,
    "bytesWritten": 234,
    "performanceImprovement": "Expected 10x for large datasets"
  },
  "rejectedProposals": [
    {
      "agentId": "maintainer",
      "votes": 0,
      "feedback": "Optimization insufficient for performance requirements"
    }
  ],
  "metadata": {
    "consensusMethod": "weighted-voting",
    "deliberationTime": 456,
    "unanimousDecision": true
  }
}
```

### Knowledge Sharing Session

**Input:**
```typescript
const result = await coordinator.shareKnowledge({
  topic: 'new-api-patterns',
  discoveredBy: 'researcher',
  relevantFiles: ['src/api/v2/**/*.ts'],
  shareWith: 'all-agents'
});
```

**Output (v0.2.0):**
```json
{
  "success": true,
  "knowledgeId": "knowledge_345",
  "topic": "new-api-patterns",
  "sharedKnowledge": {
    "patterns": [
      {
        "name": "resource-versioning",
        "example": "src/api/v2/users.controller.ts",
        "description": "Version resources in URL path"
      },
      {
        "name": "response-envelope",
        "example": "src/api/v2/response.wrapper.ts",
        "description": "Consistent response structure"
      }
    ],
    "bestPractices": [
      "Use semantic versioning in API paths",
      "Implement backward compatibility"
    ],
    "codeExamples": 3
  },
  "distribution": {
    "totalAgents": 5,
    "acknowledged": [
      { "agentId": "developer", "understood": true, "willApply": true },
      { "agentId": "architect", "understood": true, "willApply": true },
      { "agentId": "tester", "understood": true, "willApply": false }
    ],
    "pending": ["reviewer", "documenter"]
  },
  "impact": {
    "estimatedAdoption": "80%",
    "affectedFiles": 12,
    "refactoringRequired": true
  },
  "metadata": {
    "sharedAt": "2024-06-20T20:00:00Z",
    "expiresAt": "2024-07-20T20:00:00Z",
    "category": "architectural-pattern"
  }
}
```