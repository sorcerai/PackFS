/**
 * Comprehensive tests for framework integrations
 */

import { MemorySemanticBackend } from '../semantic/memory-semantic-backend';
import type { BaseIntegrationConfig } from './types';

// Mastra integration tests
import { 
  MastraSemanticFilesystemTool, 
  createMastraSemanticFilesystemTool,
  createMastraSemanticToolSuite,
  type MastraIntegrationConfig 
} from './mastra';

// LangChain integration tests
import { 
  createLangChainSemanticFilesystemTool,
  createLangChainSemanticToolSet,
  type LangChainIntegrationConfig 
} from './langchain-js';

// LlamaIndex integration tests
import { 
  createLlamaIndexSemanticFilesystemTool,
  createLlamaIndexSemanticToolSpec,
  createLlamaIndexSemanticToolSuite,
  type LlamaIndexIntegrationConfig 
} from './llamaindex-ts';

// KaibanJS integration tests
import { 
  createKaibanSemanticFilesystemTool,
  createKaibanFileSystemActions,
  createKaibanMultiAgentFileCoordinator,
  type KaibanIntegrationConfig 
} from './kaiban-js';

describe('Framework Integrations', () => {
  let filesystem: MemorySemanticBackend;
  let baseConfig: BaseIntegrationConfig;

  beforeEach(async () => {
    filesystem = new MemorySemanticBackend();
    baseConfig = {
      filesystem,
      workingDirectory: '/test',
      security: {
        allowedPaths: ['/test/**'],
        maxFileSize: 1024 * 1024,
        allowedExtensions: ['txt', 'md', 'json', 'js', 'ts']
      },
      performance: {
        maxResults: 50,
        timeoutMs: 5000,
        enableCaching: true
      }
    };

    // Set up test files
    await filesystem.updateContent({
      purpose: 'create',
      target: { path: '/test/readme.md' },
      content: '# Test Project\nThis is a test project for framework integrations.'
    });

    await filesystem.updateContent({
      purpose: 'create',
      target: { path: '/test/config.json' },
      content: '{"name": "test-project", "version": "1.0.0"}'
    });

    await filesystem.updateContent({
      purpose: 'create',
      target: { path: '/test/notes.txt' },
      content: 'Important notes about the project setup and configuration.'
    });
  });

  describe('Mastra Integration', () => {
    let mastraConfig: MastraIntegrationConfig;
    let tool: any;

    beforeEach(() => {
      mastraConfig = {
        ...baseConfig,
        mastra: {
          autoRetry: true,
          maxRetries: 3,
          enableTracing: true,
          agentContext: { agentId: 'test-agent', role: 'developer' }
        }
      };
      tool = createMastraSemanticFilesystemTool(mastraConfig);
    });

    it('should create Mastra tool with correct structure', () => {
      expect(tool.name).toBe('semantic_filesystem');
      expect(tool.description).toContain('intelligent file operations');
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.execute).toBe('function');
    });

    it('should execute natural language queries', async () => {
      const result = await tool.execute({
        naturalLanguageQuery: 'read the README file'
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('Test Project');
      expect(result.metadata.operationType).toBe('natural_language');
    });

    it('should execute structured operations', async () => {
      const result = await tool.execute({
        operation: 'access',
        purpose: 'read',
        target: { path: '/test/config.json' }
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('test-project');
    });

    it('should handle file creation with natural language', async () => {
      const result = await tool.execute({
        naturalLanguageQuery: 'create a file called todo.txt with my daily tasks'
      });

      expect(result.success).toBe(true);
      expect(result.data.created).toBe(true);
    });

    it('should validate parameters correctly', () => {
      const adapter = new MastraSemanticFilesystemTool();
      
      const validParams = { naturalLanguageQuery: 'read file' };
      const invalidParams = {};
      
      expect(adapter.validateParameters(validParams).valid).toBe(true);
      expect(adapter.validateParameters(invalidParams).valid).toBe(false);
    });

    it('should create tool suite with specialized tools', () => {
      const suite = createMastraSemanticToolSuite(mastraConfig);
      
      expect(suite.fileReader.name).toBe('read_file');
      expect(suite.fileWriter.name).toBe('write_file');
      expect(suite.fileSearcher.name).toBe('search_files');
      expect(suite.fileOrganizer.name).toBe('organize_files');
    });

    it('should execute file search through tool suite', async () => {
      const suite = createMastraSemanticToolSuite(mastraConfig);
      
      const result = await suite.fileSearcher.execute({
        query: 'find configuration files'
      });

      expect(result.success).toBe(true);
      expect(result.data.files.some((f: any) => f.path.includes('config.json'))).toBe(true);
    });
  });

  describe('LangChain.js Integration', () => {
    let langchainConfig: LangChainIntegrationConfig;
    let tool: any;

    beforeEach(() => {
      langchainConfig = {
        ...baseConfig,
        langchain: {
          verbose: true,
          metadata: { framework: 'langchain-js' },
          callbacks: []
        }
      };
      tool = createLangChainSemanticFilesystemTool(langchainConfig);
    });

    it('should create LangChain tool with correct structure', () => {
      expect(tool.name).toBe('semantic_filesystem');
      expect(tool.description).toContain('intelligent file operations');
      expect(tool.schema).toBeDefined();
      expect(typeof tool.func).toBe('function');
    });

    it('should handle string input (natural language)', async () => {
      const result = await tool.func('read the README file');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Test Project');
    });

    it('should handle object input (structured)', async () => {
      const result = await tool.func({
        query: 'read the config file',
        operation: 'read',
        path: '/test/config.json'
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('test-project');
    });

    it('should handle JSON string input', async () => {
      const input = JSON.stringify({
        query: 'create a notes file',
        operation: 'write',
        path: '/test/new-notes.txt',
        content: 'New notes content'
      });

      const result = await tool.func(input);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('created');
    });

    it('should format responses appropriately for LangChain', async () => {
      const result = await tool.func({
        query: 'find all files',
        operation: 'search',
        pattern: '*'
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('Found');
      expect(result).toContain('files:');
    });

    it('should create specialized tool set', () => {
      const toolSet = createLangChainSemanticToolSet(langchainConfig);
      
      expect(toolSet.fileReader.name).toBe('read_file');
      expect(toolSet.fileWriter.name).toBe('write_file');
      expect(toolSet.fileSearcher.name).toBe('search_files');
      expect(toolSet.fileManager.name).toBe('manage_files');
    });

    it('should execute file operations through specialized tools', async () => {
      const toolSet = createLangChainSemanticToolSet(langchainConfig);
      
      const writeResult = await toolSet.fileWriter.func({
        path: '/test/langchain-test.txt',
        content: 'LangChain integration test',
        mode: 'create'
      });

      expect(writeResult).toContain('created successfully');

      const readResult = await toolSet.fileReader.func({
        path: '/test/langchain-test.txt'
      });

      expect(readResult).toContain('LangChain integration test');
    });
  });

  describe('LlamaIndex.TS Integration', () => {
    let llamaConfig: LlamaIndexIntegrationConfig;
    let tool: any;

    beforeEach(() => {
      llamaConfig = {
        ...baseConfig,
        llamaIndex: {
          verbose: true,
          metadata: { framework: 'llamaindex-ts' },
          functionCalling: {
            autoCall: true,
            maxDepth: 3
          }
        }
      };
      tool = createLlamaIndexSemanticFilesystemTool(llamaConfig);
    });

    it('should create LlamaIndex tool with correct structure', () => {
      expect(tool.metadata.name).toBe('semantic_filesystem');
      expect(tool.metadata.description).toContain('Intelligent file system operations');
      expect(tool.metadata.parameters).toBeDefined();
      expect(typeof tool.call).toBe('function');
    });

    it('should execute natural language queries', async () => {
      const result = await tool.call({
        action: 'natural_query',
        query: 'read the README file'
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('Test Project');
    });

    it('should execute structured actions', async () => {
      const result = await tool.call({
        action: 'read',
        path: '/test/config.json'
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('test-project');
    });

    it('should handle file search with type filtering', async () => {
      const result = await tool.call({
        action: 'search',
        searchTerm: 'configuration',
        options: {
          fileTypes: ['json'],
          maxResults: 10
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.files.some((f: any) => f.path.includes('config.json'))).toBe(true);
    });

    it('should create ToolSpec format', () => {
      const toolSpec = createLlamaIndexSemanticToolSpec(llamaConfig);
      
      expect(toolSpec.name).toBe('semantic_filesystem');
      expect(toolSpec.description).toContain('Intelligent file system operations');
      expect(toolSpec.parameters).toBeDefined();
      expect(typeof toolSpec.fn).toBe('function');
    });

    it('should create specialized tool suite', () => {
      const suite = createLlamaIndexSemanticToolSuite(llamaConfig);
      
      expect(suite.fileReader.metadata.name).toBe('read_file');
      expect(suite.fileWriter.metadata.name).toBe('write_file');
      expect(suite.fileSearcher.metadata.name).toBe('search_files');
      expect(suite.fileManager.metadata.name).toBe('manage_files');
    });

    it('should execute operations through specialized tools', async () => {
      const suite = createLlamaIndexSemanticToolSuite(llamaConfig);
      
      const writeResult = await suite.fileWriter.call({
        path: '/test/llamaindex-test.txt',
        content: 'LlamaIndex integration test',
        mode: 'create'
      });

      expect(writeResult.path).toBe('/test/llamaindex-test.txt');
      expect(writeResult.created).toBe(true);

      const readResult = await suite.fileReader.call({
        query: '/test/llamaindex-test.txt'
      });

      expect(readResult.content).toContain('LlamaIndex integration test');
    });

    it('should handle file management operations', async () => {
      const suite = createLlamaIndexSemanticToolSuite(llamaConfig);
      
      // Create a file first
      await suite.fileWriter.call({
        path: '/test/to-delete.txt',
        content: 'This will be deleted'
      });

      // Delete the file
      const deleteResult = await suite.fileManager.call({
        action: 'delete',
        source: '/test/to-delete.txt'
      });

      expect(deleteResult.filesDeleted).toBe(1);
    });
  });

  describe('KaibanJS Integration', () => {
    let kaibanConfig: KaibanIntegrationConfig;
    let tool: any;

    beforeEach(() => {
      kaibanConfig = {
        ...baseConfig,
        kaiban: {
          agentId: 'test-agent-001',
          taskContext: { task: 'file-operations', team: 'dev' },
          enableStatePersistence: true,
          stateHandlers: {
            onBeforeOperation: jest.fn(),
            onAfterOperation: jest.fn(),
            onError: jest.fn()
          }
        }
      };
      tool = createKaibanSemanticFilesystemTool(kaibanConfig);
    });

    it('should create KaibanJS tool with correct structure', () => {
      expect(tool.name).toBe('semantic_filesystem');
      expect(tool.description).toContain('Multi-agent compatible');
      expect(tool.metadata.agentId).toBe('test-agent-001');
      expect(tool.metadata.category).toBe('filesystem');
      expect(typeof tool.handler).toBe('function');
    });

    it('should execute with agent context', async () => {
      const context = { agentId: 'test-agent-001', taskId: 'task-123' };
      
      const result = await tool.handler({
        action: 'natural_query',
        query: 'read the README file'
      }, context);

      expect(result.success).toBe(true);
      expect(result.metadata.agentId).toBe('test-agent-001');
      expect(result.data.content).toContain('Test Project');
    });

    it('should handle collaborative operations', async () => {
      const result = await tool.handler({
        action: 'write',
        path: '/test/shared-notes.md',
        content: 'Shared team notes',
        collaboration: {
          shareWith: ['agent-002', 'agent-003'],
          notifyAgents: true,
          taskId: 'collaboration-task'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.collaboration).toBeDefined();
      expect(result.data.collaboration.sharedWith).toContain('agent-002');
      expect(result.data.collaboration.notified).toBe(true);
    });

    it('should call state handlers', async () => {
      const handlers = kaibanConfig.kaiban!.stateHandlers!;
      
      await tool.handler({
        action: 'read',
        path: '/test/readme.md'
      });

      expect(handlers.onBeforeOperation).toHaveBeenCalledWith('read', expect.any(Object));
      expect(handlers.onAfterOperation).toHaveBeenCalledWith('read', expect.any(Object));
    });

    it('should call error handler on failure', async () => {
      const handlers = kaibanConfig.kaiban!.stateHandlers!;
      
      try {
        await tool.handler({
          action: 'read',
          path: '/nonexistent/file.txt'
        });
      } catch (error) {
        expect(handlers.onError).toHaveBeenCalledWith('read', expect.any(Error));
      }
    });

    it('should create task actions', () => {
      const actions = createKaibanFileSystemActions(kaibanConfig);
      
      const readAction = actions.readFile('/test/readme.md');
      expect(readAction.type).toBe('FILESYSTEM_READ');
      expect(readAction.payload.path).toBe('/test/readme.md');
      expect(readAction.meta?.agentId).toBe('test-agent-001');
      
      const writeAction = actions.writeFile('/test/new.txt', 'content');
      expect(writeAction.type).toBe('FILESYSTEM_WRITE');
      expect(writeAction.payload.content).toBe('content');
    });

    it('should create multi-agent coordinator', async () => {
      const coordinator = createKaibanMultiAgentFileCoordinator(kaibanConfig);
      
      expect(coordinator.name).toBe('multi_agent_file_coordinator');
      expect(coordinator.metadata?.category).toBe('coordination');
      
      const result = await coordinator.handler({
        operation: 'lock',
        path: '/test/shared-resource.txt',
        agentIds: ['agent-001', 'agent-002'],
        priority: 1,
        taskId: 'coordination-task'
      });

      expect(result.success).toBe(true);
      expect(result.coordination.operation).toBe('lock');
      expect(result.coordination.coordinatingAgent).toBe('test-agent-001');
    });

    it('should handle natural language with agent context', async () => {
      const result = await tool.handler({
        query: 'create a shared file for team coordination'
      }, { 
        agentId: 'test-agent-001', 
        taskId: 'team-task' 
      });

      expect(result.success).toBe(true);
      expect(result.metadata.agentId).toBe('test-agent-001');
      expect(result.metadata.taskId).toBe('team-task');
    });
  });

  describe('Cross-Framework Compatibility', () => {
    it('should handle same operations across all frameworks', async () => {
      const mastraConfig: MastraIntegrationConfig = { ...baseConfig };
      const langchainConfig: LangChainIntegrationConfig = { ...baseConfig };
      const llamaConfig: LlamaIndexIntegrationConfig = { ...baseConfig };
      const kaibanConfig: KaibanIntegrationConfig = { ...baseConfig };

      const mastraTool = createMastraSemanticFilesystemTool(mastraConfig);
      const langchainTool = createLangChainSemanticFilesystemTool(langchainConfig);
      const llamaTool = createLlamaIndexSemanticFilesystemTool(llamaConfig);
      const kaibanTool = createKaibanSemanticFilesystemTool(kaibanConfig);

      const testQuery = 'read the configuration file';

      // Test Mastra
      const mastraResult = await mastraTool.execute({
        naturalLanguageQuery: testQuery
      });
      expect(mastraResult.success).toBe(true);

      // Test LangChain
      const langchainResult = await langchainTool.func(testQuery);
      expect(langchainResult).toContain('test-project');

      // Test LlamaIndex
      const llamaResult = await llamaTool.call({
        action: 'natural_query',
        query: testQuery
      });
      expect(llamaResult.success).toBe(true);

      // Test KaibanJS
      const kaibanResult = await kaibanTool.handler({
        query: testQuery
      });
      expect(kaibanResult.success).toBe(true);
    });

    it('should maintain consistent behavior across frameworks', async () => {
      const configs = {
        mastra: { ...baseConfig } as MastraIntegrationConfig,
        langchain: { ...baseConfig } as LangChainIntegrationConfig,
        llama: { ...baseConfig } as LlamaIndexIntegrationConfig,
        kaiban: { ...baseConfig } as KaibanIntegrationConfig
      };

      // Create the same file through each framework
      const testContent = 'Cross-framework test content';
      
      const mastraTool = createMastraSemanticFilesystemTool(configs.mastra);
      await mastraTool.execute({
        naturalLanguageQuery: `create a file called mastra-test.txt with content "${testContent}"`
      });

      const langchainTool = createLangChainSemanticFilesystemTool(configs.langchain);
      await langchainTool.func({
        operation: 'write',
        path: '/test/langchain-test.txt',
        content: testContent
      });

      const llamaTool = createLlamaIndexSemanticFilesystemTool(configs.llama);
      await llamaTool.call({
        action: 'write',
        path: '/test/llama-test.txt',
        content: testContent
      });

      const kaibanTool = createKaibanSemanticFilesystemTool(configs.kaiban);
      await kaibanTool.handler({
        action: 'write',
        path: '/test/kaiban-test.txt',
        content: testContent
      });

      // Verify all files were created with same content
      const searchResult = await filesystem.discoverFiles({
        purpose: 'search_content',
        target: { semanticQuery: 'Cross-framework test content' }
      });

      expect(searchResult.files.length).toBe(4);
      expect(searchResult.files.every(f => f.path.includes('test.txt'))).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid parameters gracefully across frameworks', async () => {
      const configs = {
        mastra: { ...baseConfig } as MastraIntegrationConfig,
        langchain: { ...baseConfig } as LangChainIntegrationConfig,
        llama: { ...baseConfig } as LlamaIndexIntegrationConfig,
        kaiban: { ...baseConfig } as KaibanIntegrationConfig
      };

      const mastraTool = createMastraSemanticFilesystemTool(configs.mastra);
      const mastraResult = await mastraTool.execute({});
      expect(mastraResult.success).toBe(false);

      const langchainTool = createLangChainSemanticFilesystemTool(configs.langchain);
      const langchainResult = await langchainTool.func({});
      expect(langchainResult).toContain('Error');

      const llamaTool = createLlamaIndexSemanticFilesystemTool(configs.llama);
      try {
        await llamaTool.call({});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      const kaibanTool = createKaibanSemanticFilesystemTool(configs.kaiban);
      const kaibanResult = await kaibanTool.handler({});
      expect(kaibanResult.success).toBe(false);
    });

    it('should handle nonexistent files consistently', async () => {
      const configs = {
        mastra: { ...baseConfig } as MastraIntegrationConfig,
        langchain: { ...baseConfig } as LangChainIntegrationConfig,
        llama: { ...baseConfig } as LlamaIndexIntegrationConfig,
        kaiban: { ...baseConfig } as KaibanIntegrationConfig
      };

      const nonexistentPath = '/test/nonexistent-file.txt';

      const mastraTool = createMastraSemanticFilesystemTool(configs.mastra);
      const mastraResult = await mastraTool.execute({
        operation: 'access',
        purpose: 'read',
        target: { path: nonexistentPath }
      });
      expect(mastraResult.success).toBe(false);

      const langchainTool = createLangChainSemanticFilesystemTool(configs.langchain);
      const langchainResult = await langchainTool.func({
        operation: 'read',
        path: nonexistentPath
      });
      expect(langchainResult).toContain('Error');

      const llamaTool = createLlamaIndexSemanticFilesystemTool(configs.llama);
      try {
        await llamaTool.call({
          action: 'read',
          path: nonexistentPath
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      const kaibanTool = createKaibanSemanticFilesystemTool(configs.kaiban);
      const kaibanResult = await kaibanTool.handler({
        action: 'read',
        path: nonexistentPath
      });
      expect(kaibanResult.success).toBe(false);
    });
  });
});