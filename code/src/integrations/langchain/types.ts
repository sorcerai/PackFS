/**
 * LangChain integration types
 */

import type { FileSystemOptions } from '../../core/types';

export interface LangChainToolConfig extends FileSystemOptions {
  readonly toolName?: string;
  readonly description?: string;
}