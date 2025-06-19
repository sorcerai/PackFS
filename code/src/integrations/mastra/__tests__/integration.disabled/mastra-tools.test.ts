/**
 * Integration tests for Mastra native tools
 * Tests the complete tool workflow with PackFS integration
 */

import { createPackfsTools } from '../../index';
import type { PackfsToolConfig } from '../../types';
import { MemoryBackend } from '../../../../backends/memory';
import { PackFS } from '../../../../core/filesystem';

// Mock Mastra's createTool to return executable tools
jest.mock('@mastra/core/tools', () => ({
  createTool: (config: any) => ({
    ...config,
    execute: config.execute,
    _toolConfig: config
  })
}));

describe('Mastra Tools Integration', () => {
  let filesystem: PackFS;
  let config: PackfsToolConfig;

  beforeEach(async () => {
    // Create real filesystem with memory backend
    const backend = new MemoryBackend();
    filesystem = new PackFS({ backend });

    // Set up test files
    await filesystem.writeFile('/test/readme.md', '# Test Project\nThis is a test file.');
    await filesystem.writeFile('/test/config.json', '{"name": "test", "version": "1.0.0"}');
    await filesystem.writeFile('/test/data.txt', 'Sample data for testing');
    await filesystem.mkdir('/test/src');
    await filesystem.writeFile('/test/src/index.js', 'console.log("Hello");');

    config = {
      rootPath: '/test',
      permissions: ['read', 'write', 'search'],
      security: {
        maxFileSize: 1024 * 1024,
        allowedExtensions: ['.md', '.json', '.txt', '.js']
      }
    };
  });

  describe('File Reader Tool', () => {
    it('should read files successfully', async () => {
      const tools = createPackfsTools(config);
      const reader = tools.fileReader;

      const result = await reader.execute({
        purpose: 'read',
        target: { path: '/test/readme.md' }
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test Project');
      expect(result.metadata).toBeDefined();
    });

    it('should check file existence', async () => {
      const tools = createPackfsTools(config);
      const reader = tools.fileReader;

      const result = await reader.execute({
        purpose: 'exists',
        target: { path: '/test/nonexistent.txt' }
      });

      expect(result.success).toBe(true);
      expect(result.exists).toBe(false);
    });

    it('should get file metadata', async () => {
      const tools = createPackfsTools(config);
      const reader = tools.fileReader;

      const result = await reader.execute({
        purpose: 'metadata',
        target: { path: '/test/config.json' }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.size).toBeGreaterThan(0);
      expect(result.metadata.type).toBe('file');
    });

    it('should respect security constraints', async () => {
      const tools = createPackfsTools(config);
      const reader = tools.fileReader;

      const result = await reader.execute({
        purpose: 'read',
        target: { path: '/test/../../../etc/passwd' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('security');
    });
  });

  describe('File Writer Tool', () => {
    it('should create new files', async () => {
      const tools = createPackfsTools(config);
      const writer = tools.fileWriter;

      const result = await writer.execute({
        purpose: 'create',
        target: { path: '/test/new-file.txt' },
        content: 'New file content'
      });

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      // Verify file was created
      const exists = await filesystem.exists('/test/new-file.txt');
      expect(exists).toBe(true);
    });

    it('should update existing files', async () => {
      const tools = createPackfsTools(config);
      const writer = tools.fileWriter;

      const result = await writer.execute({
        purpose: 'update',
        target: { path: '/test/data.txt' },
        content: 'Updated content'
      });

      expect(result.success).toBe(true);

      // Verify content was updated
      const content = await filesystem.readFile('/test/data.txt', 'utf8');
      expect(content).toBe('Updated content');
    });

    it('should append to files', async () => {
      const tools = createPackfsTools(config);
      const writer = tools.fileWriter;

      const result = await writer.execute({
        purpose: 'append',
        target: { path: '/test/data.txt' },
        content: '\nAppended line'
      });

      expect(result.success).toBe(true);

      const content = await filesystem.readFile('/test/data.txt', 'utf8');
      expect(content).toContain('Sample data');
      expect(content).toContain('Appended line');
    });

    it('should enforce file extension restrictions', async () => {
      const tools = createPackfsTools(config);
      const writer = tools.fileWriter;

      const result = await writer.execute({
        purpose: 'create',
        target: { path: '/test/script.exe' },
        content: 'malicious code'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('extension');
    });
  });

  describe('File Searcher Tool', () => {
    it('should list directory contents', async () => {
      const tools = createPackfsTools(config);
      const searcher = tools.fileSearcher;

      const result = await searcher.execute({
        purpose: 'list',
        target: { path: '/test' }
      });

      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.some((f: any) => f.path.includes('readme.md'))).toBe(true);
    });

    it('should search files by content', async () => {
      const tools = createPackfsTools(config);
      const searcher = tools.fileSearcher;

      const result = await searcher.execute({
        purpose: 'search_content',
        target: {
          path: '/test',
          query: 'test'
        },
        options: {
          recursive: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.results.some((f: any) => f.path.includes('readme.md'))).toBe(true);
    });

    it('should perform semantic search', async () => {
      const tools = createPackfsTools({
        ...config,
        semantic: {
          enableRelationships: true,
          relevanceThreshold: 0.3
        }
      });
      const searcher = tools.fileSearcher;

      const result = await searcher.execute({
        purpose: 'search_semantic',
        target: {
          path: '/test',
          query: 'configuration settings'
        }
      });

      expect(result.success).toBe(true);
      expect(result.results.some((f: any) => f.path.includes('config.json'))).toBe(true);
    });

    it('should respect max results limit', async () => {
      // Add more files
      for (let i = 0; i < 10; i++) {
        await filesystem.writeFile(`/test/file${i}.txt`, `Content ${i}`);
      }

      const tools = createPackfsTools(config);
      const searcher = tools.fileSearcher;

      const result = await searcher.execute({
        purpose: 'list',
        target: { path: '/test' },
        options: {
          maxResults: 5
        }
      });

      expect(result.success).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Tool Coordination', () => {
    it('should handle read-modify-write workflow', async () => {
      const tools = createPackfsTools(config);

      // Read existing file
      const readResult = await tools.fileReader.execute({
        purpose: 'read',
        target: { path: '/test/config.json' }
      });

      expect(readResult.success).toBe(true);
      const originalContent = JSON.parse(readResult.content);

      // Modify content
      originalContent.updated = true;
      originalContent.timestamp = new Date().toISOString();

      // Write back
      const writeResult = await tools.fileWriter.execute({
        purpose: 'update',
        target: { path: '/test/config.json' },
        content: JSON.stringify(originalContent, null, 2)
      });

      expect(writeResult.success).toBe(true);

      // Verify changes
      const verifyResult = await tools.fileReader.execute({
        purpose: 'read',
        target: { path: '/test/config.json' }
      });

      const updatedContent = JSON.parse(verifyResult.content);
      expect(updatedContent.updated).toBe(true);
      expect(updatedContent.timestamp).toBeDefined();
    });

    it('should handle search and update workflow', async () => {
      const tools = createPackfsTools(config);

      // Search for files
      const searchResult = await tools.fileSearcher.execute({
        purpose: 'search_content',
        target: {
          path: '/test',
          query: 'Hello'
        }
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.results.length).toBeGreaterThan(0);

      // Update found files
      for (const file of searchResult.results) {
        const updateResult = await tools.fileWriter.execute({
          purpose: 'append',
          target: { path: file.path },
          content: '\n// Updated by Mastra'
        });
        expect(updateResult.success).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required parameters', async () => {
      const tools = createPackfsTools(config);

      const result = await tools.fileReader.execute({
        purpose: 'read'
        // Missing target
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should handle filesystem errors gracefully', async () => {
      const tools = createPackfsTools(config);

      const result = await tools.fileReader.execute({
        purpose: 'read',
        target: { path: '/test/nonexistent.file' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate content for write operations', async () => {
      const tools = createPackfsTools(config);

      const result = await tools.fileWriter.execute({
        purpose: 'create',
        target: { path: '/test/empty.txt' }
        // Missing content
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('content');
    });
  });

  describe('Security Integration', () => {
    it('should enforce path sandboxing', async () => {
      const tools = createPackfsTools(config);

      const attempts = [
        '/etc/passwd',
        '../../../etc/passwd',
        '/test/../../etc/passwd',
        '\\\\server\\share\\file'
      ];

      for (const path of attempts) {
        const result = await tools.fileReader.execute({
          purpose: 'read',
          target: { path }
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain('security');
      }
    });

    it('should block access to blocked paths', async () => {
      const secureConfig: PackfsToolConfig = {
        ...config,
        security: {
          ...config.security,
          blockedPaths: ['secret', 'private']
        }
      };

      await filesystem.mkdir('/test/secret');
      await filesystem.writeFile('/test/secret/data.txt', 'Secret data');

      const tools = createPackfsTools(secureConfig);

      const result = await tools.fileReader.execute({
        purpose: 'read',
        target: { path: '/test/secret/data.txt' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked');
    });

    it('should enforce file size limits', async () => {
      const limitedConfig: PackfsToolConfig = {
        ...config,
        security: {
          ...config.security,
          maxFileSize: 100 // 100 bytes limit
        }
      };

      // Create a large file
      const largeContent = 'x'.repeat(200);
      await filesystem.writeFile('/test/large.txt', largeContent);

      const tools = createPackfsTools(limitedConfig);

      const result = await tools.fileReader.execute({
        purpose: 'read',
        target: { path: '/test/large.txt' },
        preferences: {
          maxSize: 200 // Exceeds configured limit
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('size');
    });
  });
});