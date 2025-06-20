import { LZ4Strategy } from '../../src/compression/LZ4Strategy';
import { CompressionHints } from '../../src/compression/CompressionStrategy';

describe('LZ4Strategy', () => {
  let strategy: LZ4Strategy;

  beforeEach(() => {
    strategy = new LZ4Strategy();
  });

  describe('compress and decompress', () => {
    it('should compress and decompress data correctly', async () => {
      const originalData = Buffer.from('LZ4 is optimized for speed!'.repeat(50));
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.8,
        fileSize: originalData.length,
        isHot: true
      };

      const compressed = await strategy.compress(originalData, hints);
      expect(compressed.algorithm).toBe('lz4');
      expect(compressed.originalSize).toBe(originalData.length);
      expect(compressed.compressedSize).toBeLessThan(originalData.length);
      expect(compressed.metadata['compressionTime']).toBeGreaterThan(0);
      expect(compressed.metadata['variant']).toBe('high-compression');

      const decompressed = await strategy.decompress(compressed);
      expect(decompressed).toEqual(originalData);
      expect(compressed.metadata['decompressionTime']).toBeGreaterThan(0);
    });

    it('should handle data with repeating patterns efficiently', async () => {
      const patternData = Buffer.from('ABCD'.repeat(1000));
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.9,
        fileSize: patternData.length,
        isHot: true
      };

      const compressed = await strategy.compress(patternData, hints);
      const compressionRatio = compressed.compressedSize / compressed.originalSize;
      
      expect(compressionRatio).toBeLessThan(0.3); // Should achieve high compression for patterns
      
      const decompressed = await strategy.decompress(compressed);
      expect(decompressed).toEqual(patternData);
    });

    it('should be very fast for hot files', async () => {
      const data = Buffer.from('Performance critical data'.repeat(100));
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.95,
        fileSize: data.length,
        isHot: true
      };

      const startTime = performance.now();
      const compressed = await strategy.compress(data, hints);
      await strategy.decompress(compressed);
      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(50); // Should complete very quickly (ms)
    });
  });

  describe('shouldUse', () => {
    it('should return true for hot files', () => {
      const hints: CompressionHints = {
        mimeType: 'application/json',
        accessFrequency: 0.9,
        fileSize: Buffer.from('test').length,
        isHot: true
      };
      expect(strategy.shouldUse(Buffer.from('test'), hints)).toBe(true);
    });

    it('should return true for frequently accessed files', () => {
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.85,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      expect(strategy.shouldUse(Buffer.from('test'), hints)).toBe(true);
    });

    it('should return true for small to medium files', () => {
      const mediumData = Buffer.alloc(300 * 1024);
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.5,
        fileSize: mediumData.length,
        isHot: false
      };
      expect(strategy.shouldUse(mediumData, hints)).toBe(true);
    });

    it('should return false for large cold files', () => {
      const largeData = Buffer.alloc(600 * 1024);
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.2,
        fileSize: largeData.length,
        isHot: false
      };
      expect(strategy.shouldUse(largeData, hints)).toBe(false);
    });
  });

  describe('estimateRatio', () => {
    it('should estimate ratio based on data patterns', () => {
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.8,
        fileSize: Buffer.from('test').length,
        isHot: true
      };
      const ratio = strategy.estimateRatio(Buffer.from('test'), hints);
      expect(ratio).toBeGreaterThanOrEqual(0.4);
      expect(ratio).toBeLessThanOrEqual(0.7);
    });

    it('should estimate better ratio for text files', () => {
      const hints: CompressionHints = {
        mimeType: 'text/javascript',
        accessFrequency: 0.8,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      const ratio = strategy.estimateRatio(Buffer.from('test'), hints);
      expect(ratio).toBe(0.5); // 50% compression estimate
    });
  });

  describe('createDecompressor', () => {
    it('should create a readable stream for decompression', async () => {
      const originalData = Buffer.from('LZ4 streaming test'.repeat(20));
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.8,
        fileSize: originalData.length,
        isHot: true
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

  describe('block size optimization', () => {
    it('should select optimal block size based on data size', async () => {
      const testCases = [
        { size: 50 * 1024, expectedBlockSize: 64 * 1024 },
        { size: 200 * 1024, expectedBlockSize: 256 * 1024 },
        { size: 800 * 1024, expectedBlockSize: 1024 * 1024 },
        { size: 2 * 1024 * 1024, expectedBlockSize: 4 * 1024 * 1024 }
      ];

      for (const testCase of testCases) {
        const data = Buffer.alloc(testCase.size);
        const hints: CompressionHints = {
          mimeType: 'application/octet-stream',
          accessFrequency: 0.5,
          fileSize: data.length,
          isHot: false
        };

        const compressed = await strategy.compress(data, hints);
        expect(compressed.metadata['blockSize']).toBe(testCase.expectedBlockSize);
      }
    });
  });
});