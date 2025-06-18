/**
 * AutoGPT integration types
 */

import type { FileSystemOptions } from '../../core/types';

export interface AutoGPTPluginConfig extends FileSystemOptions {
  readonly pluginName?: string;
  readonly version?: string;
}