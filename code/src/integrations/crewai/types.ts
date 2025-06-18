/**
 * CrewAI integration types
 */

import type { FileSystemOptions } from '../../core/types';

export interface CrewAIToolConfig extends FileSystemOptions {
  readonly toolName?: string;
  readonly description?: string;
}