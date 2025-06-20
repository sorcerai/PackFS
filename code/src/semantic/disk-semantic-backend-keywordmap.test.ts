/**
 * Test for keywordMap array validation fix
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DiskSemanticBackend } from './disk-semantic-backend';

describe('DiskSemanticBackend - keywordMap validation', () => {
  let backend: DiskSemanticBackend;
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(tmpdir(), `packfs-keywordmap-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await backend?.cleanup();
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle corrupted keywordMap entries when loading index', async () => {
    // Create a corrupted index file with non-array keywordMap entries
    const indexPath = join(testDir, '.packfs', 'semantic-index.json');
    await fs.mkdir(join(testDir, '.packfs'), { recursive: true });
    
    const corruptedIndex = {
      version: '1.0.0',
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      entries: {},
      keywordMap: {
        'test': 'not-an-array', // This should be an array
        'javascript': 123, // This should be an array
        'valid': ['file1.js', 'file2.js'] // This is valid
      }
    };
    
    await fs.writeFile(indexPath, JSON.stringify(corruptedIndex, null, 2));
    
    // Create backend and initialize (should fix the corrupted entries)
    backend = new DiskSemanticBackend(testDir);
    await backend.initialize();
    
    // Try to add a file to the keyword map - should not throw
    await fs.writeFile(join(testDir, 'test.js'), 'const test = "hello";');
    
    // This would previously throw "includes is not a function"
    await expect(backend.discoverFiles({
      purpose: 'list',
      target: { path: '.' }
    })).resolves.not.toThrow();
  });

  it('should handle adding to keywordMap when entry becomes corrupted at runtime', async () => {
    backend = new DiskSemanticBackend(testDir);
    await backend.initialize();
    
    // Create a test file
    await fs.writeFile(join(testDir, 'test.js'), 'const test = "hello world";');
    
    // Force update the index to trigger keyword extraction
    await backend.discoverFiles({
      purpose: 'list',
      target: { path: '.' }
    });
    
    // Manually corrupt the keywordMap (simulating runtime corruption)
    // This is a bit hacky but tests the defensive programming
    const indexPath = join(testDir, '.packfs', 'semantic-index.json');
    const indexData = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexData);
    
    // Corrupt a keyword entry
    if (index.keywordMap && Object.keys(index.keywordMap).length > 0) {
      const firstKeyword = Object.keys(index.keywordMap)[0];
      if (firstKeyword) {
        index.keywordMap[firstKeyword] = 'corrupted-not-array';
      }
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    
    // Re-initialize to load corrupted index
    const backend2 = new DiskSemanticBackend(testDir);
    await backend2.initialize();
    
    // Try to add another file - should handle the corruption gracefully
    await fs.writeFile(join(testDir, 'test2.js'), 'const another = "test";');
    
    await expect(backend2.discoverFiles({
      purpose: 'list',
      target: { path: '.' }
    })).resolves.not.toThrow();
    
    await backend2.cleanup();
  });
});