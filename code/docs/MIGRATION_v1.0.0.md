# Migration Guide: v0.1.x to v0.2.0

## Overview

PackFS v0.2.0 introduces a **breaking change** to make the library truly usable by LLMs. The nested output structure has been flattened to align with how LLMs are trained to parse responses.

## Why This Change?

Testing revealed that LLMs had a **100% failure rate** when trying to use PackFS v0.1.x because they couldn't access properties nested inside `result.data`. This defeated PackFS's core purpose of enabling LLM-filesystem interaction.

## What Changed?

### Output Structure

**Before (v0.1.x):**
```javascript
{
  success: true,
  data: {
    content: "file content",
    exists: true,
    files: [...],
    created: true
  },
  metadata: {...}
}
```

**After (v0.2.0):**
```javascript
{
  success: true,
  content: "file content",    // Direct access
  exists: true,              // Direct access
  files: [...],              // Direct access
  created: true,             // Direct access
  metadata: {...}            // Only metadata remains nested
}
```

## Migration Steps

### 1. Update Property Access

Search your codebase for `result.data` and update all references:

```javascript
// Old (v0.1.x)
if (result.success && result.data) {
  const content = result.data.content;
  const exists = result.data.exists;
  const files = result.data.files;
}

// New (v0.2.0)
if (result.success) {
  const content = result.content;
  const exists = result.exists;
  const files = result.files;
}
```

### 2. Common Patterns to Update

#### File Reading
```javascript
// Old
const fileContent = result.data.content;

// New
const fileContent = result.content;
```

#### File Existence Checks
```javascript
// Old
const fileExists = result.data.exists;

// New
const fileExists = result.exists;
```

#### Search Results
```javascript
// Old
const searchResults = result.data.files || result.data.results;

// New
const searchResults = result.files || result.results;
```

#### File Creation
```javascript
// Old
const wasCreated = result.data.created;

// New
const wasCreated = result.created;
```

### 3. Error Handling

Error handling remains the same:
```javascript
if (!result.success) {
  console.error('Operation failed:', result.error);
}
```

### 4. Metadata Access

Metadata structure hasn't changed:
```javascript
// Both versions
const executionTime = result.metadata.executionTime;
const filesAccessed = result.metadata.filesAccessed;
```

## Framework-Specific Notes

### Mastra Integration

If you're using `createMastraSemanticFilesystemTool` or `createMastraSemanticToolSuite`, the changes apply to all tool responses:

```javascript
const tool = createMastraSemanticFilesystemTool(config);

// Old
const result = await tool.execute({...});
console.log(result.data.content);

// New
const result = await tool.execute({...});
console.log(result.content);
```

### LangChain Integration

The string responses from LangChain tools remain unchanged. Only object responses are affected.

### LlamaIndex Integration

Similar changes apply to all LlamaIndex tool responses.

## Testing Your Migration

After updating your code:

1. **Run your tests** - Update test expectations to check for flat structure
2. **Test with LLMs** - Verify that your LLM agents can now access file content directly
3. **Check all operations** - Ensure read, write, search, and organize operations work correctly

## Benefits After Migration

- ✅ **100% LLM compatibility** - Works with GPT-4, Claude, Llama, and others
- ✅ **No wrapper functions needed** - Direct property access
- ✅ **Better developer experience** - Simpler, more intuitive API
- ✅ **Future-proof** - Aligns with LLM training patterns

## Need Help?

If you encounter issues during migration:

1. Check the [CHANGELOG](../CHANGELOG.md) for detailed changes
2. Review the [integration tests](../src/integrations/integrations.test.ts) for examples
3. Open an issue on [GitHub](https://github.com/jwynia/PackFS/issues)

## Example: Complete Migration

Here's a complete before/after example:

**Before (v0.1.x):**
```javascript
async function readProjectFile(path) {
  const result = await packfsTool.execute({
    operation: 'access',
    purpose: 'read',
    target: { path }
  });
  
  if (result.success && result.data) {
    return {
      content: result.data.content,
      exists: result.data.exists,
      metadata: result.data.metadata
    };
  }
  
  throw new Error(result.error || 'Failed to read file');
}
```

**After (v0.2.0):**
```javascript
async function readProjectFile(path) {
  const result = await packfsTool.execute({
    operation: 'access',
    purpose: 'read',
    target: { path }
  });
  
  if (result.success) {
    return {
      content: result.content,
      exists: result.exists,
      metadata: result.metadata
    };
  }
  
  throw new Error(result.error || 'Failed to read file');
}
```

The migration is straightforward - just remove `.data` from your property access!