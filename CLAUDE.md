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

## Important Context

The `/context-network/` directory contains comprehensive documentation and **serves as the single source of truth for the entire project**:
- `architecture/` - Component maps, system design, and implementation details
- `decisions/` - Architecture Decision Records (ADRs)
- `foundation/` - Core project definitions and principles
- `planning/` - Roadmaps and milestones
- `processes/` - Development workflows and procedures
- `meta/` - Documentation maintenance guides

**Critical**: The context network must ALWAYS be kept in sync with the code. Before making any changes:
1. Check relevant documents in the context network
2. Update documentation BEFORE implementing changes
3. Ensure all changes are reflected back in the context network
4. Follow the maintenance guide at `/context-network/meta/context_network_maintenance.md`

This is not optional documentation—it is the project's living knowledge base and authoritative source.

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