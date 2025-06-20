/**
 * Compression Engine for PackFS - Orchestrates multiple compression strategies
 * 
 * This engine manages the selection and application of appropriate compression
 * algorithms based on file type, access patterns, and system resources.
 */

import { CompressionStrategy, CompressionHints, CompressedChunk, StrategyRegistry } from './CompressionStrategy';
import { BrotliStrategy } from './BrotliStrategy';
import { LZ4Strategy } from './LZ4Strategy';
import { ZstdStrategy } from './ZstdStrategy';

export interface CompressionProfile {
  name: string;
  development: boolean;
  maxMemoryUsage: number;
  prioritizeSpeed: boolean;
  enableDictionary: boolean;
  strategies: Record<string, CompressionStrategy>;
}

export interface CompressionResult {
  success: boolean;
  algorithm: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  chunk?: CompressedChunk;
  error?: string;
}

/**
 * Main compression engine that orchestrates multiple strategies
 */
export class CompressionEngine {
  private registry: StrategyRegistry;
  private profile: CompressionProfile;
  private compressionStats = new Map<string, CompressionStats>();
  
  constructor(profile: CompressionProfile) {
    this.profile = profile;
    this.registry = new StrategyRegistry();
    
    // Initialize default strategies
    this.initializeStrategies();
  }
  
  /**
   * Compress data using the optimal strategy
   */
  async compress(
    data: Buffer, 
    mimeType: string, 
    metadata?: { path?: string; accessFrequency?: number }
  ): Promise<CompressionResult> {
    const startTime = performance.now();
    
    try {
      // Build compression hints
      const hints: CompressionHints = {
        mimeType,
        accessFrequency: metadata?.accessFrequency || 0.5,
        fileSize: data.length,
        isHot: this.isHotFile(metadata?.path, metadata?.accessFrequency),
        ecosystem: this.detectEcosystem(mimeType, metadata?.path)
      };
      
      // Select optimal strategy
      const strategy = this.registry.getOptimal(data, hints);
      
      // Apply compression
      const chunk = await strategy.compress(data, hints);
      
      const compressionTime = performance.now() - startTime;
      const compressionRatio = chunk.compressedSize / chunk.originalSize;
      
      // Update statistics
      this.updateStats(strategy.name, {
        compressionRatio,
        compressionTime,
        originalSize: chunk.originalSize,
        compressedSize: chunk.compressedSize
      });
      
      return {
        success: true,
        algorithm: strategy.name,
        originalSize: chunk.originalSize,
        compressedSize: chunk.compressedSize,
        compressionRatio,
        compressionTime,
        chunk
      };
      
    } catch (error) {
      return {
        success: false,
        algorithm: 'none',
        originalSize: data.length,
        compressedSize: data.length,
        compressionRatio: 1,
        compressionTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown compression error'
      };
    }
  }
  
  /**
   * Decompress a compressed chunk
   */
  async decompress(chunk: CompressedChunk): Promise<Buffer> {
    const strategy = this.registry.get(chunk.algorithm);
    
    if (!strategy) {
      throw new Error(`Unknown compression algorithm: ${chunk.algorithm}`);
    }
    
    return strategy.decompress(chunk);
  }
  
  /**
   * Create a streaming decompressor
   */
  createDecompressor(chunk: CompressedChunk): NodeJS.ReadableStream | null {
    const strategy = this.registry.get(chunk.algorithm);
    
    if (!strategy || !strategy.supportsStreaming) {
      return null;
    }
    
    return strategy.createDecompressor(chunk);
  }
  
  /**
   * Analyze which compression strategy would be best for given data
   */
  analyzeOptimalStrategy(data: Buffer, mimeType: string, metadata?: any): CompressionAnalysis {
    const hints: CompressionHints = {
      mimeType,
      accessFrequency: metadata?.accessFrequency || 0.5,
      fileSize: data.length,
      isHot: this.isHotFile(metadata?.path, metadata?.accessFrequency),
      ecosystem: this.detectEcosystem(mimeType, metadata?.path)
    };
    
    const strategies = Array.from(this.registry['strategies'].values());
    const analysis: CompressionAnalysis = {
      recommendedStrategy: '',
      estimations: []
    };
    
    for (const strategy of strategies) {
      if (strategy.shouldUse(data, hints)) {
        const estimation = {
          algorithm: strategy.name,
          estimatedRatio: strategy.estimateRatio(data, hints),
          priority: strategy.priority,
          suitable: true
        };
        
        analysis.estimations.push(estimation);
      }
    }
    
    // Sort by estimated compression ratio
    analysis.estimations.sort((a, b) => a.estimatedRatio - b.estimatedRatio);
    analysis.recommendedStrategy = analysis.estimations[0]?.algorithm || 'none';
    
    return analysis;
  }
  
  /**
   * Get compression statistics
   */
  getStatistics(): CompressionEngineStats {
    const stats: CompressionEngineStats = {
      totalCompressions: 0,
      totalDecompressions: 0,
      totalBytesProcessed: 0,
      totalBytesSaved: 0,
      averageCompressionRatio: 0,
      averageCompressionTime: 0,
      strategyUsage: {}
    };
    
    for (const [algorithm, algorithmStats] of this.compressionStats) {
      stats.totalCompressions += algorithmStats.compressionCount;
      stats.totalBytesProcessed += algorithmStats.totalOriginalSize;
      stats.totalBytesSaved += algorithmStats.totalOriginalSize - algorithmStats.totalCompressedSize;
      stats.strategyUsage[algorithm] = algorithmStats.compressionCount;
    }
    
    if (stats.totalBytesProcessed > 0) {
      stats.averageCompressionRatio = 1 - (stats.totalBytesSaved / stats.totalBytesProcessed);
    }
    
    return stats;
  }
  
