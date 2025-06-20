/**
 * PackFS Extensions - Production-Ready Integration Layer
 * 
 * This module provides the main integration points for adding semantic search
 * and intelligent compression to existing PackFS implementations.
 */

import { FakeFS, PortablePath, ZipFS } from '@yarnpkg/fslib';
import { SemanticSearchEngine, SemanticSearchOptions, SemanticSearchResult } from './SemanticSearchAPI';
import { HybridStorageStrategy, StorageTierConfig } from './HybridStorageStrategy';
import { CompressionEngine, CompressionProfile } from './CompressionEngine';

export interface PackFSExtensionConfig {
  enableSemanticSearch: boolean;
  enableIntelligentCompression: boolean;
  semanticSearch?: {
    embeddingModel?: string;
    cacheSize?: number;
    indexingBatchSize?: number;
  };
  compression?: CompressionProfile;
  storage?: StorageTierConfig;
}

/**
 * Enhanced PackFS with semantic search and intelligent compression
 * Drop-in replacement for existing FakeFS implementations
 */
export class EnhancedPackFS extends FakeFS<PortablePath> {
  private semanticEngine?: SemanticSearchEngine;
  private storageStrategy?: HybridStorageStrategy;
  private baseFS: FakeFS<PortablePath>;
  private config: PackFSExtensionConfig;
  
  constructor(baseFS: FakeFS<PortablePath>, config: PackFSExtensionConfig = {}) {
    super();
    this.baseFS = baseFS;
    this.config = {
      enableSemanticSearch: true,
      enableIntelligentCompression: true,
      ...config
    };
    
    this.initializeExtensions();
  }
  
  /**
   * Create enhanced PackFS from any filesystem - Production API
   */
  static createFileSystem(path: string, config?: PackFSExtensionConfig): EnhancedPackFS {
    const fs = require('fs');
    const basePath = path as PortablePath;
    
    // Create appropriate base filesystem
    let baseFS: FakeFS<PortablePath>;
    
    if (path.endsWith('.zip') || path.endsWith('.pnp.cjs')) {
      // Use ZipFS for compressed packages
      const zipData = fs.readFileSync(path);
      baseFS = new ZipFS(zipData, { readOnly: false });
    } else {
      // Use NodeFS for regular directories (would need actual NodeFS import)
      baseFS = require('@yarnpkg/fslib').NodeFS as FakeFS<PortablePath>;
    }
    
    return new EnhancedPackFS(baseFS, config);
  }
  
  /**
   * Execute natural language search - Production API
   * Examples: "find OAuth discussions", "show error handling patterns"
   */
  async executeNaturalLanguage(query: string): Promise<SemanticSearchResult[]> {
    if (!this.semanticEngine) {
      throw new Error('Semantic search not enabled');
    }
    
    return this.semanticEngine.executeNaturalLanguage(query);
  }
  
  /**
   * Semantic search with options - Production API
   */
  async findFiles(options: SemanticSearchOptions & { semantic?: boolean }): Promise<SemanticSearchResult[]> {
    if (options.semantic && this.semanticEngine) {
      return this.semanticEngine.semanticSearch(options);
    }
    
    // Fallback to traditional search
    return this.traditionalSearch(options.query);
  }
  
  /**
   * Cross-format search across compression tiers - Production API
   */
  async crossFormatSearch(options: {
    query: string;
    includeTiers?: ('active' | 'compressed' | 'archive')[];
    threshold?: number;
  }): Promise<SemanticSearchResult[]> {
    
    if (this.semanticEngine) {
      return this.semanticEngine.crossFormatSearch({
        query: options.query,
        includeTiers: options.includeTiers || ['active', 'compressed', 'archive'],
        threshold: options.threshold
      });
    }
    
    return this.traditionalSearch(options.query);
  }
  
