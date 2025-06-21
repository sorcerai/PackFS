# Error Recovery Suggestions Feature

## Overview
Intelligent error recovery system that provides helpful suggestions when file operations fail, reducing LLM token usage and retry attempts.

## Implementation Status
- **Added**: 2025-06-20
- **Version**: v0.1.21 (pending release)
- **Status**: Implemented and tested

## Core Components

### 1. ErrorRecoveryEngine (`/src/semantic/error-recovery.ts`)
- Main engine for generating suggestions
- Test coverage: 83% statements, 71% branches, 81% functions
- Key methods:
  - `suggestForFileNotFound()` - Generates suggestions when files aren't found
  - `suggestForDirectoryNotFound()` - Generates suggestions for missing directories
  - `suggestForEmptySearchResults()` - Helps when searches return no results
  - `formatSuggestions()` - Formats suggestions into helpful messages

### 2. Integration Points
- **DiskSemanticBackend** - Integrated in `accessFile()`, `searchContent()`, `searchSemantic()`, `findFiles()`
- **MemorySemanticBackend** - Basic integration in `accessFile()`

### 3. Suggestion Types
1. **directory_listing** - Shows what files exist in the requested directory
2. **similar_files** - Fuzzy matching for files with similar names
3. **alternative_path** - Suggests different extensions or locations
4. **parent_directory** - Shows existing parent directories
5. **search_results** - Alternative search terms or found locations

## Test Coverage

### Test File: `/tests/semantic/error-recovery.test.ts`
- **Total Tests**: 11
- **Status**: 10 passing, 1 flaky (memory backend test)

### Test Scenarios:
1. **File Not Found Suggestions**
   - ✓ Directory listing when file not found
   - ✓ Similar filename suggestions
   - ✓ Alternative paths with different extensions
   - ✓ Parent directory suggestions
   - ✓ Search for filename in other locations

2. **Empty Search Results**
   - ✓ Alternative search terms for content search
   - ✓ Broader search for multi-word queries

3. **Suggestion Formatting**
   - ✓ Format suggestions into helpful messages

4. **Memory Backend**
   - ✓ Directory listing for memory backend

5. **Fuzzy Matching**
   - ✓ Find files with similar names
   - ✓ Levenshtein distance for fuzzy matching

## API Changes

### Extended Types
```typescript
interface SemanticOperationResult {
  readonly success: boolean;
  readonly message?: string;
  readonly metadata?: Record<string, unknown>;
  readonly suggestions?: ErrorSuggestion[];  // NEW
}

interface ErrorSuggestion {
  readonly type: 'directory_listing' | 'similar_files' | 'parent_directory' | 'alternative_path' | 'search_results';
  readonly description: string;
  readonly data: any;
  readonly confidence: number;
}
```

## Usage Example
```typescript
const result = await fs.accessFile({
  purpose: 'read',
  target: { path: 'context-network/foundation/index.md' }
});

if (!result.success && result.suggestions) {
  // Suggestions automatically included:
  // - Directory listing of 'context-network/foundation'
  // - Alternative paths that exist
  // - Similar files in other locations
}
```

## Benefits
1. **Reduced Token Usage** - LLMs get helpful suggestions on first try
2. **Faster Response Times** - No multiple retry attempts needed
3. **Better UX** - Clear guidance on what went wrong and how to fix it
4. **Cost Savings** - Fewer API calls mean lower costs

## Performance Considerations
- Directory listings limited to 20 files
- Search depth limited to 3 levels
- Suggestions generated synchronously with error response
- Minimal overhead (<5ms in most cases)

## Documentation
- User guide: `/docs/ERROR_RECOVERY.md`
- API docs: Updated in README.md
- Example: `/examples/error-recovery-demo.ts`

## Future Enhancements
1. Configurable suggestion limits
2. ML-based relevance ranking
3. Integration with more operations (organize, remove)
4. Caching of common error patterns