# Mastra Integration Test Plan

## Purpose
This document outlines the comprehensive test plan for the PackFS Mastra native integration layer, including unit tests, integration tests, and end-to-end testing scenarios.

## Classification
- **Domain:** Architecture
- **Stability:** Semi-stable
- **Abstraction:** Implementation
- **Confidence:** Established

## Content

### Test Coverage Goals

1. **Unit Test Coverage**: 95%+ for all new Mastra integration code
2. **Integration Test Coverage**: All major user scenarios covered
3. **Security Test Coverage**: All security validation paths tested
4. **Error Handling Coverage**: All error scenarios properly tested

### Test Structure

```
src/integrations/mastra/
├── __tests__/
│   ├── unit/
│   │   ├── security-validator.test.ts    # MastraSecurityValidator tests
│   │   ├── tool-factory.test.ts         # createPackfsTools tests
│   │   ├── intents.test.ts              # Intent validation tests
│   │   ├── schemas.test.ts              # Zod schema validation tests
│   │   └── semantic-processor.test.ts   # Semantic processing tests
│   ├── integration/
│   │   ├── file-reader.test.ts          # File reading tool integration
│   │   ├── file-searcher.test.ts        # File search tool integration
│   │   ├── file-writer.test.ts          # File writing tool integration
│   │   └── tool-suite.test.ts           # Complete tool suite tests
│   └── e2e/
│       ├── mastra-agent.test.ts         # Full agent workflow tests
│       └── security-scenarios.test.ts    # Security validation scenarios
```

### Unit Test Specifications

#### 1. MastraSecurityValidator Tests

```typescript
describe('MastraSecurityValidator', () => {
  describe('Path Validation', () => {
    it('should validate allowed paths');
    it('should reject blocked paths');
    it('should handle path traversal attempts');
    it('should validate file extensions');
    it('should normalize paths correctly');
  });

  describe('Operation Validation', () => {
    it('should validate file size limits');
    it('should check operation permissions');
    it('should validate intent structures');
  });

  describe('Rate Limiting', () => {
    it('should track request counts');
    it('should reset counts after window');
    it('should reject requests over limit');
    it('should handle multiple paths separately');
  });
});
```

#### 2. Tool Factory Tests

```typescript
describe('createPackfsTools', () => {
  describe('Tool Generation', () => {
    it('should create tools based on permissions');
    it('should not create tools without permissions');
    it('should apply custom schemas when provided');
    it('should integrate security configuration');
  });

  describe('Configuration Validation', () => {
    it('should validate rootPath requirement');
    it('should handle missing permissions gracefully');
    it('should merge default and custom configs');
  });

  describe('Tool Structure', () => {
    it('should create Mastra-compatible tool structure');
    it('should include proper input/output schemas');
    it('should have correct tool metadata');
  });
});
```

#### 3. Intent Tests

```typescript
describe('Intent Processing', () => {
  describe('AccessIntent', () => {
    it('should validate read purpose');
    it('should validate metadata purpose');
    it('should validate exists purpose');
    it('should require target path');
    it('should handle encoding preferences');
  });

  describe('DiscoverIntent', () => {
    it('should validate list purpose');
    it('should validate search purposes');
    it('should handle search criteria');
    it('should validate recursive options');
  });

  describe('UpdateIntent', () => {
    it('should validate create purpose');
    it('should validate update purpose');
    it('should require content for write ops');
    it('should handle atomic options');
  });
});
```

#### 4. Schema Tests

```typescript
describe('Zod Schemas', () => {
  describe('Input Schemas', () => {
    it('should validate access schema');
    it('should validate discover schema');
    it('should validate update schema');
    it('should provide helpful error messages');
  });

  describe('Output Schemas', () => {
    it('should validate file output schema');
    it('should validate search output schema');
    it('should handle optional fields');
  });
});
```

#### 5. Semantic Processor Tests

```typescript
describe('SemanticProcessor', () => {
  describe('Relationship Extraction', () => {
    it('should extract markdown links');
    it('should classify parent relationships');
    it('should classify child relationships');
    it('should handle frontmatter relationships');
  });

  describe('Relevance Calculation', () => {
    it('should calculate basic relevance scores');
    it('should boost exact matches');
    it('should handle multi-word queries');
    it('should normalize scores to 0-1 range');
  });
});
```

### Integration Test Specifications

#### 1. File Reader Tool Integration

```typescript
describe('File Reader Tool Integration', () => {
  it('should read files through Mastra tool interface');
  it('should handle metadata requests');
  it('should check file existence');
  it('should respect security constraints');
  it('should handle large files with chunking');
  it('should support different encodings');
});
```

#### 2. File Searcher Tool Integration

```typescript
describe('File Searcher Tool Integration', () => {
  it('should list directory contents');
  it('should search by content');
  it('should perform semantic search');
  it('should filter by criteria');
  it('should follow relationships');
  it('should limit results appropriately');
});
```

