/**
 * Content processor type definitions
 */

export interface ContentProcessor {
  /**
   * Process file content
   */
  process(content: string | Buffer, filename?: string): Promise<string>;

  /**
   * Check if processor can handle the given file type
   */
  canProcess(filename: string): boolean;
}

export interface ProcessorOptions {
  readonly maxChunkSize?: number;
  readonly overlapSize?: number;
  readonly preserveFormatting?: boolean;
  readonly encoding?: BufferEncoding;
}

export interface ChunkResult {
  readonly chunks: string[];
  readonly metadata: {
    readonly totalSize: number;
    readonly chunkCount: number;
    readonly avgChunkSize: number;
  };
}