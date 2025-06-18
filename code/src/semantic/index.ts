/**
 * Semantic filesystem interface for PackFS
 * Based on LSFS research: intent-driven operations instead of traditional POSIX methods
 */

// Core semantic interface
export { SemanticFileSystemInterface, SemanticIntentValidator } from './interface';

// Concrete implementation
export { MemorySemanticBackend } from './memory-semantic-backend';

// Backward compatibility
export { SemanticCompatibilityAdapter, createSemanticFileSystem, createEnhancedFileSystem } from './compatibility-adapter';

// Intent processing utilities
export {
  TraditionalToSemanticConverter,
  SemanticIntentOptimizer,
  FileTargetProcessor,
  NaturalLanguageProcessor,
  WorkflowBuilder
} from './intent-processor';

// All types
export * from './types';