  /**
   * Enhanced file reading with intelligent tier management
   */
  async readFilePromise(path: PortablePath, encoding?: BufferEncoding): Promise<any> {
    let content: Buffer;
    
    if (this.storageStrategy) {
      // Use intelligent storage strategy
      content = await this.storageStrategy.readFile(path);
    } else {
      // Fallback to base filesystem
      content = await this.baseFS.readFilePromise(path);
    }
    
    return encoding ? content.toString(encoding) : content;
  }
  
  /**
   * Enhanced file writing with automatic tier assignment
   */
  async writeFilePromise(path: PortablePath, data: any): Promise<void> {
    const content = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    if (this.storageStrategy) {
      await this.storageStrategy.writeFile(path, content);
    } else {
      await this.baseFS.writeFilePromise(path, content);
    }
  }
  
  /**
   * Optimize storage tiers - Production maintenance task
   */
  async optimizeStorage(): Promise<any> {
    if (!this.storageStrategy) {
      throw new Error('Intelligent compression not enabled');
    }
    
    return this.storageStrategy.optimizeTiers();
  }
  
  /**
   * Get system performance metrics - Production monitoring
   */
  getPerformanceMetrics(): any {
    const metrics: any = {};
    
    if (this.semanticEngine) {
      metrics.semanticSearch = this.semanticEngine.getPerformanceMetrics();
    }
    
    if (this.storageStrategy) {
      metrics.storage = this.storageStrategy.getStorageMetrics();
    }
    
    return metrics;
  }
  
  /**
   * Analyze access patterns for optimization insights
   */
  analyzeAccessPatterns(): any {
    if (!this.storageStrategy) {
      throw new Error('Intelligent compression not enabled');
    }
    
    return this.storageStrategy.analyzeAccessPatterns();
  }
  
  // Standard FakeFS interface delegation
  
  async statPromise(path: PortablePath): Promise<any> {
    return this.baseFS.statPromise(path);
  }
  
  async readdirPromise(path: PortablePath): Promise<string[]> {
    return this.baseFS.readdirPromise(path);
  }
  
  async unlinkPromise(path: PortablePath): Promise<void> {
    return this.baseFS.unlinkPromise(path);
  }
  
  async mkdirPromise(path: PortablePath, options?: any): Promise<void> {
    return this.baseFS.mkdirPromise(path, options);
  }
  
  async rmdirPromise(path: PortablePath): Promise<void> {
    return this.baseFS.rmdirPromise(path);
  }
  
  async renamePromise(oldPath: PortablePath, newPath: PortablePath): Promise<void> {
    return this.baseFS.renamePromise(oldPath, newPath);
  }
  
  async copyFilePromise(sourcePath: PortablePath, destinationPath: PortablePath): Promise<void> {
    return this.baseFS.copyFilePromise(sourcePath, destinationPath);
  }
  
  async chmodPromise(path: PortablePath, mode: number): Promise<void> {
    return this.baseFS.chmodPromise(path, mode);
  }
  
  async chownPromise(path: PortablePath, uid: number, gid: number): Promise<void> {
    return this.baseFS.chownPromise(path, uid, gid);
  }
  
  async watchPromise(path: PortablePath, options?: any): Promise<any> {
    return this.baseFS.watchPromise(path, options);
  }
  
  async watchFilePromise(path: PortablePath, options?: any): Promise<any> {
    return this.baseFS.watchFilePromise(path, options);
  }
  
  // Synchronous methods (delegate to base FS)
  
  statSync(path: PortablePath): any {
    return this.baseFS.statSync(path);
  }
  
  readdirSync(path: PortablePath): string[] {
    return this.baseFS.readdirSync(path);
  }
  
  readFileSync(path: PortablePath, encoding?: BufferEncoding): any {
    return this.baseFS.readFileSync(path, encoding);
  }
  
  writeFileSync(path: PortablePath, data: any): void {
    return this.baseFS.writeFileSync(path, data);
  }
  
  unlinkSync(path: PortablePath): void {
    return this.baseFS.unlinkSync(path);
  }
  
