# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.12] - 2025-06-19

### Fixed

- **Critical**: Fixed Mastra integration initialization issues causing "Cannot read properties of undefined (reading 'accessFile')" errors
- Fixed parameter validation in Mastra tools to properly handle different parameter formats
- Added backward compatibility for both direct parameters and wrapped context objects
- Improved error messages with troubleshooting information for common issues
- Made filesystem property optional in BaseIntegrationConfig with automatic initialization

### Added

- Comprehensive documentation for Mastra integration in README.md
- Example code demonstrating proper usage patterns for all Mastra tools
- Added direct exports for backends, core, semantic, and processors modules
- Enhanced error handling with detailed troubleshooting suggestions
- Support for multiple parameter formats to improve developer experience

### Changed

- Updated TypeScript interfaces to better support optional configuration
- Improved filesystem initialization with better error handling
- Enhanced parameter validation with more helpful error messages

## [0.1.11] - 2025-01-19

### Fixed

- **Critical**: ESM module resolution issues causing ERR_MODULE_NOT_FOUND errors at runtime
- Added `.js` extensions to all relative imports in TypeScript source files for proper ESM compatibility
- Fixed package.json export paths now correctly resolve in Node.js ESM environments
- Mastra integration now works correctly with standard import patterns

### Changed

- Updated Jest configuration with moduleNameMapper to handle .js extensions in test environment
- Improved build system compatibility for both ESM and CommonJS outputs
- Enhanced module resolution for all framework integrations

### Verified

- All 167 tests pass with updated module resolution
- Package.json exports (`packfs-core/mastra`) now work correctly at runtime
- Mastra tools return proper interface with standard `{ success, data, error, metadata }` format
- Both single tool and tool suite patterns verified working

## [0.1.10] - 2025-01-19

### Added

- Native Mastra integration with createPackfsTools factory function
- MastraSecurityValidator with path restrictions, rate limiting, and extension filtering
- Comprehensive Zod schemas for AccessIntent, DiscoverIntent, and UpdateIntent operations
- Intent-based API reducing Mastra integration boilerplate from 160+ lines to under 20
- Tool factory pattern generating ready-to-use Mastra tools with security validation
- Complete test suite with 167 passing tests including Mastra integration tests

### Changed

- Added @mastra/core dependency for native Mastra framework integration
- Enhanced security configuration to support optional extension restrictions
- Improved TypeScript types for better Mastra API compatibility

### Fixed

- Security validator extension filtering logic for undefined allowedExtensions
- Mastra tool execution context compatibility with RuntimeContext requirements
- Type alignment between intent results and Mastra output schemas

## [0.1.9] - 2025-01-19

### Added

- Architecture Decision Record (ADR-004) for native Mastra integration layer
- Comprehensive implementation specification for Mastra tools factory
- Test suite preparation for upcoming Mastra native integration
- Detailed test plan with unit and integration test specifications

### Changed

- Architecture component map updated to include planned Mastra Adapter
- Roadmap updated with Mastra-specific milestones and features
- Jest configuration updated to support pending test structure

### Documentation

- Created comprehensive planning documents for Mastra native integration
- Prepared test coverage for future implementation
- Updated project roadmap with native framework integration priorities

## [0.1.8] - 2025-01-18

### Changed

- Enhanced semantic operation handling and error reporting across all framework integrations
- Improved error messages for better debugging experience
- Standardized error handling patterns across integrations

### Fixed

- Error reporting consistency in framework adapters

## [0.1.7] - 2025-01-18

### Added

- Initial release of PackFS semantic filesystem library to NPM
- Semantic filesystem operations with natural language understanding
- Intent-based operations: `accessFile`, `updateContent`, `discoverFiles`, `organizeFiles`, `removeFiles`
- Natural language query interpretation for file operations
- Memory-based semantic backend with full operation support
- Disk-based semantic backend with persistent indexing
- Keyword extraction and semantic file indexing
- Framework integrations for TypeScript/Node.js:
  - Mastra (TypeScript-first AI framework)
  - LangChain.js (DynamicTool interface)
  - LlamaIndex.TS (FunctionTool interface)
  - KaibanJS (Multi-agent system support)
- Backward compatibility with traditional filesystem operations
- Comprehensive test suite with 52+ tests
- Security controls with path validation and sandboxing
- Dual module support (ESM and CommonJS)
- TypeScript definitions included

### Security

- Path validation and normalization to prevent traversal attacks
- Configurable sandbox restrictions
- File size limits and extension controls
- Permission-based access control

[Unreleased]: https://github.com/jwynia/PackFS/compare/v0.1.12...HEAD
[0.1.12]: https://github.com/jwynia/PackFS/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/jwynia/PackFS/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/jwynia/PackFS/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/jwynia/PackFS/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/jwynia/PackFS/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/jwynia/PackFS/releases/tag/v0.1.7
