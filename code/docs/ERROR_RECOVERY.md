# PackFS Error Recovery System

## Overview

PackFS includes an intelligent error recovery system that provides helpful suggestions when file operations fail. This feature significantly reduces the number of round trips required for LLMs to find the files they're looking for, thereby reducing token usage and improving response times.

## How It Works

When a file operation fails, PackFS analyzes the failure and provides contextual suggestions:

1. **Directory Listing**: Shows what files actually exist in the requested directory
2. **Similar Files**: Uses fuzzy matching to find files with similar names
3. **Alternative Paths**: Suggests files with different extensions or in different locations
4. **Parent Directories**: Shows which parent directories exist when deep paths fail
5. **Search Alternatives**: Provides alternative search terms when searches return no results

## Implementation

The error recovery system is implemented in:
- `/src/semantic/error-recovery.ts` - Core error recovery engine
- `/src/semantic/disk-semantic-backend.ts` - Integration for disk-based operations
- `/src/semantic/memory-semantic-backend.ts` - Integration for memory-based operations

## Examples

### File Not Found

```typescript
const result = await fs.accessFile({
  purpose: 'read',
  target: { path: 'docs/api/overview.md' }
});

// If the file doesn't exist, suggestions might include:
// - Directory listing of 'docs/api' showing: intro.md, reference.md, examples.md
// - Alternative paths: docs/overview.md
// - Search results: Found 'overview.md' in: README.md, docs/getting-started/overview.md
```

### Empty Search Results

```typescript
const result = await fs.discoverFiles({
  purpose: 'search_content',
  target: { semanticQuery: 'quantum computing blockchain' }
});

// If no results found, suggestions might include:
// - Alternative terms: quantum, computing, blockchain
// - Broader search: Try searching for individual terms
```

### Wrong Extension

```typescript
const result = await fs.accessFile({
  purpose: 'read',
  target: { path: 'config.yml' }  // Actually config.yaml
});

// Suggestions would include:
// - Alternative paths: config.yaml, config.json
// - Directory listing showing the actual files
```

## Benefits

1. **Reduced Token Usage**: LLMs don't need to make multiple attempts to find files
2. **Faster Response Times**: Get helpful suggestions in the first response
3. **Better User Experience**: Clear guidance on what went wrong and how to fix it
4. **Cost Savings**: Fewer API calls mean lower costs for LLM applications

## Configuration

The error recovery system is automatically enabled for all semantic operations. No configuration is required.

## Technical Details

### Fuzzy Matching

The system uses Levenshtein distance algorithm for fuzzy filename matching, allowing it to suggest files with similar names even when there are typos or slight variations.

### Performance

The error recovery system adds minimal overhead:
- Directory listings are limited to 20 files by default
- Search operations are depth-limited to prevent excessive scanning
- Suggestions are generated synchronously with the error response

### Integration

Error suggestions are included in the standard operation result:

```typescript
interface SemanticOperationResult {
  success: boolean;
  message?: string;
  suggestions?: ErrorSuggestion[];
}

interface ErrorSuggestion {
  type: 'directory_listing' | 'similar_files' | 'parent_directory' | 'alternative_path' | 'search_results';
  description: string;
  data: any;
  confidence: number;
}
```

LLM frameworks can use the `suggestions` array to make informed decisions about next steps without additional file system calls.