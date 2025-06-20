/**
 * Base compression strategy interface for PackFS
 * Part of the proposed compression system for @yarnpkg/fslib
 */

export interface CompressionHints {
  readonly mimeType: string;
  readonly accessFrequency: number;
  readonly fileSize: number;
  readonly isHot: boolean;
  readonly ecosystem?: 'react' | 'vue' | 'angular' | 'node' | 'unknown';
}

export interface CompressedChunk {
  readonly data: Buffer;
  readonly algorithm: string;
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly dictionary?: string;
  readonly metadata: Record<string, any>;
}

export interface CompressionStats {
  readonly ratio: number;
  readonly compressionTime: number;
  readonly decompressionTime: number;
  readonly memoryUsage: number;
}

export abstract class CompressionStrategy {
  abstract readonly name: string;
  abstract readonly priority: 'speed' | 'balanced' | 'size';
  abstract readonly supportsStreaming: boolean;
  
  /**
   * Compress data with provided hints
   */
  abstract compress(data: Buffer, hints: CompressionHints): Promise<CompressedChunk>;
  
  /**
   * Decompress a compressed chunk
   */
  abstract decompress(chunk: CompressedChunk): Promise<Buffer>;
  
  /**
   * Create a streaming decompressor (if supported)
   */
  abstract createDecompressor(chunk: CompressedChunk): NodeJS.ReadableStream | null;
  
  /**
   * Estimate compression ratio without actually compressing
   */
  abstract estimateRatio(data: Buffer, hints: CompressionHints): number;
  
  /**
   * Check if this strategy is optimal for the given data
   */
  abstract shouldUse(data: Buffer, hints: CompressionHints): boolean;
}

/**
 * Registry for compression strategies
 */
export class StrategyRegistry {
  private strategies = new Map<string, CompressionStrategy>();
  
  register(strategy: CompressionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }
  
  get(name: string): CompressionStrategy | undefined {
    return this.strategies.get(name);
  }
  
  getOptimal(data: Buffer, hints: CompressionHints): CompressionStrategy {
    const candidates = Array.from(this.strategies.values())
      .filter(strategy => strategy.shouldUse(data, hints))
      .sort((a, b) => {
        // Sort by priority and estimated performance
        const aPriority = this.getPriorityScore(a.priority);
        const bPriority = this.getPriorityScore(b.priority);
        
        if (hints.isHot) {
          // For hot files, prefer speed
          return aPriority === 'speed' ? -1 : bPriority === 'speed' ? 1 : 0;
        }
        
        // For cold files, prefer compression ratio
        const aRatio = a.estimateRatio(data, hints);
        const bRatio = b.estimateRatio(data, hints);
        return bRatio - aRatio;
      });
      
    return candidates[0] || this.getDefault();
  }
  
  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'speed': return 3;
      case 'balanced': return 2;
      case 'size': return 1;
      default: return 0;
    }
  }
  
  private getDefault(): CompressionStrategy {
    return this.strategies.get('lz4') || Array.from(this.strategies.values())[0];
  }
}