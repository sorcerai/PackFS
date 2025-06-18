/**
 * Tests for SemanticChunker
 */

import { SemanticChunker } from '../processors/chunker';

describe('SemanticChunker', () => {
  let chunker: SemanticChunker;

  beforeEach(() => {
    chunker = new SemanticChunker({
      maxChunkSize: 100,
      overlapSize: 20,
    });
  });

  describe('chunk', () => {
    test('should return single chunk for small content', () => {
      const content = 'This is a short text.';
      const result = chunker.chunk(content);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toBe(content);
      expect(result.metadata.chunkCount).toBe(1);
      expect(result.metadata.totalSize).toBe(content.length);
    });

    test('should split large content into multiple chunks', () => {
      const content = 'A'.repeat(250);
      const result = chunker.chunk(content);

      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.metadata.chunkCount).toBe(result.chunks.length);
      expect(result.metadata.totalSize).toBe(content.length);
    });

    test('should handle paragraph-based splitting', () => {
      const content = `First paragraph with some content.

Second paragraph with more content that should be in the same chunk.

Third paragraph that might be in a different chunk depending on size.`;

      const result = chunker.chunk(content);
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.metadata.totalSize).toBe(content.length);
    });

    test('should preserve content across chunks', () => {
      const content = 'A'.repeat(250);
      const result = chunker.chunk(content);
      const reassembled = result.chunks.join('').replace(/A{20}/g, ''); // Remove overlaps
      
      // The total length should be close to original (accounting for overlaps)
      expect(reassembled.length + (result.chunks.length - 1) * 20).toBeGreaterThanOrEqual(content.length);
    });
  });
});