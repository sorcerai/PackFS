/**
 * Semantic filesystem interface for PackFS
 * Based on LSFS research: intent-driven operations instead of traditional POSIX methods
 */

// Core semantic interface
export { SemanticFileSystemInterface, SemanticIntentValidator } from './interface.js';

// Concrete implementations
export { MemorySemanticBackend } from './memory-semantic-backend.js';
export { DiskSemanticBackend } from './disk-semantic-backend.js';

// Backward compatibility
export { SemanticCompatibilityAdapter, createSemanticFileSystem, createEnhancedFileSystem } from './compatibility-adapter.js';

// Intent processing utilities
export {
  TraditionalToSemanticConverter,
  SemanticIntentOptimizer,
  FileTargetProcessor,
  NaturalLanguageProcessor,
  WorkflowBuilder
} from './intent-processor.js';

// All types
export * from './types.js';