/**
 * Unit tests for PackFS v0.1.14 critical fixes
 * Tests the specific issues reported in the bug report:
 * 1. File Reader Tool: Missing content field
 * 2. File Organizer Tool: Wrong response structure and path resolution
 */

import { createMastraSemanticToolSuite } from '../../../mastra.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('PackFS v0.1.14 Critical Fixes', () => {
  const tempDir = path.join(os.tmpdir(), 'packfs-v0.1.14-fixes-test-' + Date.now());
  let packfsTools: ReturnType<typeof createMastraSemanticToolSuite>;

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(tempDir, { recursive: true });

    // Create test files
    await fs.writeFile(path.join(tempDir, 'test-file.txt'), 'Test file content');
    await fs.writeFile(path.join(tempDir, 'readme.md'), '# Test Project\nThis is a test project.');

    // Create subdirectory with files
    await fs.mkdir(path.join(tempDir, 'foundation'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'foundation', 'project_definition.md'),
      '# Project Definition\nThis is the project definition content.'
    );
    await fs.writeFile(
      path.join(tempDir, 'foundation', 'principles.md'),
      '# Principles\nThese are the project principles.'
    );

    // Initialize PackFS tools
    packfsTools = createMastraSemanticToolSuite({
      workingDirectory: tempDir,
    });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  });

  describe('File Reader Tool Fixes', () => {
    test('should return content field in successful read operations', async () => {
      // Test the exact scenario from the bug report
      const result = await packfsTools.fileReader.execute({
        path: 'foundation/project_definition.md',
        purpose: 'read',
      });

      // Verify the fix: content field should be present
      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Project Definition');
    });

    test('should not wrap response in data object', async () => {
      const result = await packfsTools.fileReader.execute({
        path: 'test-file.txt',
        purpose: 'read',
      });

      // Verify the fix: response should not be wrapped in data object
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined(); // Should not have nested data object
      expect(result.content).toBeDefined(); // Content should be at top level
      expect(result.exists).toBe(true);
    });
  });

  describe('File Organizer Tool Fixes', () => {
    test('should return results array instead of files array', async () => {
      // Test the exact scenario from the bug report
      const result = await packfsTools.fileOrganizer.execute({
        operation: 'list',
        source: 'foundation',
      });

      // Verify the fix: should use 'results' property instead of 'files'
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.data).toBeUndefined(); // Should not have nested data object
      expect(result.totalFound).toBeDefined();
    });

    test('should respect source parameter for directory listing', async () => {
      // Test the exact scenario from the bug report
      const result = await packfsTools.fileOrganizer.execute({
        operation: 'list',
        source: 'foundation',
      });

      // Verify the fix: should list contents of 'foundation' directory, not root
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(2); // Should find 2 files in foundation

      // Verify all results are from the foundation directory
      for (const file of result.results) {
        expect(file.path).toMatch(/^foundation\//);
      }

      // Verify specific files are found
      const filePaths = result.results.map((f: any) => f.path);
      expect(filePaths).toContain('foundation/project_definition.md');
      expect(filePaths).toContain('foundation/principles.md');
    });

    test('should not wrap response in data object', async () => {
      const result = await packfsTools.fileOrganizer.execute({
        operation: 'list',
        source: '.',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined(); // Should not have nested data object
      expect(result.results).toBeDefined(); // Results should be at top level
    });
  });

  describe('Integration Tests', () => {
    test('should work with the exact test cases from bug report', async () => {
      // Test Case 1: File Reader - Read foundation/project_definition.md
      const readResult = await packfsTools.fileReader.execute({
        path: 'foundation/project_definition.md',
        purpose: 'read',
      });

      expect(readResult.success).toBe(true);
      expect(readResult.exists).toBe(true);
      expect(readResult.content).toBeDefined();
      expect(readResult.content).toContain('Project Definition');

      // Test Case 2: File Organizer - List foundation directory
      const listResult = await packfsTools.fileOrganizer.execute({
        operation: 'list',
        source: 'foundation',
      });

      expect(listResult.success).toBe(true);
      expect(listResult.results).toBeDefined();
      expect(listResult.results.length).toBe(2);
      expect(listResult.data).toBeUndefined(); // No nested data object
    });
  });
});
