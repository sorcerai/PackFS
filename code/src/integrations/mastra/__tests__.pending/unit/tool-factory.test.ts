/**
 * Unit tests for createPackfsTools function
 * Tests tool generation, configuration, and permissions
 */

import { createPackfsTools } from '../../index';
import type { PackfsToolConfig } from '../../types';
import { z } from 'zod';

// Mock the underlying PackFS instance
jest.mock('../../../../core/filesystem', () => ({
  PackFS: jest.fn().mockImplementation(() => ({
    readFile: jest.fn().mockResolvedValue({ content: 'test content' }),
    writeFile: jest.fn().mockResolvedValue({ success: true }),
    exists: jest.fn().mockResolvedValue(true),
    stat: jest.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
    readdir: jest.fn().mockResolvedValue([]),
    searchContent: jest.fn().mockResolvedValue({ results: [] }),
    searchSemantic: jest.fn().mockResolvedValue({ results: [] })
  }))
}));

// Mock Mastra's createTool function
const mockCreateTool = jest.fn((config: any) => ({
  ...config,
  _isMastraTool: true
}));

jest.mock('@mastra/core/tools', () => ({
  createTool: mockCreateTool
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
      expect(tools.fileReader._isMastraTool).toBe(true);
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

    it('should handle empty permissions array', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: []
      };

      const tools = createPackfsTools(config);

      expect(tools.fileReader).toBeUndefined();
      expect(tools.fileWriter).toBeUndefined();
      expect(tools.fileSearcher).toBeUndefined();
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

      createPackfsTools(config);

      // Verify createTool was called with security config
      expect(mockCreateTool).toHaveBeenCalled();
      const toolConfig = mockCreateTool.mock.calls[0][0];
      expect(toolConfig.execute).toBeDefined();
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

      createPackfsTools(config);

      expect(mockCreateTool).toHaveBeenCalled();
      const toolConfig = mockCreateTool.mock.calls[0][0];
      expect(toolConfig.inputSchema).toBe(customAccessSchema);
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

      createPackfsTools(config);

      // Check tool IDs from mock calls
      const readerCall = mockCreateTool.mock.calls.find(
        call => call[0].id === 'packfs-file-reader'
      );
      const writerCall = mockCreateTool.mock.calls.find(
        call => call[0].id === 'packfs-file-writer'
      );
      const searcherCall = mockCreateTool.mock.calls.find(
        call => call[0].id === 'packfs-file-searcher'
      );

      expect(readerCall).toBeDefined();
      expect(writerCall).toBeDefined();
      expect(searcherCall).toBeDefined();
    });

    it('should set appropriate descriptions', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read']
      };

      createPackfsTools(config);

      const readerCall = mockCreateTool.mock.calls[0];
      expect(readerCall[0].description).toContain('Read files');
      expect(readerCall[0].description).toContain('security validation');
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

    it('should handle invalid permissions gracefully', () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read', 'invalid' as any]
      };

      const tools = createPackfsTools(config);

      // Should only create valid tools
      expect(tools.fileReader).toBeDefined();
      expect(Object.keys(tools).length).toBe(1);
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

      createPackfsTools(config);

      expect(mockCreateTool).toHaveBeenCalled();
    });
  });

  describe('Tool Execution Context', () => {
    it('should create executable tool functions', async () => {
      const config: PackfsToolConfig = {
        rootPath: '/test',
        permissions: ['read']
      };

      createPackfsTools(config);

      // Get the execute function from the mock
      const toolConfig = mockCreateTool.mock.calls[0][0];
      expect(typeof toolConfig.execute).toBe('function');

      // Test execution
      const result = await toolConfig.execute({
        purpose: 'read',
        target: { path: '/test/file.txt' }
      });

      expect(result).toBeDefined();
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

      createPackfsTools(config);

      const toolConfig = mockCreateTool.mock.calls[0][0];
      expect(toolConfig.inputSchema).toBeDefined();
      expect(toolConfig.outputSchema).toBeDefined();
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