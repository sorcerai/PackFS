/**
 * Semantic text chunking for large files
 */

import type { ChunkResult, ProcessorOptions } from './types';

export class SemanticChunker {
  private readonly options: Required<ProcessorOptions>;

  constructor(options: ProcessorOptions = {}) {
    this.options = {
      maxChunkSize: options.maxChunkSize ?? 4000,
      overlapSize: options.overlapSize ?? 200,
      preserveFormatting: options.preserveFormatting ?? true,
      encoding: options.encoding ?? 'utf-8'
    };
  }

  /**
   * Chunk text content semantically
   */
  chunk(content: string): ChunkResult {
    const chunks: string[] = [];
    
    if (content.length <= this.options.maxChunkSize) {
      return {
        chunks: [content],
        metadata: {
          totalSize: content.length,
          chunkCount: 1,
          avgChunkSize: content.length
        }
      };
    }

    // Split by paragraphs first, then by sentences if needed
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length <= this.options.maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          // Add overlap from previous chunk
          const overlap = this.getOverlap(currentChunk);
          currentChunk = overlap + (overlap ? '\n\n' : '') + paragraph;
        } else {
          // Paragraph is too large, split by sentences
          chunks.push(...this.splitLargeParagraph(paragraph));
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return {
      chunks,
      metadata: {
        totalSize: content.length,
        chunkCount: chunks.length,
        avgChunkSize: Math.round(content.length / chunks.length)
      }
    };
  }

  private getOverlap(chunk: string): string {
    if (chunk.length <= this.options.overlapSize) {
      return chunk;
    }
    return chunk.slice(-this.options.overlapSize);
  }

  private splitLargeParagraph(paragraph: string): string[] {
    const sentences = paragraph.split(/[.!?]+\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= this.options.maxChunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          // Single sentence is too large, split by words
          chunks.push(...this.splitBySizeLimit(sentence));
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private splitBySizeLimit(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.options.maxChunkSize, text.length);
      chunks.push(text.slice(start, end));
      const nextStart = end - this.options.overlapSize;
      // Ensure we always make progress
      start = Math.max(nextStart, start + 1);
    }

    return chunks;
  }
}