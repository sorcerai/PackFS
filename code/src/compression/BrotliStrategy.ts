import * as zlib from 'zlib';
import { promisify } from 'util';
import { CompressionStrategy, CompressionHints, CompressedChunk } from './CompressionStrategy';

const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

/**
 * Brotli compression strategy - excellent for text-based files like JavaScript
 */
export class BrotliStrategy extends CompressionStrategy {
  readonly name = 'brotli';
  readonly priority = 'size' as const;
  readonly supportsStreaming = true;
  
  private dictionary?: Buffer;
  
  constructor(dictionary?: Buffer) {
    super();
    this.dictionary = dictionary;
  }
  
  async compress(data: Buffer, hints: CompressionHints): Promise<CompressedChunk> {
    const startTime = performance.now();
    
    const options: zlib.BrotliOptions = {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: this.getQualityLevel(hints),
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
      }
    };
    
    // Use dictionary for JavaScript files
    if (this.dictionary && this.isJavaScript(hints.mimeType)) {
      options.params![zlib.constants.BROTLI_PARAM_LARGE_WINDOW] = 1;
    }
    
    const compressed = await brotliCompress(data, options);
    const compressionTime = performance.now() - startTime;
    
    return {
      data: compressed,
      algorithm: this.name,
      originalSize: data.length,
      compressedSize: compressed.length,
      dictionary: this.dictionary ? 'js-patterns' : undefined,
      metadata: {
        compressionTime,
        quality: options.params![zlib.constants.BROTLI_PARAM_QUALITY],
        mimeType: hints.mimeType
      }
    };
  }
  
  async decompress(chunk: CompressedChunk): Promise<Buffer> {
    const startTime = performance.now();
    const result = await brotliDecompress(chunk.data);
    const decompressionTime = performance.now() - startTime;
    
    // Update metadata with decompression time
    (chunk.metadata as any).decompressionTime = decompressionTime;
    
    return result;
  }
  
  createDecompressor(_chunk: CompressedChunk): NodeJS.ReadableStream {
    const decompressor = zlib.createBrotliDecompress();
    return decompressor;
  }
  
  estimateRatio(_data: Buffer, hints: CompressionHints): number {
    // Brotli performs exceptionally well on text data
    if (this.isTextFile(hints.mimeType)) {
      return this.dictionary ? 0.15 : 0.25; // 85% or 75% compression
    }
    
    // Less effective on binary data
    return 0.6; // 40% compression
  }
  
  shouldUse(data: Buffer, hints: CompressionHints): boolean {
    // Perfect for JavaScript, CSS, HTML, JSON
    if (this.isTextFile(hints.mimeType)) {
      return true;
    }
    
    // Good for large files where compression ratio matters more than speed
    if (data.length > 100 * 1024 && !hints.isHot) {
      return true;
    }
    
    return false;
  }
  
  private getQualityLevel(hints: CompressionHints): number {
    if (hints.isHot) {
      return 4; // Fast compression for frequently accessed files
    }
    
    if (hints.accessFrequency > 0.8) {
      return 6; // Balanced for moderately accessed files
    }
    
    return 11; // Maximum compression for rarely accessed files
  }
  
  private isJavaScript(mimeType: string): boolean {
    return mimeType.includes('javascript') || 
           mimeType.includes('typescript') ||
           mimeType.endsWith('.js') ||
           mimeType.endsWith('.ts') ||
           mimeType.endsWith('.jsx') ||
           mimeType.endsWith('.tsx');
  }
  
  private isTextFile(mimeType: string): boolean {
    return mimeType.startsWith('text/') ||
           mimeType.includes('javascript') ||
           mimeType.includes('json') ||
           mimeType.includes('css') ||
           mimeType.includes('html') ||
           mimeType.includes('xml');
  }
}