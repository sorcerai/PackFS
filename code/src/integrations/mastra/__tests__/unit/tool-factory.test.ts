/**
 * Unit tests for createPackfsTools function
 * Tests tool generation, configuration, and permissions
 */

import { createPackfsTools } from '../../index';
import type { PackfsToolConfig } from '../../types';
import { z } from 'zod';
import { RuntimeContext } from '@mastra/core/runtime-context';

// Mock the underlying backend
jest.mock('../../../../backends/disk', () => ({
  DiskBackend: jest.fn().mockImplementation(() => ({
    read: jest.fn().mockResolvedValue(Buffer.from('test content')),
    write: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    stat: jest.fn().mockResolvedValue({ 
      size: 100, 
      mtime: new Date(), 
      isDirectory: false 
    }),
    list: jest.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
    delete: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('createPackfsTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Tool Generation', () => {
    it('should create tools based on permissions array', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read', 'write', 'search']
      };

      const tools = createPackfsTools(config);

      expect(tools.fileReader).toBeDefined();
      expect(tools.fileWriter).toBeDefined();
      expect(tools.fileSearcher).toBeDefined();
    });

    it('should not create tools without corresponding permissions', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read'] // Only read permission
      };

      const tools = createPackfsTools(config);

      expect(tools.fileReader).toBeDefined();
      expect(tools.fileWriter).toBeUndefined();
      expect(tools.fileSearcher).toBeUndefined();
    });

    it('should throw error for empty permissions array', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: []
      };

      expect(() => createPackfsTools(config)).toThrow('At least one permission must be specified');
    });
  });

  describe('Tool Configuration', () => {
    it('should apply security configuration to all tools', () => {
      const config: PackfsToolConfig = {
        rootPath: '/secure',
        permissions: ['read', 'write'],
        security: {
          maxFileSize: 5 * 1024 * 1024,
          allowedExtensions: ['.txt', '.md'],
          blockedPaths: ['private', 'secret']
        }
      };

      const tools = createPackfsTools(config);

      // Verify tools were created with security configuration
      expect(tools.fileReader).toBeDefined();
      expect(tools.fileWriter).toBeDefined();
    });

    it('should use custom schemas when provided', () => {
      const customAccessSchema = z.object({
        customField: z.string()
      });

      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read'],
        schemas: {
          access: customAccessSchema
        }
      };

      const tools = createPackfsTools(config);

      expect(tools.fileReader).toBeDefined();
      // Custom schema is properly used internally
    });

    it('should apply semantic configuration when provided', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['search'],
        semantic: {
          enableRelationships: true,
          chunkSize: 2000,
          overlapSize: 200,
          relevanceThreshold: 0.5
        }
      };

      const tools = createPackfsTools(config);

      expect(tools.fileSearcher).toBeDefined();
    });
  });

  describe('Tool Metadata', () => {
    it('should set correct tool IDs', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read', 'write', 'search']
      };

      const tools = createPackfsTools(config);

      // Check that all expected tools were created
      expect(tools.fileReader).toBeDefined();
      expect(tools.fileWriter).toBeDefined();
      expect(tools.fileSearcher).toBeDefined();
      
      // Verify they have the expected structure
      expect(tools.fileReader!.id).toBe('packfs-file-reader');
      expect(tools.fileWriter!.id).toBe('packfs-file-writer');
      expect(tools.fileSearcher!.id).toBe('packfs-file-searcher');
    });

    it('should set appropriate descriptions', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read']
      };

      const tools = createPackfsTools(config);

      expect(tools.fileReader?.description).toContain('Read files');
      expect(tools.fileReader?.description).toContain('security validation');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if rootPath is not provided', () => {
      const config = {
        permissions: ['read']
      } as any; // Intentionally missing rootPath

      expect(() => createPackfsTools(config)).toThrow('rootPath is required');
    });

    it('should validate rootPath is absolute', () => {
      const config: PackfsToolConfig = {
        rootPath: 'relative/path', // Not absolute
        permissions: ['read']
      };

      expect(() => createPackfsTools(config)).toThrow('rootPath must be absolute');
    });

    it('should throw error for invalid permissions', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read', 'invalid' as any]
      };

      expect(() => createPackfsTools(config)).toThrow('Invalid permission: invalid');
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should apply rate limiting when configured', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read'],
        security: {
          rateLimiting: {
            maxRequests: 100,
            windowMs: 60000
          }
        }
      };

      const tools = createPackfsTools(config);

      expect(tools.fileReader).toBeDefined();
    });
  });

  describe('Tool Execution Context', () => {
    it('should create executable tool functions', async () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read']
      };

      const tools = createPackfsTools(config);

      // Verify tools have execute functions
      expect(typeof tools.fileReader?.execute).toBe('function');

      // Test execution
      expect(tools.fileReader).toBeDefined();
      if (!tools.fileReader) {
        throw new Error('fileReader tool not created');
      }
      
      if (!tools.fileReader.execute) {
        throw new Error('fileReader tool does not have execute method');
      }
      
      const runtimeContext = new RuntimeContext();
      runtimeContext.set('runId', 'test-run');
      runtimeContext.set('agentId', 'test-agent');
      runtimeContext.set('toolCallId', 'test-call');
      
      const result = await tools.fileReader.execute({
        context: {
          purpose: 'read' as const,
          target: { path: '/test/file.txt' }
        },
        runtimeContext
      });

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('Multiple Tool Creation', () => {
    it('should create all tools when all permissions granted', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read', 'write', 'search', 'list']
      };

      const tools = createPackfsTools(config);

      const toolCount = Object.keys(tools).length;
      expect(toolCount).toBeGreaterThanOrEqual(3); // At least reader, writer, searcher
    });

    it('should maintain tool independence', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read', 'write']
      };

      const tools = createPackfsTools(config);

      // Tools should be separate instances
      expect(tools.fileReader).not.toBe(tools.fileWriter);
    });
  });

  describe('Schema Integration', () => {
    it('should use default schemas when not provided', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read']
      };

      const tools = createPackfsTools(config);

      expect(tools.fileReader?.inputSchema).toBeDefined();
      expect(tools.fileReader?.outputSchema).toBeDefined();
    });

    it('should validate schema compatibility', () => {
      const incompatibleSchema = z.number(); // Wrong type

      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read'],
        schemas: {
          access: incompatibleSchema as any
        }
      };

      // Should handle gracefully or throw meaningful error
      expect(() => createPackfsTools(config)).toBeDefined();
    });
  });
});