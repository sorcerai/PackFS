/**
 * Tests for semantic filesystem interface
 */

import { MemorySemanticBackend } from './memory-semantic-backend';
import { SemanticCompatibilityAdapter } from './compatibility-adapter';
import { SemanticIntentValidator } from './interface';
import { TraditionalToSemanticConverter } from './intent-processor';

describe('Semantic Filesystem Interface', () => {
  let backend: MemorySemanticBackend;
  let adapter: SemanticCompatibilityAdapter;

  beforeEach(() => {
    backend = new MemorySemanticBackend();
    adapter = new SemanticCompatibilityAdapter(backend);
  });

  describe('SemanticFileSystemInterface Core Operations', () => {
    describe('accessFile', () => {
      it('should read file content', async () => {
        // First create a file
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/test.txt' },
          content: 'Hello, world!'
        });

        const result = await backend.accessFile({
          purpose: 'read',
          target: { path: '/test.txt' }
        });

        expect(result.success).toBe(true);
        expect(result.content).toBe('Hello, world!');
        expect(result.exists).toBe(true);
      });

      it('should verify file existence', async () => {
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/exists.txt' },
          content: 'I exist'
        });

        const existsResult = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/exists.txt' }
        });

        const notExistsResult = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/not-exists.txt' }
        });

        expect(existsResult.success).toBe(true);
        expect(existsResult.exists).toBe(true);
        expect(notExistsResult.success).toBe(true);
        expect(notExistsResult.exists).toBe(false);
      });

      it('should create_or_get files', async () => {
        // Create new file
        const createResult = await backend.accessFile({
          purpose: 'create_or_get',
          target: { path: '/new-file.txt' }
        });

        expect(createResult.success).toBe(true);
        expect(createResult.exists).toBe(true);
        expect(createResult.content).toBe('');

        // Get existing file
        await backend.updateContent({
          purpose: 'overwrite',
          target: { path: '/new-file.txt' },
          content: 'Now has content'
        });

        const getResult = await backend.accessFile({
          purpose: 'create_or_get',
          target: { path: '/new-file.txt' }
        });

        expect(getResult.success).toBe(true);
        expect(getResult.content).toBe('Now has content');
      });

      it('should generate file previews', async () => {
        const longContent = 'This is a very long piece of content that should be truncated when generating previews. '.repeat(10);
        
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/long-file.txt' },
          content: longContent
        });

        const result = await backend.accessFile({
          purpose: 'preview',
          target: { path: '/long-file.txt' }
        });

        expect(result.success).toBe(true);
        expect(result.preview).toBeDefined();
        expect(result.preview!.length).toBeLessThan(longContent.length);
      });
    });

    describe('updateContent', () => {
      it('should create new files', async () => {
        const result = await backend.updateContent({
          purpose: 'create',
          target: { path: '/created.txt' },
          content: 'Created content'
        });

        expect(result.success).toBe(true);
        expect(result.created).toBe(true);
        expect(result.bytesWritten).toBe('Created content'.length);
      });

      it('should append to existing files', async () => {
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/append-test.txt' },
          content: 'Initial content'
        });

        const result = await backend.updateContent({
          purpose: 'append',
          target: { path: '/append-test.txt' },
          content: ' appended'
        });

        expect(result.success).toBe(true);
        expect(result.created).toBe(false);

        const readResult = await backend.accessFile({
          purpose: 'read',
          target: { path: '/append-test.txt' }
        });

        expect(readResult.content).toBe('Initial content appended');
      });

      it('should overwrite files', async () => {
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/overwrite-test.txt' },
          content: 'Original content'
        });

        const result = await backend.updateContent({
          purpose: 'overwrite',
          target: { path: '/overwrite-test.txt' },
          content: 'New content'
        });

        expect(result.success).toBe(true);

        const readResult = await backend.accessFile({
          purpose: 'read',
          target: { path: '/overwrite-test.txt' }
        });

        expect(readResult.content).toBe('New content');
      });

      it('should merge content', async () => {
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/merge-test.txt' },
          content: 'Line 1'
        });

        const result = await backend.updateContent({
          purpose: 'merge',
          target: { path: '/merge-test.txt' },
          content: 'Line 2'
        });

        expect(result.success).toBe(true);

        const readResult = await backend.accessFile({
          purpose: 'read',
          target: { path: '/merge-test.txt' }
        });

        expect(readResult.content).toBe('Line 1\nLine 2');
      });
    });

    describe('discoverFiles', () => {
      beforeEach(async () => {
        // Set up test files
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/docs/readme.md' },
          content: 'This is documentation about the project'
        });
        
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/src/main.js' },
          content: 'console.log("Hello from main"); // JavaScript code'
        });
        
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/tests/unit.test.js' },
          content: 'describe("tests", () => { it("should work", () => {}); })'
        });
      });

      it('should find files by semantic query', async () => {
        const result = await backend.discoverFiles({
          purpose: 'search_semantic',
          target: { semanticQuery: 'documentation' }
        });

        expect(result.success).toBe(true);
        expect(result.files.length).toBeGreaterThan(0);
        expect(result.files.some(f => f.path.includes('readme.md'))).toBe(true);
      });

      it('should search file content', async () => {
        const result = await backend.discoverFiles({
          purpose: 'search_content',
          target: { semanticQuery: 'console.log' }
        });

        expect(result.success).toBe(true);
        expect(result.files.length).toBeGreaterThan(0);
        expect(result.files.some(f => f.path.includes('main.js'))).toBe(true);
      });

      it('should find files by criteria', async () => {
        const result = await backend.discoverFiles({
          purpose: 'find',
          target: { 
            criteria: { 
              name: 'test',
              content: 'describe'
            } 
          }
        });

        expect(result.success).toBe(true);
        expect(result.files.length).toBeGreaterThan(0);
        expect(result.files.some(f => f.path.includes('unit.test.js'))).toBe(true);
      });

      it('should perform integrated search', async () => {
        const result = await backend.discoverFiles({
          purpose: 'search_integrated',
          target: { semanticQuery: 'test' }
        });

        expect(result.success).toBe(true);
        expect(result.files.length).toBeGreaterThan(0);
        // Should find files both by filename and content
      });
    });

    describe('removeFiles', () => {
      beforeEach(async () => {
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/to-delete.txt' },
          content: 'This will be deleted'
        });
      });

      it('should delete files', async () => {
        const result = await backend.removeFiles({
          purpose: 'delete_file',
          target: { path: '/to-delete.txt' }
        });

        expect(result.success).toBe(true);
        expect(result.filesDeleted).toBe(1);
        expect(result.deletedPaths).toContain('/to-delete.txt');

        // Verify file is deleted
        const existsResult = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/to-delete.txt' }
        });
        expect(existsResult.exists).toBe(false);
      });

      it('should support dry run', async () => {
        const result = await backend.removeFiles({
          purpose: 'delete_file',
          target: { path: '/to-delete.txt' },
          options: { dryRun: true }
        });

        expect(result.success).toBe(true);
        expect(result.filesDeleted).toBe(1);
        expect(result.message).toContain('dry run');

        // Verify file still exists
        const existsResult = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/to-delete.txt' }
        });
        expect(existsResult.exists).toBe(true);
      });
    });

    describe('organizeFiles', () => {
      beforeEach(async () => {
        await backend.updateContent({
          purpose: 'create',
          target: { path: '/source.txt' },
          content: 'Source content'
        });
      });

      it('should move files', async () => {
        const result = await backend.organizeFiles({
          purpose: 'move',
          source: { path: '/source.txt' },
          destination: { path: '/moved.txt' }
        });

        expect(result.success).toBe(true);
        expect(result.filesAffected).toBe(1);
        expect(result.newPaths).toContain('/moved.txt');

        // Verify source is gone and destination exists
        const sourceExists = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/source.txt' }
        });
        expect(sourceExists.exists).toBe(false);

        const destExists = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/moved.txt' }
        });
        expect(destExists.exists).toBe(true);
      });

      it('should copy files', async () => {
        const result = await backend.organizeFiles({
          purpose: 'copy',
          source: { path: '/source.txt' },
          destination: { path: '/copied.txt' }
        });

        expect(result.success).toBe(true);
        expect(result.filesAffected).toBe(1);

        // Verify both source and destination exist
        const sourceExists = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/source.txt' }
        });
        expect(sourceExists.exists).toBe(true);

        const destExists = await backend.accessFile({
          purpose: 'verify_exists',
          target: { path: '/copied.txt' }
        });
        expect(destExists.exists).toBe(true);
      });
    });
  });

  describe('Backward Compatibility Adapter', () => {
    it('should support traditional readFile', async () => {
      await adapter.writeFile('/traditional.txt', 'Traditional content');
      const content = await adapter.readFile('/traditional.txt');
      
      expect(content).toBe('Traditional content');
    });

    it('should support traditional exists', async () => {
      await adapter.writeFile('/exists-test.txt', 'Exists');
      
      const exists = await adapter.exists('/exists-test.txt');
      const notExists = await adapter.exists('/not-exists.txt');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should support traditional stat', async () => {
      await adapter.writeFile('/stat-test.txt', 'Stat test');
      const metadata = await adapter.stat('/stat-test.txt');
      
      expect(metadata.path).toBe('/stat-test.txt');
      expect(metadata.size).toBe('Stat test'.length);
      expect(metadata.isDirectory).toBe(false);
    });

    it('should support enhanced readFile', async () => {
      await adapter.writeFile('/enhanced.txt', 'Enhanced content for testing');
      
      const result = await adapter.readFileEnhanced('/enhanced.txt', {
        purpose: 'read'
      });
      
      expect(result.content).toBe('Enhanced content for testing');
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.path).toBe('/enhanced.txt');
    });

    it('should support semantic file search', async () => {
      await adapter.writeFile('/search1.txt', 'This file contains documentation');
      await adapter.writeFile('/search2.txt', 'This file contains code examples');
      
      const results = await adapter.findFiles('documentation');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.path.includes('search1.txt'))).toBe(true);
    });

    it('should support natural language operations', async () => {
      const result = await adapter.executeNaturalLanguage('create a file called test.txt with content "Hello NL"');
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      
      // Verify the file was created
      const exists = await adapter.exists('test.txt');
      expect(exists).toBe(true);
    });
  });

  describe('Intent Validation', () => {
    it('should validate FileAccessIntent', () => {
      const validIntent = {
        purpose: 'read' as const,
        target: { path: '/test.txt' }
      };
      
      const invalidIntent = {
        purpose: 'read' as const,
        target: {} // No targeting method
      };
      
      expect(SemanticIntentValidator.validateFileAccessIntent(validIntent)).toHaveLength(0);
      expect(SemanticIntentValidator.validateFileAccessIntent(invalidIntent)).toHaveLength(1);
    });

    it('should validate ContentUpdateIntent', () => {
      const validIntent = {
        purpose: 'create' as const,
        target: { path: '/test.txt' },
        content: 'Test content'
      };
      
      const invalidIntent = {
        purpose: 'append' as const,
        target: {}, // Missing path
        content: 'Test content'
      };
      
      expect(SemanticIntentValidator.validateContentUpdateIntent(validIntent)).toHaveLength(0);
      expect(SemanticIntentValidator.validateContentUpdateIntent(invalidIntent)).toHaveLength(1);
    });
  });

  describe('Traditional to Semantic Conversion', () => {
    it('should convert readFile calls', () => {
      const intent = TraditionalToSemanticConverter.readFileToIntent('/test.txt', { encoding: 'utf8' });
      
      expect(intent.purpose).toBe('read');
      expect(intent.target.path).toBe('/test.txt');
      expect(intent.preferences?.encoding).toBe('utf8');
    });

    it('should convert writeFile calls', () => {
      const intent = TraditionalToSemanticConverter.writeFileToIntent('/test.txt', 'content', { createDirs: true });
      
      expect(intent.purpose).toBe('overwrite');
      expect(intent.target.path).toBe('/test.txt');
      expect(intent.content).toBe('content');
      expect(intent.options?.createPath).toBe(true);
    });

    it('should convert exists calls', () => {
      const intent = TraditionalToSemanticConverter.existsToIntent('/test.txt');
      
      expect(intent.purpose).toBe('verify_exists');
      expect(intent.target.path).toBe('/test.txt');
    });

    it('should convert stat calls', () => {
      const intent = TraditionalToSemanticConverter.statToIntent('/test.txt');
      
      expect(intent.purpose).toBe('metadata');
      expect(intent.target.path).toBe('/test.txt');
      expect(intent.preferences?.includeMetadata).toBe(true);
    });
  });

  describe('Workflow Execution', () => {
    it('should execute multi-step workflows', async () => {
      const workflow = {
        steps: [
          {
            id: 'create',
            operation: 'update' as const,
            intent: {
              purpose: 'create' as const,
              target: { path: '/workflow.txt' },
              content: 'Step 1'
            }
          },
          {
            id: 'append',
            operation: 'update' as const,
            intent: {
              purpose: 'append' as const,
              target: { path: '/workflow.txt' },
              content: ' Step 2'
            },
            dependencies: ['create']
          }
        ]
      };

      const result = await backend.executeWorkflow(workflow);
      
      expect(result.success).toBe(true);
      expect(result.stepResults).toHaveLength(2);
      expect(result.rollbackRequired).toBe(false);

      // Verify final content
      const content = await backend.accessFile({
        purpose: 'read',
        target: { path: '/workflow.txt' }
      });
      expect(content.content).toBe('Step 1 Step 2');
    });

    it('should handle workflow failures with atomic option', async () => {
      const workflow = {
        steps: [
          {
            id: 'create',
            operation: 'update' as const,
            intent: {
              purpose: 'create' as const,
              target: { path: '/atomic-test.txt' },
              content: 'Success'
            }
          },
          {
            id: 'fail',
            operation: 'update' as const,
            intent: {
              purpose: 'append' as const,
              target: { path: '/nonexistent.txt' }, // This will fail
              content: 'Fail'
            }
          }
        ],
        options: { atomic: true }
      };

      const result = await backend.executeWorkflow(workflow);
      
      expect(result.success).toBe(false);
      expect(result.rollbackRequired).toBe(true);
    });
  });

  describe('Natural Language Processing', () => {
    it('should interpret natural language queries', async () => {
      const result = await backend.interpretNaturalLanguage({
        query: 'find files about machine learning'
      });
      
      expect(result.success).toBe(true);
      expect(result.interpretedIntent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle different query types', async () => {
      const queries = [
        'read the config file',
        'create a new document',
        'delete old log files',
        'find all JavaScript files'
      ];

      for (const query of queries) {
        const result = await backend.interpretNaturalLanguage({ query });
        expect(result.success).toBe(true);
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });
});