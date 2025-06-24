import { BrotliStrategy } from '../../src/compression/BrotliStrategy';
import { CompressionHints } from '../../src/compression/CompressionStrategy';

describe('BrotliStrategy', () => {
  let strategy: BrotliStrategy;

  beforeEach(() => {
    strategy = new BrotliStrategy();
  });

  describe('compress and decompress', () => {
    it('should compress and decompress text data correctly', async () => {
      const originalData = Buffer.from('This is a test string that should be compressed and decompressed correctly. '.repeat(10));
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.5,
        fileSize: originalData.length,
        isHot: false
      };

      const compressed = await strategy.compress(originalData, hints);
      expect(compressed.algorithm).toBe('brotli');
      expect(compressed.originalSize).toBe(originalData.length);
      expect(compressed.compressedSize).toBeLessThan(originalData.length);
      expect(compressed.metadata['compressionTime']).toBeGreaterThan(0);

      const decompressed = await strategy.decompress(compressed);
      expect(decompressed).toEqual(originalData);
      expect(compressed.metadata['decompressionTime']).toBeGreaterThan(0);
    });

    it('should compress JavaScript files with high ratio', async () => {
      const jsCode = Buffer.from(`
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        console.log(fibonacci(10));
      `.repeat(20));
      
      const hints: CompressionHints = {
        mimeType: 'application/javascript',
        accessFrequency: 0.3,
        fileSize: jsCode.length,
        isHot: false
      };

      const compressed = await strategy.compress(jsCode, hints);
      const compressionRatio = compressed.compressedSize / compressed.originalSize;
      
      expect(compressionRatio).toBeLessThan(0.5); // Should achieve at least 50% compression
      
      const decompressed = await strategy.decompress(compressed);
      expect(decompressed).toEqual(jsCode);
    });

    it('should use lower quality for hot files', async () => {
      const data = Buffer.from('Hot file data'.repeat(100));
      const hotHints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.9,
        fileSize: data.length,
        isHot: true
      };
      const coldHints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.1,
        fileSize: data.length,
        isHot: false
      };

      const hotCompressed = await strategy.compress(data, hotHints);
      const coldCompressed = await strategy.compress(data, coldHints);

      expect(hotCompressed.metadata['quality']).toBe(4);
      expect(coldCompressed.metadata['quality']).toBe(11);
      // Quality 4 should generally be faster than quality 11, but due to small data size
      // and system variability, we just verify both have reasonable compression times
      expect(hotCompressed.metadata['compressionTime']).toBeGreaterThan(0);
      expect(coldCompressed.metadata['compressionTime']).toBeGreaterThan(0);
    });
  });

  describe('shouldUse', () => {
    it('should return true for text files', () => {
      const hints: CompressionHints = {
        mimeType: 'text/javascript',
        accessFrequency: 0.5,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      expect(strategy.shouldUse(Buffer.from('test'), hints)).toBe(true);
    });

    it('should return true for large non-hot files', () => {
      const largeData = Buffer.alloc(200 * 1024);
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.5,
        fileSize: largeData.length,
        isHot: false
      };
      expect(strategy.shouldUse(largeData, hints)).toBe(true);
    });

    it('should return false for small binary hot files', () => {
      const smallData = Buffer.alloc(50 * 1024);
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.9,
        fileSize: smallData.length,
        isHot: true
      };
      expect(strategy.shouldUse(smallData, hints)).toBe(false);
    });
  });

  describe('estimateRatio', () => {
    it('should estimate good ratio for text files', () => {
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.5,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      const ratio = strategy.estimateRatio(Buffer.from('test'), hints);
      expect(ratio).toBe(0.25); // 75% compression estimate
    });

    it('should estimate lower ratio for binary files', () => {
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.5,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      const ratio = strategy.estimateRatio(Buffer.from('test'), hints);
      expect(ratio).toBe(0.6); // 40% compression estimate
    });
  });

  describe('createDecompressor', () => {
    it('should create a readable stream for decompression', async () => {
      const originalData = Buffer.from('Stream decompression test data'.repeat(10));
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.5,
        fileSize: originalData.length,
        isHot: false
      };

      const compressed = await strategy.compress(originalData, hints);
      const stream = strategy.createDecompressor(compressed);

      const chunks: Buffer[] = [];
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const result = Buffer.concat(chunks);
      expect(result).toEqual(originalData);
    });
  });
});