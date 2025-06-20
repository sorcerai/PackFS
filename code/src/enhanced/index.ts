/**
 * Enhanced PackFS module exports
 */

// Complex enhanced version (temporarily disabled due to FakeFS compatibility issues)
// export {
//   EnhancedPackFS,
//   PackFSExtensionConfig,
//   createEnhancedFileSystem,
//   ProductionPresets,
//   PackFSMigrationUtils
// } from './EnhancedPackFS';

// Simple enhanced version with logging
export {
  SimpleEnhancedPackFS,
  SimpleEnhancedConfig,
  createSimpleEnhancedFileSystem
} from './SimpleEnhancedPackFS.js';