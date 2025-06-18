/**
 * Text content processor
 */

import type { ContentProcessor } from './types';

export class TextProcessor implements ContentProcessor {
  private readonly textExtensions = [
    'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'csv',
    'js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html'
  ];

  async process(content: string | Buffer, _filename?: string): Promise<string> {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    
    // Basic text processing - normalize line endings and trim
    return text.replace(/\r\n/g, '\n').trim();
  }

  canProcess(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? this.textExtensions.includes(ext) : false;
  }
}