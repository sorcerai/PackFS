import { CompressionStrategy, CompressionHints, CompressedChunk } from './CompressionStrategy';

/**
 * Mock Zstd strategy implementation - would use actual zstd bindings in production
 * Zstd provides excellent balance between compression ratio and speed
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
    
    // In real implementation, this would use actual zstd compression
    // For demo purposes, we'll simulate the compression
    const level = this.getCompressionLevel(hints);
    const mockCompressed = this.simulateZstdCompression(data, level);
    
    const compressionTime = performance.now() - startTime;
    
    return {
      data: mockCompressed,
      algorithm: this.name,
      originalSize: data.length,
      compressedSize: mockCompressed.length,
      metadata: {
        compressionTime,
        level,
        dictionary: hints.ecosystem ? `${hints.ecosystem}-dict` : undefined
      }
    };
  }
  
  async decompress(chunk: CompressedChunk): Promise<Buffer> {
    const startTime = performance.now();
    
    // In real implementation, this would use actual zstd decompression
    const result = this.simulateZstdDecompression(chunk.data);
    
    const decompressionTime = performance.now() - startTime;
    (chunk.metadata as any).decompressionTime = decompressionTime;
    
    return result;
  }
  
  createDecompressor(chunk: CompressedChunk): NodeJS.ReadableStream {
    // In real implementation, return zstd streaming decompressor
    const { Readable } = require('stream');
    return new Readable({
      read() {
        // Mock streaming decompression
        this.push(chunk.data);
        this.push(null);
      }
    });
  }
  
  estimateRatio(data: Buffer, hints: CompressionHints): number {
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
  
  // Mock compression simulation - replace with actual zstd in production
  private simulateZstdCompression(data: Buffer, level: number): Buffer {
    // Simulate compression by creating a smaller buffer with compression metadata
    const compressionRatio = Math.max(0.1, 0.8 - (level * 0.05));
    const compressedSize = Math.floor(data.length * compressionRatio);
    
    const compressed = Buffer.alloc(compressedSize + 8);
    compressed.writeUInt32LE(data.length, 0); // Original size
    compressed.writeUInt32LE(level, 4); // Compression level
    
    // Fill with mock compressed data (first bytes of original)
    data.copy(compressed, 8, 0, Math.min(data.length, compressedSize));
    
    return compressed;
  }
  
  private simulateZstdDecompression(data: Buffer): Buffer {
    // Extract original size from mock compressed data
    const originalSize = data.readUInt32LE(0);
    const result = Buffer.alloc(originalSize);
    
    // Mock decompression - copy available data and fill rest
    const availableData = data.subarray(8);
    availableData.copy(result, 0);
    
    // Fill remaining bytes with pattern (in real implementation, this would be actual decompressed data)
    for (let i = availableData.length; i < originalSize; i++) {
      result[i] = availableData[i % availableData.length];
    }
    
    return result;
  }
}