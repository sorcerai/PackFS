/**
 * Zod schemas for Mastra integration input/output validation
 */

import { z } from 'zod';

// Access Intent Schema
export const accessSchema = z.object({
  purpose: z.enum(['read', 'metadata', 'exists']).describe('Type of access operation to perform'),
  target: z.object({
    path: z.string().min(1).describe('Path to the file or directory'),
    encoding: z.string().optional().describe('Text encoding for file content (default: utf8)')
  }).describe('Target file specification'),
  preferences: z.object({
    includeMetadata: z.boolean().optional().describe('Include file metadata in response'),
    maxSize: z.number().int().positive().optional().describe('Maximum file size to read (bytes)'),
    chunkIfLarge: z.boolean().optional().describe('Automatically chunk large files')
  }).optional().describe('Operation preferences')
});

// Discover Intent Schema
export const discoverSchema = z.object({
  purpose: z.enum(['list', 'search_content', 'search_semantic']).describe('Type of discovery operation'),
  target: z.object({
    path: z.string().min(1).describe('Directory path to search within'),
    query: z.string().optional().describe('Search query for content matching'),
    criteria: z.object({
      content: z.string().optional().describe('Content pattern to search for'),
      extension: z.string().optional().describe('File extension filter'),
      modified: z.object({
        after: z.date().optional().describe('Files modified after this date'),
        before: z.date().optional().describe('Files modified before this date')
      }).optional().describe('Date range filter'),
      size: z.object({
        min: z.number().int().nonnegative().optional().describe('Minimum file size (bytes)'),
        max: z.number().int().positive().optional().describe('Maximum file size (bytes)')
      }).optional().describe('File size range filter')
    }).optional().describe('Advanced search criteria')
  }).describe('Search target specification'),
  options: z.object({
    recursive: z.boolean().optional().describe('Search subdirectories recursively'),
    maxResults: z.number().int().positive().optional().describe('Maximum number of results to return'),
    includeContent: z.boolean().optional().describe('Include file content in results'),
    followRelationships: z.boolean().optional().describe('Follow document relationships in semantic search')
  }).optional().describe('Search options')
});

// Update Intent Schema
export const updateSchema = z.object({
  purpose: z.enum(['create', 'update', 'append', 'delete']).describe('Type of update operation'),
  target: z.object({
    path: z.string().min(1).describe('Path where to create/update the file')
  }).describe('Target file specification'),
  content: z.string().optional().describe('File content to write (required for content operations)'),
  options: z.object({
    createPath: z.boolean().optional().describe('Create parent directories if needed'),
    backup: z.boolean().optional().describe('Create backup before updating'),
    atomic: z.boolean().optional().describe('Use atomic write operations'),
    preserveRelationships: z.boolean().optional().describe('Preserve document relationships during updates')
  }).optional().describe('Update options')
}).refine(
  (data) => {
    // Content is required for create, update, and append operations
    const contentRequiredOps = ['create', 'update', 'append'];
    if (contentRequiredOps.includes(data.purpose) && !data.content) {
      return false;
    }
    return true;
  },
  {
    message: "Content is required for create, update, and append operations",
    path: ['content']
  }
);

// Output Schemas

// File operation result schema
export const fileOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  content: z.string().optional().describe('File content (for read operations)'),
  exists: z.boolean().optional().describe('Whether file exists (for exists operations)'),
  metadata: z.object({
    size: z.number().int().nonnegative().describe('File size in bytes'),
    modified: z.string().describe('Last modified date (ISO string)'),
    type: z.enum(['file', 'directory']).describe('Type of filesystem entry'),
    permissions: z.string().optional().describe('File permissions (if available)')
  }).optional().describe('File metadata'),
  error: z.string().optional().describe('Error message if operation failed'),
  executionMetadata: z.object({
    executionTime: z.number().optional().describe('Operation execution time in milliseconds'),
    filesAccessed: z.array(z.string()).optional().describe('Files accessed during operation'),
    operationType: z.string().optional().describe('Type of operation performed')
  }).optional().describe('Operation metadata')
});

// Search operation result schema
export const searchOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  results: z.array(
    z.object({
      path: z.string().describe('File/directory path'),
      type: z.enum(['file', 'directory']).describe('Type of filesystem entry'),
      content: z.string().optional().describe('File content (if requested)'),
      snippet: z.string().optional().describe('Content snippet for search results'),
      relevance: z.number().min(0).max(1).optional().describe('Relevance score for semantic search'),
      metadata: z.object({
        size: z.number().int().nonnegative().describe('File size in bytes'),
        modified: z.string().describe('Last modified date (ISO string)')
      }).optional().describe('File metadata')
    })
  ).describe('Array of found files/directories'),
  totalResults: z.number().int().nonnegative().describe('Total number of results found'),
  error: z.string().optional().describe('Error message if operation failed'),
  executionMetadata: z.object({
    executionTime: z.number().optional().describe('Operation execution time in milliseconds'),
    filesAccessed: z.array(z.string()).optional().describe('Files accessed during operation'),
    operationType: z.string().optional().describe('Type of operation performed')
  }).optional().describe('Operation metadata')
});

// Update operation result schema
export const updateOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  created: z.boolean().optional().describe('Whether file was created (vs updated)'),
  deleted: z.boolean().optional().describe('Whether file was deleted'),
  path: z.string().optional().describe('Path of the modified file'),
  backupPath: z.string().optional().describe('Backup file path (if backup was created)'),
  error: z.string().optional().describe('Error message if operation failed'),
  executionMetadata: z.object({
    executionTime: z.number().optional().describe('Operation execution time in milliseconds'),
    filesAccessed: z.array(z.string()).optional().describe('Files accessed during operation'),
    operationType: z.string().optional().describe('Type of operation performed')
  }).optional().describe('Operation metadata')
});

// Schema map for easy access
export const schemas = {
  access: accessSchema,
  discover: discoverSchema,
  update: updateSchema
} as const;

export const outputSchemas = {
  file: fileOutputSchema,
  search: searchOutputSchema,
  update: updateOutputSchema
} as const;

// Type inference helpers
export type AccessInput = z.infer<typeof accessSchema>;
export type DiscoverInput = z.infer<typeof discoverSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;

export type FileOutput = z.infer<typeof fileOutputSchema>;
export type SearchOutput = z.infer<typeof searchOutputSchema>;
export type UpdateOutput = z.infer<typeof updateOutputSchema>;