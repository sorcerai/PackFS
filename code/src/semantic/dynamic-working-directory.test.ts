/**
 * Tests for dynamic working directory functionality
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DiskSemanticBackend } from './disk-semantic-backend.js';

describe('Dynamic Working Directory', () => {
  let testBaseDir: string;
  let projectADir: string;
  let projectBDir: string;
  let mainContextDir: string;
  let backend: DiskSemanticBackend;

  beforeEach(async () => {
    // Create test directory structure
    testBaseDir = join(tmpdir(), `packfs-dynamic-test-${Date.now()}`);
    projectADir = join(testBaseDir, 'projects', 'project-a');
    projectBDir = join(testBaseDir, 'projects', 'project-b');
    mainContextDir = join(testBaseDir, 'main-context');

    // Create directories
    await fs.mkdir(projectADir, { recursive: true });
    await fs.mkdir(projectBDir, { recursive: true });
    await fs.mkdir(mainContextDir, { recursive: true });

    // Create test files in each directory
    await fs.writeFile(join(projectADir, 'config.json'), '{"project": "A"}');
    await fs.writeFile(join(projectBDir, 'config.json'), '{"project": "B"}');
    await fs.writeFile(join(mainContextDir, 'config.json'), '{"project": "main"}');

    // Initialize backend with main context directory
    backend = new DiskSemanticBackend(mainContextDir);
    await backend.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testBaseDir, { recursive: true, force: true });
  });

  describe('File Access with Dynamic Working Directory', () => {
    it('should read file from default working directory when no override provided', async () => {
      const result = await backend.accessFile({
        purpose: 'read',
        target: { path: 'config.json' },
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"project": "main"}');
    });

    it('should read file from specified working directory', async () => {
      const result = await backend.accessFile({
        purpose: 'read',
        target: { path: 'config.json' },
        options: { workingDirectory: projectADir },
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"project": "A"}');
    });

    it('should switch between different working directories', async () => {
      // Read from project A
      const resultA = await backend.accessFile({
        purpose: 'read',
        target: { path: 'config.json' },
        options: { workingDirectory: projectADir },
      });

      expect(resultA.success).toBe(true);
      expect(resultA.content).toBe('{"project": "A"}');

      // Read from project B
      const resultB = await backend.accessFile({
        purpose: 'read',
        target: { path: 'config.json' },
        options: { workingDirectory: projectBDir },
      });

      expect(resultB.success).toBe(true);
      expect(resultB.content).toBe('{"project": "B"}');

      // Read from main context (default)
      const resultMain = await backend.accessFile({
        purpose: 'read',
        target: { path: 'config.json' },
      });

      expect(resultMain.success).toBe(true);
      expect(resultMain.content).toBe('{"project": "main"}');
    });

    it('should handle file not found with dynamic working directory', async () => {
      const result = await backend.accessFile({
        purpose: 'read',
        target: { path: 'nonexistent.txt' },
        options: { workingDirectory: projectADir },
      });

      expect(result.success).toBe(false);
      expect(result.exists).toBe(false);
    });
  });

  describe('Content Update with Dynamic Working Directory', () => {
    it('should create file in specified working directory', async () => {
      const result = await backend.updateContent({
        purpose: 'create',
        target: { path: 'test.txt' },
        content: 'Project A test file',
        options: { workingDirectory: projectADir },
      });

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      // Verify file was created in correct location
      const content = await fs.readFile(join(projectADir, 'test.txt'), 'utf8');
      expect(content).toBe('Project A test file');

      // Verify file doesn't exist in default location
      await expect(fs.access(join(mainContextDir, 'test.txt'))).rejects.toThrow();
    });

    it('should append to file in specified working directory', async () => {
      // Create initial file
      await fs.writeFile(join(projectBDir, 'log.txt'), 'Initial log\n');

      const result = await backend.updateContent({
        purpose: 'append',
        target: { path: 'log.txt' },
        content: 'New log entry\n',
        options: { workingDirectory: projectBDir },
      });

      expect(result.success).toBe(true);

      // Verify content
      const content = await fs.readFile(join(projectBDir, 'log.txt'), 'utf8');
      expect(content).toBe('Initial log\nNew log entry\n');
    });
  });

  describe('Mastra Integration', () => {
    it('should work with Mastra tool wrapper', async () => {
      // Simulate Mastra tool execution with dynamic working directory
      const params = {
        operation: 'access',
        purpose: 'read',
        target: { path: 'config.json' },
        workingDirectory: projectADir,
      };

      const result = await backend.accessFile({
        purpose: params.purpose as any,
        target: params.target,
        options: { workingDirectory: params.workingDirectory },
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"project": "A"}');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent operations on different directories', async () => {
      // Simulate concurrent operations
      const operations = [
        backend.accessFile({
          purpose: 'read',
          target: { path: 'config.json' },
          options: { workingDirectory: projectADir },
        }),
        backend.accessFile({
          purpose: 'read',
          target: { path: 'config.json' },
          options: { workingDirectory: projectBDir },
        }),
        backend.accessFile({
          purpose: 'read',
          target: { path: 'config.json' },
        }),
      ];

      const results = await Promise.all(operations);

      expect(results[0]?.success).toBe(true);
      expect(results[0]?.content).toBe('{"project": "A"}');

      expect(results[1]?.success).toBe(true);
      expect(results[1]?.content).toBe('{"project": "B"}');

      expect(results[2]?.success).toBe(true);
      expect(results[2]?.content).toBe('{"project": "main"}');
    });
  });

  describe('Index Behavior', () => {
    it('should not update index for operations with custom working directory', async () => {
      // Create file with custom working directory
      await backend.updateContent({
        purpose: 'create',
        target: { path: 'custom-dir-file.txt' },
        content: 'This should not be indexed',
        options: { workingDirectory: projectADir },
      });

      // Try to discover the file through semantic search (should not find it)
      const result = await backend.discoverFiles({
        purpose: 'search_semantic',
        target: { semanticQuery: 'custom-dir-file' },
      });

      expect(result.success).toBe(true);
      expect(result.files.length).toBe(0);
    });

    it('should update index for operations with default working directory', async () => {
      // Create file with default working directory
      await backend.updateContent({
        purpose: 'create',
        target: { path: 'indexed-file.txt' },
        content: 'This should be indexed',
      });

      // Allow time for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to discover the file through semantic search
      const result = await backend.discoverFiles({
        purpose: 'search_semantic',
        target: { semanticQuery: 'indexed-file' },
      });

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files[0]?.path).toBe('indexed-file.txt');
    });
  });
});