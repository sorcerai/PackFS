import { CompressionEngine, CompressionProfile } from '../../src/compression/CompressionEngine';

describe('Compression Ratio Validation', () => {
  let engine: CompressionEngine;
  const results: any[] = [];

  beforeAll(() => {
    const profile: CompressionProfile = {
      name: 'production',
      development: false,
      maxMemoryUsage: 1024 * 1024 * 100, // 100MB
      prioritizeSpeed: false,
      enableDictionary: true,
      strategies: {}
    };
    engine = new CompressionEngine(profile);
  });

  afterAll(() => {
    // Write results to a file for documentation
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        averageCompressionRatio: 0,
        bestCompressionRatio: 0,
        worstCompressionRatio: 1,
        byFileType: {} as any
      },
      details: results
    };

    // Calculate summary statistics
    const byType: { [key: string]: { ratios: number[], sizes: number[] } } = {};
    
    results.forEach(result => {
      const type = result.fileType;
      if (!byType[type]) {
        byType[type] = { ratios: [], sizes: [] };
      }
      byType[type].ratios.push(result.compressionRatio);
      byType[type].sizes.push(result.originalSize);
    });

    let totalWeightedRatio = 0;
    let totalSize = 0;

    Object.entries(byType).forEach(([type, data]) => {
      const avgRatio = data.ratios.reduce((a, b) => a + b, 0) / data.ratios.length;
      const totalTypeSize = data.sizes.reduce((a, b) => a + b, 0);
      
      report.summary.byFileType[type] = {
        averageRatio: avgRatio,
        sampleCount: data.ratios.length,
        totalSize: totalTypeSize
      };

      totalWeightedRatio += avgRatio * totalTypeSize;
      totalSize += totalTypeSize;
    });

    report.summary.averageCompressionRatio = totalSize > 0 ? totalWeightedRatio / totalSize : 0;
    report.summary.bestCompressionRatio = Math.min(...results.map(r => r.compressionRatio));
    report.summary.worstCompressionRatio = Math.max(...results.map(r => r.compressionRatio));

    console.log('\n=== Compression Ratio Report ===');
    console.log(`Overall Average Compression Ratio: ${(report.summary.averageCompressionRatio * 100).toFixed(2)}%`);
    console.log(`Best Compression Ratio: ${(report.summary.bestCompressionRatio * 100).toFixed(2)}%`);
    console.log(`Worst Compression Ratio: ${(report.summary.worstCompressionRatio * 100).toFixed(2)}%`);
    console.log('\nBy File Type:');
    Object.entries(report.summary.byFileType).forEach(([type, stats]: [string, any]) => {
      console.log(`  ${type}: ${(stats.averageRatio * 100).toFixed(2)}% (${stats.sampleCount} files)`);
    });
  });

  const testCompressionRatio = async (
    name: string,
    data: Buffer,
    mimeType: string,
    expectedBetterThan: number = 0.5
  ) => {
    const compressed = await engine.compress(data, mimeType, {
      path: name,
      accessFrequency: 0.5
    });
    
    expect(compressed.success).toBe(true);
    const ratio = compressed.compressionRatio;
    
    results.push({
      name,
      fileType: mimeType,
      algorithm: compressed.algorithm,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      compressionRatio: ratio,
      compressionTime: compressed.compressionTime
    });

    expect(ratio).toBeLessThan(expectedBetterThan);
    
    // Verify decompression works
    if (compressed.chunk) {
      const decompressed = await engine.decompress(compressed.chunk);
      expect(decompressed).toEqual(data);
    }

    return ratio;
  };

  describe('JavaScript Files', () => {
    it('should compress minified JavaScript efficiently', async () => {
      const minifiedJs = Buffer.from(`function factorial(n){return n<=1?n:n*factorial(n-1)}const fibonacci=n=>{if(n<=1)return n;return fibonacci(n-1)+fibonacci(n-2)};console.log(factorial(5),fibonacci(10));`.repeat(50));
      await testCompressionRatio('Minified JS', minifiedJs, 'application/javascript', 0.6);
    });

    it('should compress regular JavaScript very efficiently', async () => {
      const regularJs = Buffer.from(`
        // Calculate factorial recursively
        function factorial(n) {
          if (n <= 1) {
            return n;
          }
          return n * factorial(n - 1);
        }

        // Calculate fibonacci sequence
        const fibonacci = (n) => {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        };

        // Test the functions
        console.log('Factorial of 5:', factorial(5));
        console.log('Fibonacci of 10:', fibonacci(10));
      `.repeat(20));
      await testCompressionRatio('Regular JS', regularJs, 'application/javascript', 0.4);
    });
  });

  describe('JSON Files', () => {
    it('should compress repetitive JSON extremely well', async () => {
      const repetitiveJson = Buffer.from(JSON.stringify({
        users: Array(100).fill({
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'testuser',
          email: 'test@example.com',
          profile: {
            firstName: 'Test',
            lastName: 'User',
            avatar: 'https://example.com/avatar.jpg',
            preferences: {
              theme: 'dark',
              language: 'en-US',
              notifications: true
            }
          }
        })
      }));
      await testCompressionRatio('Repetitive JSON', repetitiveJson, 'application/json', 0.15);
    });

    it('should compress varied JSON data well', async () => {
      const variedJson = Buffer.from(JSON.stringify({
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          author: 'Test Suite'
        },
        data: Array(50).fill(null).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random() * 1000,
          tags: ['tag1', 'tag2', 'tag3'].slice(0, Math.floor(Math.random() * 3) + 1)
        }))
      }));
      await testCompressionRatio('Varied JSON', variedJson, 'application/json', 0.5);
    });
  });

  describe('Text Files', () => {
    it('should compress plain text efficiently', async () => {
      const plainText = Buffer.from(`
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
      `.repeat(30));
      await testCompressionRatio('Plain Text', plainText, 'text/plain', 0.5);
    });

    it('should compress markdown files well', async () => {
      const markdown = Buffer.from(`
# PackFS Compression Module

## Overview
The compression module provides intelligent, automatic compression for stored files.

### Features
- **Automatic Strategy Selection**: Chooses the best algorithm based on file characteristics
- **Multiple Algorithms**: Brotli, LZ4, and Zstandard support
- **Performance Profiles**: Optimized for development, production, and CI environments

### Usage
\`\`\`javascript
const engine = new CompressionEngine();
const compressed = await engine.compress(data, hints);
const decompressed = await engine.decompress(compressed);
\`\`\`
      `.repeat(10));
      await testCompressionRatio('Markdown', markdown, 'text/markdown', 0.4);
    });
  });

  describe('HTML/CSS Files', () => {
    it('should compress HTML efficiently', async () => {
      const html = Buffer.from(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
</head>
<body>
    <div class="container">
        <h1>Welcome to PackFS</h1>
        <p>This is a test page for compression ratio validation.</p>
        <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
            <li>Feature 3</li>
        </ul>
    </div>
</body>
</html>
      `.repeat(15));
      await testCompressionRatio('HTML', html, 'text/html', 0.3);
    });

    it('should compress CSS very well', async () => {
      const css = Buffer.from(`
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.button {
    display: inline-block;
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.3s ease;
}

.button:hover {
    background-color: #0056b3;
}

.card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
      `.repeat(20));
      await testCompressionRatio('CSS', css, 'text/css', 0.3);
    });
  });

  describe('Binary Files', () => {
    it('should handle random binary data', async () => {
      const binaryData = Buffer.alloc(10000);
      for (let i = 0; i < binaryData.length; i++) {
        binaryData[i] = Math.floor(Math.random() * 256);
      }
      // Random data doesn't compress well
      await testCompressionRatio('Random Binary', binaryData, 'application/octet-stream', 1.1);
    });

    it('should compress structured binary data', async () => {
      // Simulate structured binary with patterns
      const structuredBinary = Buffer.alloc(10000);
      for (let i = 0; i < structuredBinary.length; i++) {
        structuredBinary[i] = (i % 256) ^ ((i / 256) | 0);
      }
      await testCompressionRatio('Structured Binary', structuredBinary, 'application/octet-stream', 0.8);
    });
  });

  describe('Mixed Workload', () => {
    it('should handle mixed file types efficiently', async () => {
      const files = [
        { data: Buffer.from('console.log("test");'.repeat(100)), type: 'application/javascript' },
        { data: Buffer.from(JSON.stringify({ test: 'data' }).repeat(100)), type: 'application/json' },
        { data: Buffer.from('Test content'.repeat(100)), type: 'text/plain' },
      ];

      let totalOriginal = 0;
      let totalCompressed = 0;

      for (const file of files) {
        const compressed = await engine.compress(file.data, file.type, {
          accessFrequency: 0.5
        });
        
        if (compressed.success) {
          totalOriginal += compressed.originalSize;
          totalCompressed += compressed.compressedSize;
        }
      }

      const overallRatio = totalCompressed / totalOriginal;
      console.log(`Mixed workload compression ratio: ${(overallRatio * 100).toFixed(2)}%`);
      
      // Mixed workload should achieve good compression overall
      expect(overallRatio).toBeLessThan(0.6);
    });
  });
});