#### 3. File Writer Tool Integration

```typescript
describe('File Writer Tool Integration', () => {
  it('should create new files');
  it('should update existing files');
  it('should append to files');
  it('should handle atomic writes');
  it('should preserve relationships');
  it('should create parent directories');
});
```

#### 4. Tool Suite Integration

```typescript
describe('Tool Suite Integration', () => {
  it('should coordinate between tools');
  it('should share security context');
  it('should handle tool chaining');
  it('should maintain state consistency');
});
```

### End-to-End Test Specifications

#### 1. Mastra Agent Workflow Tests

```typescript
describe('Mastra Agent E2E', () => {
  describe('Document Management Workflow', () => {
    it('should create project documentation structure');
    it('should search and update related documents');
    it('should maintain document relationships');
    it('should handle concurrent operations');
  });

  describe('Code Analysis Workflow', () => {
    it('should discover source files');
    it('should analyze code patterns');
    it('should generate reports');
    it('should respect file filters');
  });
});
```

#### 2. Security Scenario Tests

```typescript
describe('Security E2E Scenarios', () => {
  describe('Path Traversal Prevention', () => {
    it('should block ../.. attempts');
    it('should block absolute path escapes');
    it('should handle symbolic link attacks');
  });

  describe('Resource Exhaustion Prevention', () => {
    it('should enforce file size limits');
    it('should limit search results');
    it('should prevent infinite recursion');
    it('should handle rate limiting');
  });
});
```

### Test Data and Fixtures

#### Test File Structure
```
test-fixtures/
├── documents/
│   ├── README.md
│   ├── guide.md
│   └── notes.txt
├── code/
│   ├── index.js
│   ├── utils.ts
│   └── config.json
└── relationships/
    ├── parent.md (links to children)
    ├── child1.md (links to parent)
    └── child2.md (links to parent and sibling)
```

#### Mock Mastra Context
```typescript
const mockMastraContext = {
  agent: {
    id: 'test-agent',
    name: 'Test Agent',
    capabilities: ['file-ops']
  },
  task: {
    id: 'test-task',
    type: 'file-management'
  },
  security: {
    userId: 'test-user',
    permissions: ['read', 'write']
  }
};
```

### Performance Test Specifications

```typescript
describe('Performance Tests', () => {
  it('should handle 1000+ file operations efficiently');
  it('should search 10000+ files within timeout');
  it('should chunk large files without memory issues');
  it('should cache repeated operations');
});
```

### Error Handling Test Matrix

| Scenario | Expected Behavior | Test Coverage |
|----------|------------------|---------------|
| Invalid path | Return error with reason | Unit + Integration |
| File not found | Return exists: false | Unit + Integration |
| Permission denied | Return security error | Integration + E2E |
| Rate limit exceeded | Return rate limit error | Unit + Integration |
| Invalid schema | Return validation errors | Unit |
| Network timeout | Graceful timeout handling | Integration |
| Concurrent access | Proper locking/queuing | E2E |

### Test Implementation Priority

1. **Phase 1 - Core Functionality** (High Priority)
   - MastraSecurityValidator unit tests
   - createPackfsTools unit tests
   - Basic integration tests for each tool

2. **Phase 2 - Advanced Features** (Medium Priority)
   - Semantic processor tests
   - Relationship handling tests
   - Performance tests

3. **Phase 3 - Edge Cases** (Low Priority)
   - Complex security scenarios
   - Error recovery tests
   - Stress tests

### Test Utilities

```typescript
// Test helper functions
export const createTestConfig = (overrides?: Partial<PackfsToolConfig>) => ({
  rootPath: '/test',
  permissions: ['read', 'write', 'search'],
  ...overrides
});

export const createMockFilesystem = () => {
  // Returns mock filesystem with test data
};

export const assertToolStructure = (tool: any) => {
  // Validates Mastra tool structure
};
```

### Continuous Integration

- Run unit tests on every commit
- Run integration tests on PR creation
- Run E2E tests before release
- Generate coverage reports
- Fail builds if coverage drops below 90%

## Relationships
- **Parent Nodes:** [mastra_integration_specification.md]
- **Child Nodes:** Individual test implementation files
- **Related Nodes:**
  - [decisions/adr_004_native_mastra_integration_layer.md]
  - [planning/roadmap.md]

## Navigation Guidance
- **Access Context:** Use this document when implementing tests for Mastra integration
- **Common Next Steps:** Begin implementing high-priority unit tests
- **Related Tasks:** Test implementation, coverage tracking, CI setup
- **Update Patterns:** Update when new test scenarios are identified

## Metadata
- **Created:** 2024-06-19
- **Last Updated:** 2024-06-19
- **Updated By:** Implementation team

## Change History
- 2024-06-19: Initial test plan created based on Mastra integration specification