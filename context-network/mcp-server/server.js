#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GraphEnhancedContextManager } from './src/graph-enhanced-context.js';
import { ContextWindowManager } from './src/context-window-manager.js';

export class GeneralContextNetworkServer {
  constructor() {
    this.server = new Server(
      {
        name: 'general-context-network',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.contextManager = new GraphEnhancedContextManager();
    this.contextWindowManager = new ContextWindowManager();
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'record_conversation_context',
            description: 'Record important context from current conversation',
            inputSchema: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Brief summary of conversation context'
                },
                keyPoints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key points or decisions from conversation'
                },
                topic: {
                  type: 'string',
                  description: 'Main topic or project area'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization'
                },
                relatedConversations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'IDs of related conversations'
                }
              },
              required: ['summary', 'topic']
            }
          },
          {
            name: 'query_conversation_history',
            description: 'Search and retrieve past conversation context',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for conversation history'
                },
                topic: {
                  type: 'string',
                  description: 'Filter by specific topic'
                },
                timeframe: {
                  type: 'string',
                  enum: ['last_week', 'last_month', 'last_3_months', 'all_time'],
                  description: 'Time range for search'
                },
                limit: {
                  type: 'number',
                  default: 10,
                  description: 'Maximum number of results'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'update_user_preferences',
            description: 'Store or update user preferences and coding style',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['coding_style', 'tools', 'workflow', 'communication', 'project_structure'],
                  description: 'Category of preference'
                },
                key: {
                  type: 'string',
                  description: 'Preference key identifier'
                },
                value: {
                  type: 'string',
                  description: 'Preference value'
                },
                description: {
                  type: 'string',
                  description: 'Description of this preference'
                }
              },
              required: ['category', 'key', 'value']
            }
          },
          {
            name: 'get_user_preferences',
            description: 'Retrieve user preferences',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['coding_style', 'tools', 'workflow', 'communication', 'project_structure'],
                  description: 'Category of preferences to retrieve'
                },
                key: {
                  type: 'string',
                  description: 'Specific preference key (optional)'
                }
              }
            }
          },
          {
            name: 'record_project_context',
            description: 'Record project-specific context and decisions',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'Name of the project'
                },
                context: {
                  type: 'string',
                  description: 'Project context or decision'
                },
                type: {
                  type: 'string',
                  enum: ['decision', 'architecture', 'requirement', 'issue', 'solution'],
                  description: 'Type of project context'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization'
                },
                relatedItems: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Related project items'
                }
              },
              required: ['projectName', 'context', 'type']
            }
          },
          {
            name: 'get_project_context',
            description: 'Retrieve project-specific context',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'Name of the project'
                },
                type: {
                  type: 'string',
                  enum: ['decision', 'architecture', 'requirement', 'issue', 'solution'],
                  description: 'Type of context to retrieve'
                },
                query: {
                  type: 'string',
                  description: 'Search query within project context'
                }
              },
              required: ['projectName']
            }
          },
          {
            name: 'create_context_thread',
            description: 'Create or update a context thread linking related conversations',
            inputSchema: {
              type: 'object',
              properties: {
                threadId: {
                  type: 'string',
                  description: 'Thread identifier (auto-generated if not provided)'
                },
                title: {
                  type: 'string',
                  description: 'Thread title'
                },
                description: {
                  type: 'string',
                  description: 'Thread description'
                },
                conversationIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Conversation IDs to link to this thread'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for thread categorization'
                }
              },
              required: ['title', 'conversationIds']
            }
          },
          {
            name: 'get_context_threads',
            description: 'Retrieve context threads',
            inputSchema: {
              type: 'object',
              properties: {
                threadId: {
                  type: 'string',
                  description: 'Specific thread ID to retrieve'
                },
                query: {
                  type: 'string',
                  description: 'Search query for threads'
                },
                tag: {
                  type: 'string',
                  description: 'Filter by tag'
                }
              }
            }
          },
          {
            name: 'record_decision',
            description: 'Record important decisions for future reference',
            inputSchema: {
              type: 'object',
              properties: {
                decision: {
                  type: 'string',
                  description: 'The decision made'
                },
                context: {
                  type: 'string',
                  description: 'Context behind the decision'
                },
                alternatives: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Alternative options considered'
                },
                impact: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Expected impact of decision'
                },
                project: {
                  type: 'string',
                  description: 'Related project (optional)'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization'
                }
              },
              required: ['decision', 'context']
            }
          },
          {
            name: 'get_decisions',
            description: 'Retrieve recorded decisions',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for decisions'
                },
                project: {
                  type: 'string',
                  description: 'Filter by project'
                },
                impact: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Filter by impact level'
                },
                timeframe: {
                  type: 'string',
                  enum: ['last_week', 'last_month', 'last_3_months', 'all_time'],
                  description: 'Time range for search'
                }
              }
            }
          },
          {
            name: 'record_context_window',
            description: 'Record conversation context window with automatic compression and semantic indexing',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Context content to store'
                },
                conversationId: {
                  type: 'string',
                  description: 'ID of the conversation this context belongs to'
                },
                summary: {
                  type: 'string',
                  description: 'Brief summary of the context'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization'
                },
                metadata: {
                  type: 'object',
                  description: 'Additional metadata for the context window'
                }
              },
              required: ['content']
            }
          },
          {
            name: 'query_context_semantic',
            description: 'Search context windows using natural language queries with semantic understanding',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language search query'
                },
                maxResults: {
                  type: 'number',
                  default: 10,
                  description: 'Maximum number of results to return'
                },
                includeCompressed: {
                  type: 'boolean',
                  default: true,
                  description: 'Whether to include compressed context windows'
                },
                minRelevance: {
                  type: 'number',
                  default: 0.5,
                  description: 'Minimum relevance score for results'
                },
                conversationId: {
                  type: 'string',
                  description: 'Filter by specific conversation ID'
                },
                timeRange: {
                  type: 'string',
                  enum: ['today', 'week', 'month'],
                  description: 'Filter by time range'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'compress_old_context',
            description: 'Run compression maintenance to optimize storage and compress old context windows',
            inputSchema: {
              type: 'object',
              properties: {
                ageDays: {
                  type: 'number',
                  default: 2,
                  description: 'Compress windows older than this many days'
                },
                method: {
                  type: 'string',
                  enum: ['gzip', 'brotli'],
                  default: 'gzip',
                  description: 'Compression method to use'
                },
                forceRecompression: {
                  type: 'boolean',
                  default: false,
                  description: 'Force recompression of already compressed windows'
                }
              }
            }
          },
          {
            name: 'get_context_storage_stats',
            description: 'Get statistics about context window storage and compression efficiency',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'expand_context_window',
            description: 'Retrieve and decompress a specific context window by ID',
            inputSchema: {
              type: 'object',
              properties: {
                windowId: {
                  type: 'string',
                  description: 'ID of the context window to retrieve'
                },
                includeMetadata: {
                  type: 'boolean',
                  default: true,
                  description: 'Whether to include metadata in the response'
                }
              },
              required: ['windowId']
            }
          },
          {
            name: 'query_graph_enhanced',
            description: 'Query context using graph traversal and semantic clustering',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language query'
                },
                maxHops: {
                  type: 'number',
                  default: 2,
                  description: 'Maximum graph traversal hops'
                },
                limit: {
                  type: 'number',
                  default: 10,
                  description: 'Maximum results to return'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_entity_graph',
            description: 'Get entities and relationships for a specific entity or context',
            inputSchema: {
              type: 'object',
              properties: {
                entityName: {
                  type: 'string',
                  description: 'Entity name to explore'
                },
                entityType: {
                  type: 'string',
                  description: 'Entity type (project, tool, file, etc.)'
                },
                maxHops: {
                  type: 'number',
                  default: 2,
                  description: 'Maximum relationship hops to traverse'
                }
              },
              required: ['entityName', 'entityType']
            }
          },
          {
            name: 'get_graph_stats',
            description: 'Get statistics about the knowledge graph',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'refresh_clusters',
            description: 'Manually trigger semantic clustering update',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'record_conversation_context':
            result = await this.contextManager.recordConversationContext(args);
            break;

          case 'query_conversation_history':
            result = await this.contextManager.queryConversationHistory(args);
            break;

          case 'update_user_preferences':
            result = await this.contextManager.updateUserPreferences(args);
            break;

          case 'get_user_preferences':
            result = await this.contextManager.getUserPreferences(args);
            break;

          case 'record_project_context':
            result = await this.contextManager.recordProjectContext(args);
            break;

          case 'get_project_context':
            result = await this.contextManager.getProjectContext(args);
            break;

          case 'create_context_thread':
            result = await this.contextManager.createContextThread(args);
            break;

          case 'get_context_threads':
            result = await this.contextManager.getContextThreads(args);
            break;

          case 'record_decision':
            result = await this.contextManager.recordDecision(args);
            break;

          case 'get_decisions':
            result = await this.contextManager.getDecisions(args);
            break;

          case 'record_context_window':
            result = await this.contextWindowManager.recordContextWindow(
              args.content,
              {
                conversationId: args.conversationId,
                summary: args.summary,
                tags: args.tags,
                ...args.metadata
              }
            );
            break;

          case 'query_context_semantic':
            result = await this.contextWindowManager.queryContextSemantic(args.query, {
              maxResults: args.maxResults,
              includeCompressed: args.includeCompressed,
              minRelevance: args.minRelevance,
              conversationId: args.conversationId,
              timeRange: args.timeRange
            });
            break;

          case 'compress_old_context':
            result = await this.contextWindowManager.runCompressionMaintenance();
            break;

          case 'get_context_storage_stats':
            result = await this.contextWindowManager.getStorageStats();
            break;

          case 'expand_context_window':
            // Find the window first
            const windowIndex = await this.contextWindowManager.getStorageStats();
            // This is a simplified implementation - in practice, we'd need to track window locations
            result = { 
              error: 'Not implemented yet - use query_context_semantic to find and retrieve windows',
              suggestion: 'Use query_context_semantic with a specific query to find your window'
            };
            break;

          case 'query_graph_enhanced':
            result = await this.contextManager.queryWithGraph(args.query, {
              maxHops: args.maxHops,
              limit: args.limit
            });
            break;

          case 'get_entity_graph':
            const entity = { type: args.entityType, name: args.entityName };
            const paths = await this.contextManager.traverseGraph(entity, args.maxHops);
            result = {
              entity,
              relationships: paths,
              totalPaths: paths.length
            };
            break;

          case 'get_graph_stats':
            result = this.contextManager.getGraphStats();
            break;

          case 'refresh_clusters':
            result = await this.contextManager.clusterEntities();
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error.message}`
        );
      }
    });
  }

  async run() {
    await this.contextManager.initialize();
    // Context window manager initializes itself in constructor
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('General Context Network MCP Server running on stdio with PackFS context windows');
  }
}

const server = new GeneralContextNetworkServer();
server.run().catch(console.error);