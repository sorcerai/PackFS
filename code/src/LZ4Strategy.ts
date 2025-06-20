import { CompressionStrategy, CompressionHints, CompressedChunk } from './CompressionStrategy';

/**
 * LZ4 compression strategy - prioritizes speed over compression ratio
 * Perfect for hot paths and development environments
 */
export class LZ4Strategy extends CompressionStrategy {
  readonly name = 'lz4';
  readonly priority = 'speed' as const;
  readonly supportsStreaming = true;
  
  async compress(data: Buffer, hints: CompressionHints): Promise<CompressedChunk> {
    const startTime = performance.now();
    
    // In real implementation, this would use lz4 bindings (e.g., lz4-napi)
    const compressed = this.simulateLZ4Compression(data);
    
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
    
    // LZ4 decompression is extremely fast
    const result = this.simulateLZ4Decompression(chunk.data);
    
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
          const decompressed = this.simulateLZ4Decompression(chunk.data);
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
    if (process.env.NODE_ENV === 'development') {
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
  
  // Mock LZ4 compression - replace with actual lz4 bindings in production
  private simulateLZ4Compression(data: Buffer): Buffer {
    // LZ4 typically achieves 50-70% compression ratio very quickly
    const compressionRatio = 0.6; // 40% reduction
    const compressedSize = Math.floor(data.length * compressionRatio);
    
    const compressed = Buffer.alloc(compressedSize + 12);
    
    // LZ4 header simulation
    compressed.writeUInt32LE(0x184D2204, 0); // LZ4 magic number
    compressed.writeUInt32LE(data.length, 4); // Original size
    compressed.writeUInt32LE(compressedSize, 8); // Compressed size
    
    // Mock compressed data (simplified)
    data.copy(compressed, 12, 0, Math.min(data.length, compressedSize));
    
    return compressed;
  }
  
  private simulateLZ4Decompression(data: Buffer): Buffer {
    // Verify LZ4 magic number
    const magic = data.readUInt32LE(0);
    if (magic !== 0x184D2204) {
      throw new Error('Invalid LZ4 data: magic number mismatch');
    }
    
    const originalSize = data.readUInt32LE(4);
    const compressedSize = data.readUInt32LE(8);
    
    const result = Buffer.alloc(originalSize);
    const compressedData = data.subarray(12);
    
    // Mock decompression - copy and expand
    compressedData.copy(result, 0);
    
    // Fill remaining bytes (in real LZ4, this would be proper decompression)
    for (let i = compressedData.length; i < originalSize; i++) {
      result[i] = compressedData[i % compressedData.length];
    }
    
    return result;
  }
}