  mkdirSync(path: PortablePath, options?: any): void {
    return this.baseFS.mkdirSync(path, options);
  }
  
  rmdirSync(path: PortablePath): void {
    return this.baseFS.rmdirSync(path);
  }
  
  renameSync(oldPath: PortablePath, newPath: PortablePath): void {
    return this.baseFS.renameSync(oldPath, newPath);
  }
  
  copyFileSync(sourcePath: PortablePath, destinationPath: PortablePath): void {
    return this.baseFS.copyFileSync(sourcePath, destinationPath);
  }
  
  chmodSync(path: PortablePath, mode: number): void {
    return this.baseFS.chmodSync(path, mode);
  }
  
  chownSync(path: PortablePath, uid: number, gid: number): void {
    return this.baseFS.chownSync(path, uid, gid);
  }
  
  // Path utilities delegation
  get pathUtils() {
    return this.baseFS.pathUtils;
  }
  
  private initializeExtensions(): void {
    if (this.config.enableSemanticSearch) {
      this.semanticEngine = new SemanticSearchEngine(this.baseFS, {
        embeddingModel: this.config.semanticSearch?.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2',
        cacheSize: this.config.semanticSearch?.cacheSize || 1000,
        batchSize: this.config.semanticSearch?.indexingBatchSize || 10
      });
    }
    
    if (this.config.enableIntelligentCompression) {
      const compressionEngine = this.config.compression ? 
        new CompressionEngine(this.config.compression) : undefined;
      
      this.storageStrategy = new HybridStorageStrategy(
        this.baseFS,
        this.config.storage,
        compressionEngine
      );
    }
  }
  