  /**
   * Initialize compression strategies based on profile
   */
  private initializeStrategies(): void {
    // Always register LZ4 for speed
    this.registry.register(new LZ4Strategy());
    
    // Register Brotli for text compression
    if (!this.profile.prioritizeSpeed || this.profile.maxMemoryUsage > 256 * 1024 * 1024) {
      const brotliDictionary = this.profile.enableDictionary ? this.loadDictionary('javascript') : undefined;
      this.registry.register(new BrotliStrategy(brotliDictionary));
    }
    
    // Register Zstd for balanced compression
    if (!this.profile.development) {
      this.registry.register(new ZstdStrategy(this.profile.prioritizeSpeed ? 1 : 3));
    }
    
    // Add custom strategies from profile
    for (const [, strategy] of Object.entries(this.profile.strategies)) {
      this.registry.register(strategy);
    }
  }
  
  /**
   * Detect if a file is "hot" (frequently accessed)
   */
  private isHotFile(path?: string, accessFrequency?: number): boolean {
    if (accessFrequency !== undefined && accessFrequency > 0.8) {
      return true;
    }
    
    // Common hot file patterns
    if (path) {
      const hotPatterns = [
        /node_modules\/.*\/(index|main)\.(js|ts)$/,
        /package\.json$/,
        /tsconfig\.json$/,
        /\.env$/,
        /src\/.*\.(js|ts|jsx|tsx)$/
      ];
      
      return hotPatterns.some(pattern => pattern.test(path));
    }
    
    return false;
  }
  
  /**
   * Detect the ecosystem based on file type and path
   */
  private detectEcosystem(_mimeType: string, path?: string): 'react' | 'vue' | 'angular' | 'node' | 'unknown' {
    if (path) {
      if (path.includes('react') || path.endsWith('.jsx') || path.endsWith('.tsx')) {
        return 'react';
      }
      if (path.includes('vue') || path.endsWith('.vue')) {
        return 'vue';
      }
      if (path.includes('angular') || path.includes('.component.')) {
        return 'angular';
      }
      if (path.includes('node_modules') || path.includes('server')) {
        return 'node';
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Load compression dictionary for specific ecosystem
   */
  private loadDictionary(ecosystem: string): Buffer | undefined {
    // In production, this would load actual dictionary files
    // For now, return a mock dictionary
    const dictionaries: Record<string, string> = {
      javascript: 'const function export import async await class extends',
      react: 'useState useEffect useContext props children component render',
      vue: 'template script style computed methods mounted created watch',
      angular: 'component service module injectable pipe directive template'
    };
    
    const dict = dictionaries[ecosystem];
    return dict ? Buffer.from(dict) : undefined;
  }
  
  /**
   * Update compression statistics
   */
  private updateStats(algorithm: string, result: {
    compressionRatio: number;
    compressionTime: number;
    originalSize: number;
    compressedSize: number;
  }): void {
    const stats = this.compressionStats.get(algorithm) || {
      compressionCount: 0,
      decompressionCount: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalCompressionTime: 0,
      totalDecompressionTime: 0
    };
    
    stats.compressionCount++;
    stats.totalOriginalSize += result.originalSize;
    stats.totalCompressedSize += result.compressedSize;
    stats.totalCompressionTime += result.compressionTime;
    
    this.compressionStats.set(algorithm, stats);
  }
}

// Supporting interfaces

interface CompressionStats {
  compressionCount: number;
  decompressionCount: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalCompressionTime: number;
  totalDecompressionTime: number;
}

interface CompressionAnalysis {
  recommendedStrategy: string;
  estimations: Array<{
    algorithm: string;
    estimatedRatio: number;
    priority: string;
    suitable: boolean;
  }>;
}

interface CompressionEngineStats {
  totalCompressions: number;
  totalDecompressions: number;
  totalBytesProcessed: number;
  totalBytesSaved: number;
  averageCompressionRatio: number;
  averageCompressionTime: number;
  strategyUsage: Record<string, number>;
}

/**
 * Pre-configured compression profiles
 */
export const CompressionProfiles = {
  /**
   * Development profile - prioritize speed
   */
  development: {
    name: 'development',
    development: true,
    maxMemoryUsage: 256 * 1024 * 1024,
    prioritizeSpeed: true,
    enableDictionary: false,
    strategies: {}
  } as CompressionProfile,
  
  /**
   * Production profile - balanced performance
   */
  production: {
    name: 'production',
    development: false,
    maxMemoryUsage: 512 * 1024 * 1024,
    prioritizeSpeed: false,
    enableDictionary: true,
    strategies: {}
  } as CompressionProfile,
  
  /**
   * CI profile - minimize resource usage
   */
  ci: {
    name: 'ci',
    development: false,
    maxMemoryUsage: 128 * 1024 * 1024,
    prioritizeSpeed: false,
    enableDictionary: false,
    strategies: {}
  } as CompressionProfile
};