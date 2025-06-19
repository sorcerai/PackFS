# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/jwynia/PackFS/compare/v0.1.9...HEAD
[0.1.9]: https://github.com/jwynia/PackFS/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/jwynia/PackFS/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/jwynia/PackFS/releases/tag/v0.1.7