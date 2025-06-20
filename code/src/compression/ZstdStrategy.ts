import { CompressionStrategy, CompressionHints, CompressedChunk } from './CompressionStrategy';
import { compress as zstdCompress, decompress as zstdDecompress } from '@mongodb-js/zstd';

/**
 * Zstd compression strategy - provides excellent balance between compression ratio and speed
 */
export class ZstdStrategy extends CompressionStrategy {
  readonly name = 'zstd';
  readonly priority = 'balanced' as const;
  readonly supportsStreaming = true;
  
  private compressionLevel: number;
  
  constructor(compressionLevel: number = 3) {
    super();
    this.compressionLevel = compressionLevel;
  }
  
  async compress(data: Buffer, hints: CompressionHints): Promise<CompressedChunk> {
    const startTime = performance.now();
    
    // Use real Zstd compression
    const level = this.getCompressionLevel(hints);
    const compressed = await zstdCompress(data, level);
    
    const compressionTime = performance.now() - startTime;
    
    return {
      data: compressed,
      algorithm: this.name,
      originalSize: data.length,
      compressedSize: compressed.length,
      metadata: {
        compressionTime,
        level,
        dictionary: hints.ecosystem ? `${hints.ecosystem}-dict` : undefined
      }
    };
  }
  
  async decompress(chunk: CompressedChunk): Promise<Buffer> {
    const startTime = performance.now();
    
    // Use real Zstd decompression
    const result = await zstdDecompress(chunk.data);
    
    const decompressionTime = performance.now() - startTime;
    (chunk.metadata as any).decompressionTime = decompressionTime;
    
    return result;
  }
  
  createDecompressor(chunk: CompressedChunk): NodeJS.ReadableStream {
    const { Readable } = require('stream');
    return new Readable({
      async read() {
        try {
          // Use real Zstd decompression
          const decompressed = await zstdDecompress(chunk.data);
          this.push(decompressed);
          this.push(null);
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }
  
  estimateRatio(_data: Buffer, hints: CompressionHints): number {
    if (this.isStructuredData(hints.mimeType)) {
      return 0.2; // 80% compression for JSON, config files
    }
    
    if (this.isCodeFile(hints.mimeType)) {
      return 0.3; // 70% compression for source code
    }
    
    return 0.5; // 50% compression for other data
  }
  
  shouldUse(data: Buffer, hints: CompressionHints): boolean {
    // Excellent for structured data (JSON, YAML, etc.)
    if (this.isStructuredData(hints.mimeType)) {
      return true;
    }
    
    // Good balance for most use cases
    if (hints.accessFrequency > 0.3 && hints.accessFrequency < 0.8) {
      return true;
    }
    
    // Great for medium-sized files
    if (data.length > 10 * 1024 && data.length < 1024 * 1024) {
      return true;
    }
    
    return false;
  }
  
  private getCompressionLevel(hints: CompressionHints): number {
    if (hints.isHot) {
      return 1; // Fastest compression
    }
    
    if (hints.accessFrequency > 0.5) {
      return 3; // Balanced
    }
    
    return Math.min(19, this.compressionLevel + 5); // Higher compression for cold data
  }
  
  private isStructuredData(mimeType: string): boolean {
    return mimeType.includes('json') ||
           mimeType.includes('yaml') ||
           mimeType.includes('toml') ||
           mimeType.includes('xml') ||
           mimeType.endsWith('.config');
  }
  
  private isCodeFile(mimeType: string): boolean {
    return mimeType.includes('javascript') ||
           mimeType.includes('typescript') ||
           mimeType.includes('python') ||
           mimeType.includes('rust') ||
           mimeType.includes('go');
  }
  
}