import { CompressionStrategy, CompressionHints, CompressedChunk } from './CompressionStrategy';
const lz4 = require('lz4');

/**
 * LZ4 compression strategy - prioritizes speed over compression ratio
 * Perfect for hot paths and development environments
 */
export class LZ4Strategy extends CompressionStrategy {
  readonly name = 'lz4';
  readonly priority = 'speed' as const;
  readonly supportsStreaming = true;
  
  async compress(data: Buffer, _hints: CompressionHints): Promise<CompressedChunk> {
    const startTime = performance.now();
    
    // Use real LZ4 compression
    const compressed = Buffer.from(lz4.encode(data));
    
    const compressionTime = performance.now() - startTime;
    
    return {
      data: compressed,
      algorithm: this.name,
      originalSize: data.length,
      compressedSize: compressed.length,
      metadata: {
        compressionTime,
        variant: 'high-compression',
        blockSize: this.getOptimalBlockSize(data.length)
      }
    };
  }
  
  async decompress(chunk: CompressedChunk): Promise<Buffer> {
    const startTime = performance.now();
    
    // Use real LZ4 decompression
    const result = Buffer.from(lz4.decode(chunk.data));
    
    const decompressionTime = performance.now() - startTime;
    (chunk.metadata as any).decompressionTime = decompressionTime;
    
    return result;
  }
  
  createDecompressor(chunk: CompressedChunk): NodeJS.ReadableStream {
    const { Readable } = require('stream');
    
    return new Readable({
      read() {
        // LZ4 can decompress in chunks very efficiently
        try {
          const decompressed = Buffer.from(lz4.decode(chunk.data));
          this.push(decompressed);
          this.push(null);
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }
  
  estimateRatio(data: Buffer, hints: CompressionHints): number {
    // LZ4 focuses on speed, not maximum compression
    if (this.hasRepeatingPatterns(data)) {
      return 0.4; // 60% compression for data with patterns
    }
    
    if (this.isTextFile(hints.mimeType)) {
      return 0.5; // 50% compression for text files
    }
    
    return 0.7; // 30% compression for binary data
  }
  
  shouldUse(data: Buffer, hints: CompressionHints): boolean {
    // Perfect for hot files where decompression speed is critical
    if (hints.isHot) {
      return true;
    }
    
    // Great for frequently accessed files
    if (hints.accessFrequency > 0.8) {
      return true;
    }
    
    // Ideal for development environments
    if (process.env['NODE_ENV'] === 'development') {
      return true;
    }
    
    // Good for small to medium files where decompression speed matters
    if (data.length < 500 * 1024) {
      return true;
    }
    
    return false;
  }
  
  private getOptimalBlockSize(dataSize: number): number {
    // LZ4 block sizes: 64KB, 256KB, 1MB, 4MB
    if (dataSize < 64 * 1024) return 64 * 1024;
    if (dataSize < 256 * 1024) return 256 * 1024;
    if (dataSize < 1024 * 1024) return 1024 * 1024;
    return 4 * 1024 * 1024;
  }
  
  private hasRepeatingPatterns(data: Buffer): boolean {
    // Simple heuristic to detect repeating patterns
    const sampleSize = Math.min(1024, data.length);
    const sample = data.subarray(0, sampleSize);
    
    let repeats = 0;
    for (let i = 0; i < sampleSize - 4; i += 4) {
      const chunk = sample.subarray(i, i + 4);
      for (let j = i + 4; j < sampleSize - 4; j += 4) {
        if (chunk.equals(sample.subarray(j, j + 4))) {
          repeats++;
          break;
        }
      }
    }
    
    return repeats > sampleSize / 20; // More than 5% repeating patterns
  }
  
  private isTextFile(mimeType: string): boolean {
    return mimeType.startsWith('text/') ||
           mimeType.includes('javascript') ||
           mimeType.includes('json') ||
           mimeType.includes('css') ||
           mimeType.includes('html');
  }
  
}