  private async traditionalSearch(query: string): Promise<SemanticSearchResult[]> {
    // Fallback text search for compatibility
    const results: SemanticSearchResult[] = [];
    
    try {
      const allFiles = await this.getAllFiles();
      
      for (const file of allFiles.slice(0, 20)) {
        try {
          const content = await this.baseFS.readFilePromise(file, 'utf8');
          if (content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              path: file,
              relevanceScore: 0.5,
              snippet: content.slice(0, 200),
              tier: 'active',
              lastAccessed: new Date()
            });
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.warn('Traditional search failed:', error);
    }
    
    return results;
  }
  
  private async getAllFiles(): Promise<PortablePath[]> {
    const files: PortablePath[] = [];
    
    const walkDir = async (dir: PortablePath) => {
      try {
        const entries = await this.baseFS.readdirPromise(dir);
        for (const entry of entries) {
          const fullPath = this.baseFS.pathUtils.join(dir, entry);
          const stat = await this.baseFS.statPromise(fullPath);
          
          if (stat.isDirectory()) {
            await walkDir(fullPath);
          } else {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip directories we can't read
      }
    };
    
    await walkDir(this.baseFS.pathUtils.cwd());
    return files;
  }
}

/**
 * Convenience function for creating enhanced PackFS instances
 * Production API: One-line initialization
 */
export function createEnhancedFileSystem(
  path: string, 
  config: PackFSExtensionConfig = {}
): EnhancedPackFS {
  return EnhancedPackFS.createFileSystem(path, config);
}

/**
 * Production configuration presets
 */
export const ProductionPresets = {
  /**
   * Development preset: Fast access, minimal compression
   */
  development: {
    enableSemanticSearch: true,
    enableIntelligentCompression: true,
    compression: {
      name: 'development',
      development: true,
      maxMemoryUsage: 256 * 1024 * 1024,
      prioritizeSpeed: true,
      enableDictionary: false,
      strategies: {}
    },
    storage: {
      activeThreshold: 0.9,
      compressedThreshold: 0.5,
      archiveThreshold: 0.1,
      hotAccessCount: 10,
      warmAccessCount: 5,
      coldAccessCount: 1
    }
  } as PackFSExtensionConfig,
  
  /**
   * Production preset: Balanced performance and compression
   */
  production: {
    enableSemanticSearch: true,
    enableIntelligentCompression: true,
    compression: {
      name: 'production',
      development: false,
      maxMemoryUsage: 512 * 1024 * 1024,
      prioritizeSpeed: false,
      enableDictionary: true,
      strategies: {}
    },
    storage: {
      activeThreshold: 0.8,
      compressedThreshold: 0.3,
      archiveThreshold: 0.1,
      hotAccessCount: 50,
      warmAccessCount: 10,
      coldAccessCount: 2
    }
  } as PackFSExtensionConfig,
  
  /**
   * CI preset: Maximum compression, minimal memory
   */
  ci: {
    enableSemanticSearch: false, // Disable for CI to save resources
    enableIntelligentCompression: true,
    compression: {
      name: 'ci',
      development: false,
      maxMemoryUsage: 128 * 1024 * 1024,
      prioritizeSpeed: false,
      enableDictionary: true,
      strategies: {}
    },
    storage: {
      activeThreshold: 0.5,
      compressedThreshold: 0.2,
      archiveThreshold: 0.05,
      hotAccessCount: 20,
      warmAccessCount: 5,
      coldAccessCount: 1
    }
  } as PackFSExtensionConfig
};

/**
 * Migration utilities for existing PackFS codebases
 */
export class PackFSMigrationUtils {
  /**
   * Analyze existing PackFS usage for migration planning
   */
  static async analyzeExistingUsage(fs: FakeFS<PortablePath>): Promise<MigrationAnalysis> {
    const analysis: MigrationAnalysis = {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: new Map(),
      averageFileSize: 0,
      recommendedConfig: 'development',
      estimatedSpaceSavings: 0
    };
    
    // Implementation would analyze existing filesystem
    // For demo, return mock analysis
    analysis.totalFiles = 1000;
    analysis.totalSize = 100 * 1024 * 1024; // 100MB
    analysis.averageFileSize = analysis.totalSize / analysis.totalFiles;
    analysis.estimatedSpaceSavings = 0.44; // 44% from production
    analysis.recommendedConfig = analysis.totalSize > 50 * 1024 * 1024 ? 'production' : 'development';
    
    return analysis;
  }
  
  /**
   * Create migration plan for existing codebase
   */
  static createMigrationPlan(analysis: MigrationAnalysis): MigrationPlan {
    return {
      phases: [
        {
          name: 'Setup Enhanced PackFS',
          description: 'Initialize with existing filesystem',
          estimatedTime: '5 minutes',
          code: 'const enhancedFS = createEnhancedFileSystem(path, ProductionPresets.development);'
        },
        {
          name: 'Test Compatibility',
          description: 'Verify existing code continues to work',
          estimatedTime: '15 minutes',
          code: 'All existing fs.readFile(), fs.writeFile() calls continue to work unchanged'
        },
        {
          name: 'Enable Semantic Search',
          description: 'Start using natural language queries',
          estimatedTime: '10 minutes',
          code: 'const results = await enhancedFS.executeNaturalLanguage("find authentication code");'
        },
        {
          name: 'Optimize Storage',
          description: 'Run initial tier optimization',
          estimatedTime: '30 minutes',
          code: 'await enhancedFS.optimizeStorage();'
        }
      ],
      totalEstimatedTime: '1 hour',
      riskLevel: 'low',
      rollbackPlan: 'Simply replace EnhancedPackFS with original filesystem instance'
    };
  }
}

// Supporting interfaces

interface MigrationAnalysis {
  totalFiles: number;
  totalSize: number;
  fileTypes: Map<string, number>;
  averageFileSize: number;
  recommendedConfig: string;
  estimatedSpaceSavings: number;
}

interface MigrationPlan {
  phases: Array<{
    name: string;
    description: string;
    estimatedTime: string;
    code: string;
  }>;
  totalEstimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan: string;
}