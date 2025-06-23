# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PackFS is a TypeScript NPM package that provides robust, secure filesystem access for LLM agent frameworks. The project aims to enable intelligent file operations for AI agents with safety-first design, semantic chunking for large files, and pre-built integrations for major LLM frameworks.

## Current Status

**Minimum Viable Package Complete**: The project now has a working NPM package with:

- Full TypeScript implementation with dual module support (ESM/CommonJS)
- Core filesystem interfaces and security components
- Basic storage backends (Memory, Disk)
- Content processing utilities (TextProcessor, SemanticChunker)
- Framework integration stubs (LangChain, AutoGPT, CrewAI)
- Comprehensive test suite with 20 passing tests
- Build system producing dist/ with both ESM and CJS outputs

The codebase follows a "context network" approach for knowledge management with extensive documentation.

## Architecture

The planned architecture consists of three layers:

- **Core Layer**: FileSystem interface, content processors, security engine
- **Integration Layer**: Framework adapters (LangChain, AutoGPT, CrewAI, Semantic Kernel)
- **Backend Layer**: Storage backends (memory, disk, cloud), virtual filesystems

## Key Architecture Decisions

From ADR-001-typescript-npm-package-setup:

- Dual module support (ESM and CommonJS)
- TypeScript-first development
- Framework-specific entry points
- Separate tsconfig files for different module formats
- Modern ES2020 target with downlevel support

## Development Commands

The package includes these npm scripts:

- `npm run build` - Build both ESM and CommonJS outputs with type definitions
- `npm test` - Run Jest test suite (20 tests currently passing)
- `npm run typecheck` - Run TypeScript type checking without building
- `npm run clean` - Clean build artifacts

**Build System**: Fully configured with:

- TypeScript configurations for both ESM and CommonJS builds
- Jest test framework with proper ESM support
- Dual module output in dist/esm/ and dist/cjs/
- Type definitions in dist/types/

## Critical: Context Network is Source of Truth

This project uses a Context Network for ALL planning, architecture, and coordination information. The context network location and structure are defined in `.context-network.md`.

### Your Primary Responsibilities

1. **ALWAYS check the context network FIRST** before starting any work
2. **NEVER duplicate information** between CLAUDE.md and the context network
3. **UPDATE the context network** as you work - don't wait until task completion
4. **RECORD your understanding** in the context network, not just in conversation

## Workflow Requirements

### Before Starting ANY Task

```
1. Read `.context-network.md` to locate the context network
2. Navigate to relevant sections based on your task
3. Create a new task entry in the context network's active tasks section
4. Document your understanding of:
   - What you're trying to accomplish
   - Which existing components/systems are involved
   - Your planned approach
```

### During Work

**Every 3-5 significant changes or discoveries:**

1. STOP and update the context network with:
   - What you've learned
   - What you've changed
   - Any new connections or dependencies discovered
   - Questions or uncertainties that arose

**When you find yourself re-reading the same files:**

- This is a signal you haven't recorded your understanding
- Create a summary in the context network immediately

**When discovering important information:**

1. Create a discovery record with:
   - What you found
   - Exact file path and line numbers
   - Why it's significant
   - How it connects to your current task
2. Link this discovery to relevant concept nodes

### After Completing Work

1. Update all modified nodes in the context network
2. Create/update the task completion record
3. Document any follow-up items or discovered issues

## Context Network Update Triggers

You MUST update the context network when:

- Starting a new task or subtask
- Making architectural decisions
- Discovering new relationships between components
- Finding bugs or issues
- Learning how a system works
- Planning implementation approach
- Every 10-15 minutes of active work
- **Finding important information in source files** (create a discovery record)

## What Goes Where

### Context Network (Team Memory)

- Architecture diagrams and decisions
- Implementation plans and strategies
- Task records and progress
- System understanding and documentation
- Research findings and explorations
- Bug investigations and solutions
- Design discussions and rationale

### Project Files (Build Artifacts)

- Source code
- Configuration files
- Tests
- Build scripts
- Public documentation
- Resources used by the application

## Prohibited Practices

NEVER:

- Create planning documents outside the context network
- Wait until task completion to update the context network
- Rely solely on reading source code without documenting understanding
- Make architectural decisions without recording them
- Duplicate information between CLAUDE.md and context network

## Context Network Structure Reference

The context network structure is defined within the network itself. Always refer to the network's own navigation guide rather than maintaining a duplicate here.

## Quick Checklist

Before claiming a task is complete, verify:

