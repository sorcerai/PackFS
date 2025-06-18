# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of PackFS semantic filesystem library
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

### Security
- Path validation and normalization to prevent traversal attacks
- Configurable sandbox restrictions
- File size limits and extension controls
- Permission-based access control

## [0.1.0] - TBD
- Initial public release

[Unreleased]: https://github.com/jwynia/PackFS/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jwynia/PackFS/releases/tag/v0.1.0