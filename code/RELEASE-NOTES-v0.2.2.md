# Release Notes - v0.2.2 (Upcoming)

<!-- Note: This is a planning document for the upcoming v0.2.2 release. 
     The version in package.json will be automatically updated by npm run release -->

## Improvements to Multi-Project Support

Based on valuable feedback from v0.2.1 early adopters, we've enhanced the multi-project capabilities of PackFS:

### 🎯 Enhanced Agent Integration

**Problem**: AI agents weren't aware of the `workingDirectory` parameter, causing them to use the default path instead of project-specific directories.

**Solution**: 
- Updated Mastra tool description with prominent examples and clear instructions
- Added IMPORTANT notices to parameter descriptions
- Provided example usage patterns directly in the tool description

### 📚 Comprehensive Documentation

Added extensive documentation for multi-project usage:
- `/docs/multi-project-usage.md` - Complete guide with examples
- `/docs/v0.2.1-improvements.md` - Summary of improvements
- `/examples/factory-pattern.ts` - Alternative patterns for non-singleton usage

### 🔧 Key Improvements

1. **Clearer Tool Description**: The `workingDirectory` parameter is now prominently documented with examples
2. **Agent-Friendly**: Instructions and examples help AI agents understand how to use the parameter
3. **Best Practices**: Documentation includes patterns for concurrent operations, multi-tenant systems, and resource management
4. **Migration Guide**: Clear path for upgrading from v0.1.x singleton pattern

### 💡 Usage Example

```javascript
// Agent instruction template
const agentPrompt = `
You have access to a semantic filesystem tool. 
ALWAYS include the workingDirectory parameter set to: ${projectPath}

Example:
{
  "operation": "access",
  "purpose": "read",
  "target": { "path": "README.md" },
  "workingDirectory": "${projectPath}"
}
`;
```

### 🚀 No Breaking Changes

All improvements maintain backward compatibility. Existing code continues to work while new features enable better multi-project support.

## Thanks

Special thanks to the Transmission Zero team for their detailed feedback on the multi-project requirements and agent integration challenges. Your real-world usage has been invaluable in improving PackFS.