- [ ] Context network task entry exists and is updated
- [ ] All architectural decisions are documented
- [ ] Implementation approach is recorded
- [ ] Discovered relationships are mapped
- [ ] Follow-up items are noted
- [ ] No planning documents exist outside the context network

## Information Organization Principles

### Create Small, Focused Documents

**NEVER create large, monolithic documents.** Instead:

- One concept = one file (atomic notes)
- 100-300 lines maximum per document
- Link extensively between related documents
- Use index/hub documents to provide navigation

### Discovery Index Pattern

Maintain these specialized index types in the context network:

1. **Location Indexes** (`discoveries/locations/[component].md`):

   ```markdown
   # [Component] Key Locations

   ## Configuration Loading

   - **What**: How config files are parsed and validated
   - **Where**: `src/config/parser.ts:45-72`
   - **Related**: [[config-schema]], [[validation-rules]]

   ## State Management

   - **What**: Central state store implementation
   - **Where**: `src/store/index.ts:12-38`
   - **Related**: [[state-shape]], [[action-patterns]]
   ```

2. **Concept Maps** (`concepts/[concept].md`):

   ```markdown
   # [Concept Name]

   ## Definition

   [Brief explanation]

   ## Implementations

   - [[location-index#section]] - Where this is implemented
   - [[example-usage]] - How it's used in practice

   ## Related Concepts

   - [[parent-concept]] - Broader context
   - [[sibling-concept]] - Alternative approach
   - [[child-concept]] - Specific implementation
   ```

3. **Task Discovery Logs** (`tasks/[date]-[task]/discoveries.md`):

   ```markdown
   # Discoveries for [Task Name]

   ## Key Findings

   1. **Config validation happens in two places**
      - Primary: `src/config/parser.ts:45`
      - Secondary: `src/runtime/validate.ts:23`
      - This seems unintentional - [[tech-debt-001]]
   ```

### Linking Patterns

Use consistent link types:

- `[[concept]]` - Link to concept definition
- `[[location-index#section]]` - Link to specific location
- `[[task/discoveries]]` - Link to task-specific findings
- `→ file.ts:line` - Direct code reference (non-linked)

### Navigation Hubs

Create navigation hubs at multiple levels:

- Domain hubs: Overview of a functional area
- Component hubs: Entry point for understanding a component
- Task hubs: Central point for all task-related information

### Search Optimization

Name files and sections for discoverability:

- Use consistent naming patterns
- Include keywords in headers
- Create "alias" sections for alternative terms
- Maintain a glossary of project-specific terms

## Discovery Recording Rules

### When You Find Information

#### The 3-Line Rule

If you read more than 3 lines of code to understand something, you MUST record:

1. What question you were trying to answer
2. Where you found the answer (file:lines)
3. What the answer means in plain language

#### Create Discovery Records For:

- **Entry points**: Where key processes begin
- **State changes**: Where important data is modified
- **Decisions**: Where the code chooses between alternatives
- **Connections**: Where components interact
- **Surprises**: Where reality differs from expectations

### Discovery Record Format

```markdown
### [What You Were Looking For]

**Found**: `path/to/file.ts:45-67`
**Summary**: [One sentence explaining what this code does]
**Significance**: [Why this matters for understanding the system]
**See also**: [[related-concept]], [[another-discovery]]
```

### Anti-Patterns to Avoid

❌ **DON'T**: Keep mental notes of "I saw this somewhere"
✅ **DO**: Create a discovery record immediately

❌ **DON'T**: Create long documents explaining entire files
✅ **DO**: Create focused records of specific findings with links

❌ **DON'T**: Assume you'll remember why something was important
✅ **DO**: Record the context of why you were looking for it

❌ **DON'T**: Create duplicate explanations of the same code
✅ **DO**: Link to existing discovery records and enhance them

### Discovery Index Maintenance

Every 5-10 discoveries:

1. Check if they share a theme
2. Create or update a concept document that links them
3. Add entries to the appropriate location index
4. Update navigation hubs to include new findings

## Security Considerations

PackFS is designed with security as a primary concern:

- Path validation and sandboxing required
- Virtual filesystem support for isolation
- Permission system for file operations
- Never expose direct filesystem access without validation

## Testing Strategy

When implementing tests:

- Test both ESM and CommonJS outputs
- Focus on security edge cases
- Test framework adapter integrations
- Verify content processing for large files

## Code Organization

Future code should be organized under `/workspace/code/`:

- `src/core/` - Core filesystem interfaces and implementations
- `src/integrations/` - Framework-specific adapters
- `src/backends/` - Storage backend implementations
- `src/processors/` - Content processing utilities
- `tests/` - Test files mirroring src structure
