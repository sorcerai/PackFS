import { ZstdStrategy } from '../../src/compression/ZstdStrategy';
import { CompressionHints } from '../../src/compression/CompressionStrategy';

describe('ZstdStrategy', () => {
  let strategy: ZstdStrategy;

  beforeEach(() => {
    strategy = new ZstdStrategy();
  });

  describe('compress and decompress', () => {
    it('should compress and decompress data correctly', async () => {
      const originalData = Buffer.from('Zstandard provides excellent balance'.repeat(30));
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.5,
        fileSize: originalData.length,
        isHot: false
      };

      const compressed = await strategy.compress(originalData, hints);
      expect(compressed.algorithm).toBe('zstd');
      expect(compressed.originalSize).toBe(originalData.length);
      expect(compressed.compressedSize).toBeLessThan(originalData.length);
      expect(compressed.metadata['compressionTime']).toBeGreaterThan(0);
      expect(compressed.metadata['level']).toBe(3); // Default balanced level

      const decompressed = await strategy.decompress(compressed);
      expect(decompressed).toEqual(originalData);
      expect(compressed.metadata['decompressionTime']).toBeGreaterThan(0);
    });

    it('should compress structured data very efficiently', async () => {
      const jsonData = Buffer.from(JSON.stringify({
        users: Array(50).fill({
          id: '12345',
          name: 'Test User',
          email: 'test@example.com',
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: true
          }
        })
      }));
      
      const hints: CompressionHints = {
        mimeType: 'application/json',
        accessFrequency: 0.4,
        fileSize: jsonData.length,
        isHot: false
      };

      const compressed = await strategy.compress(jsonData, hints);
      const compressionRatio = compressed.compressedSize / compressed.originalSize;
      
      expect(compressionRatio).toBeLessThan(0.2); // Should achieve excellent compression for repetitive JSON
      
      const decompressed = await strategy.decompress(compressed);
      expect(decompressed).toEqual(jsonData);
    });

    it('should adjust compression level based on access patterns', async () => {
      // Use more repetitive data to ensure compression level differences are visible
      const data = Buffer.from('AAAA'.repeat(500) + 'BBBB'.repeat(500) + 'CCCC'.repeat(500));
      
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

      expect(hotCompressed.metadata['level']).toBe(1); // Fast compression for hot files
      expect(coldCompressed.metadata['level']).toBeGreaterThan(3); // Higher compression for cold files
      
      // With highly repetitive data, higher compression levels should achieve better ratio
      expect(coldCompressed.compressedSize).toBeLessThanOrEqual(hotCompressed.compressedSize);
    });

    it('should use ecosystem-specific dictionaries', async () => {
      const data = Buffer.from('Node.js specific code patterns');
      const hints: CompressionHints = {
        mimeType: 'application/javascript',
        accessFrequency: 0.5,
        fileSize: data.length,
        isHot: false,
        ecosystem: 'node'
      };

      const compressed = await strategy.compress(data, hints);
      expect(compressed.metadata['dictionary']).toBe('node-dict');
    });
  });

  describe('shouldUse', () => {
    it('should return true for structured data', () => {
      const hints: CompressionHints = {
        mimeType: 'application/json',
        accessFrequency: 0.5,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      expect(strategy.shouldUse(Buffer.from('test'), hints)).toBe(true);
    });

    it('should return true for medium access frequency files', () => {
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.6,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      expect(strategy.shouldUse(Buffer.from('test'), hints)).toBe(true);
    });

    it('should return true for medium-sized files', () => {
      const mediumData = Buffer.alloc(500 * 1024);
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.5,
        fileSize: mediumData.length,
        isHot: false
      };
      expect(strategy.shouldUse(mediumData, hints)).toBe(true);
    });

    it('should return false for very hot or very cold files', () => {
      const hints1: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.95,
        fileSize: Buffer.from('test').length,
        isHot: true
      };
      const hints2: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.1,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      expect(strategy.shouldUse(Buffer.from('test'), hints1)).toBe(false);
      expect(strategy.shouldUse(Buffer.from('test'), hints2)).toBe(false);
    });
  });

  describe('estimateRatio', () => {
    it('should estimate excellent ratio for structured data', () => {
      const hints: CompressionHints = {
        mimeType: 'application/json',
        accessFrequency: 0.5,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      const ratio = strategy.estimateRatio(Buffer.from('test'), hints);
      expect(ratio).toBe(0.2); // 80% compression estimate
    });

    it('should estimate good ratio for code files', () => {
      const hints: CompressionHints = {
        mimeType: 'text/javascript',
        accessFrequency: 0.5,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      const ratio = strategy.estimateRatio(Buffer.from('test'), hints);
      expect(ratio).toBe(0.3); // 70% compression estimate
    });

    it('should estimate moderate ratio for other files', () => {
      const hints: CompressionHints = {
        mimeType: 'application/octet-stream',
        accessFrequency: 0.5,
        fileSize: Buffer.from('test').length,
        isHot: false
      };
      const ratio = strategy.estimateRatio(Buffer.from('test'), hints);
      expect(ratio).toBe(0.5); // 50% compression estimate
    });
  });

  describe('createDecompressor', () => {
    it('should create a readable stream for decompression', async () => {
      const originalData = Buffer.from('Zstd streaming decompression test'.repeat(15));
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

  describe('custom compression level', () => {
    it('should use custom compression level when provided', async () => {
      const customStrategy = new ZstdStrategy(10);
      const data = Buffer.from('Custom compression level test'.repeat(20));
      const hints: CompressionHints = {
        mimeType: 'text/plain',
        accessFrequency: 0.2,
        fileSize: data.length,
        isHot: false
      };

      const compressed = await customStrategy.compress(data, hints);
      expect(compressed.metadata['level']).toBeGreaterThanOrEqual(10);
    });
  });
});