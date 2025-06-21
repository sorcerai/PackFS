# Maintenance Scripts Guide

## Overview

PackFS includes several maintenance scripts that automatically generate and update reference documentation in the context network. These scripts help maintain accurate, up-to-date documentation without manual effort.

## Available Scripts

### 1. Update Context Network (`npm run update-context`)
**Purpose**: Updates core reference documentation

**Generates**:
- `/reference/filetree/current.md` - Complete source and test file structure
- `/reference/tests/all-tests.md` - All test files with extracted test cases
- `/reference/api/exports.md` - Exported functions, types, and interfaces
- `/reference/dependencies/current.md` - Current dependencies and versions

**When to run**:
- After adding new files or directories
- After adding new tests
- After changing exports in index.ts
- After updating dependencies

### 2. Extract External Docs (`npm run extract-docs`)
**Purpose**: Extracts documentation from external dependencies

**Generates**:
- `/reference/external/type-definitions.md` - TypeScript types from dependencies
- `/reference/external/mastra-api.md` - Comprehensive Mastra API reference
- `/reference/external/scripts.md` - NPM scripts reference with descriptions

**When to run**:
- After updating @mastra/core or other framework dependencies
- When you need to reference external API documentation
- To avoid repeatedly searching through node_modules

### 3. Feature Status (`npm run feature-status`)
**Purpose**: Analyzes feature implementation completeness

**Generates**:
- `/reference/status/features.md` - Feature implementation status report

**Tracks**:
- Implementation file existence
- Test coverage existence
- Export status from index.ts
- Overall feature completeness

**When to run**:
- During sprint planning
- Before releases
- To identify features needing attention

### 4. Maintenance (All) (`npm run maintenance`)
**Purpose**: Runs all maintenance scripts in sequence

**When to run**:
- Daily during active development
- Before major commits
- Before releases
- When onboarding new team members

## Usage Examples

### Daily Development
```bash
# Start of day - ensure everything is current
npm run maintenance

# After adding new feature
npm run update-context
npm run feature-status

# After updating dependencies
npm run extract-docs
```

### Before Commits
```bash
# Update all documentation
npm run maintenance

# Check what changed
git status ../context-network/reference/
```

### Investigation Tasks
```bash
# "What tests do we have for semantic operations?"
cat ../context-network/reference/tests/all-tests.md | grep -A20 "Semantic Tests"

# "What's the Mastra API for file reading?"
cat ../context-network/reference/external/mastra-api.md | grep -A20 "fileReader"

# "What features are incomplete?"
cat ../context-network/reference/status/features.md | grep "In Progress"
```

## Benefits

1. **Reduced Discovery Time**: No more grep/find commands to answer basic questions
2. **Accurate Documentation**: Auto-generated from actual code, always current
3. **Better Planning**: Feature status helps identify what needs work
4. **External API Reference**: No more guessing at Mastra or LangChain APIs
5. **Onboarding**: New contributors can quickly understand the codebase

## Extending the Scripts

To add new maintenance scripts:

1. Create script in `/scripts/` directory
2. Add to package.json scripts section
3. Include in maintenance command if appropriate
4. Document in this guide

### Example: Adding a Performance Benchmark Script
```javascript
// scripts/benchmark-report.js
async function generateBenchmarkReport() {
  // Run benchmarks
  // Generate markdown report
  // Save to context-network/reference/performance/
}
```

## Script Implementation Details

### File Tree Generator
- Recursively scans directories
- Excludes common build/cache directories
- Formats with tree-style connectors
- Sorts directories before files

### Test Extractor
- Parses test files for describe() and it() blocks
- Groups by category (semantic, integration, etc.)
- Counts total suites and cases
- Includes test running instructions

### API Extractor
- Parses export statements from index.ts
- Categorizes exports by type
- Includes usage examples
- Links to source modules

### Feature Status Analyzer
- Checks file existence for implementation
- Verifies test file presence
- Confirms exports from index
- Calculates completion percentage
- Generates actionable next steps

## Best Practices

1. **Run maintenance before asking questions** - The answer might already be generated
2. **Commit reference updates** - Include context network updates in feature commits
3. **Check diffs** - Review what changed in reference docs to spot issues
4. **Add to CI** - Consider running maintenance scripts in CI to ensure docs stay current
5. **Extend as needed** - Add new scripts for repeated documentation needs