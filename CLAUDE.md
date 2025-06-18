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

The `/context-network/` directory contains comprehensive documentation:
- `architecture/` - Component maps and system design
- `decisions/` - Architecture Decision Records
- `foundation/` - Core project definitions
- `planning/` - Roadmaps and milestones

Review these documents when implementing new features to maintain consistency with the planned architecture.

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