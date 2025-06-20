/**
 * Storage module exports
 */

export {
  HybridStorageStrategy,
  StorageTierConfig,
  FileAccessStats,
  TierMetrics
} from './HybridStorageStrategy';

// Re-export supporting types
export type { 
  OptimizationReport,
  StorageMetrics,
  AccessPatternAnalysis 
} from './HybridStorageStrategy';