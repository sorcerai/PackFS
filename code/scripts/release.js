#!/usr/bin/env node

/**
 * Comprehensive release script for PackFS
 * Handles the complete release process in the correct order
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCommand(command, description, options = {}) {
  console.log(`\n🔄 ${description}...`);
  try {
    const result = execSync(command, { stdio: options.capture ? 'pipe' : 'inherit', ...options });
    console.log(`✅ ${description} completed successfully`);
    return options.capture ? result.toString().trim() : true;
  } catch (error) {
    console.error(`❌ ${description} failed: ${error.message}`);
    if (!options.allowFailure) {
      process.exit(1);
    }
    return false;
  }
}

function updateChangelog(version) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    console.log('📝 Creating CHANGELOG.md...');
    const initialContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release

`;
    fs.writeFileSync(changelogPath, initialContent);
    return true;
  }
  
  // For existing changelog, prepend new version section
  const currentContent = fs.readFileSync(changelogPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  
  // Check if version already exists
  if (currentContent.includes(`## [${version}]`)) {
    console.log('📝 Version already in CHANGELOG');
    return false;
  }
  
  const versionSection = `## [${version}] - ${date}

### Added
- 

### Changed
- 

### Fixed
- 

`;
  
  // Insert after the header section
  const lines = currentContent.split('\n');
  let insertIndex = lines.findIndex(line => line.startsWith('## ['));
  if (insertIndex === -1) {
    insertIndex = lines.length;
  }
  
  lines.splice(insertIndex, 0, versionSection);
  fs.writeFileSync(changelogPath, lines.join('\n'));
  
  console.log(`📝 Added version ${version} to CHANGELOG`);
  return true;
}

async function main() {
  console.log('🚀 PackFS Release Script\n');
  
  // Parse arguments
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const skipTests = args.includes('--skip-tests');
  const versionType = args.find(arg => ['patch', 'minor', 'major'].includes(arg)) || 'patch';
  
  if (isDryRun) {
    console.log('🧪 Running in dry-run mode\n');
  }
  
  // Step 1: Ensure working directory is clean
  console.log('📋 Checking git status...');
  const gitStatus = runCommand('git status --porcelain', 'Checking for uncommitted changes', { capture: true });
  if (gitStatus && !isDryRun) {
    console.error('❌ Working directory is not clean. Please commit or stash changes first.');
    console.log('\nUncommitted changes:');
    console.log(gitStatus);
    process.exit(1);
  }
  
  // Step 2: Run tests (unless skipped)
  if (!skipTests) {
    runCommand('npm test', 'Running tests');
  }
  
  // Step 3: Build the project
  runCommand('npm run build', 'Building project');
  
  // Step 4: Get current version
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const currentVersion = packageJson.version;
  console.log(`\n📦 Current version: ${currentVersion}`);
  
  // Step 5: Bump version (but don't commit yet)
  console.log(`\n📦 Bumping ${versionType} version...`);
  const newVersion = runCommand(
    `npm version ${versionType} --no-git-tag-version`, 
    `Bumping ${versionType} version`,
    { capture: true }
  ).replace('v', '');
  console.log(`📦 New version: ${newVersion}`);
  
  // Step 6: Update CHANGELOG
  const changelogUpdated = updateChangelog(newVersion);
  
  // Step 7: Commit all changes together
  if (!isDryRun) {
    if (changelogUpdated) {
      runCommand('git add CHANGELOG.md', 'Staging CHANGELOG');
    }
    runCommand('git add package.json package-lock.json', 'Staging package files');
    runCommand(
      `git commit -m "Release v${newVersion}: Update CHANGELOG and version number"`,
      'Committing release'
    );
    
    // Step 8: Create git tag
    runCommand(`git tag v${newVersion}`, 'Creating git tag');
    
    // Step 9: Push to remote
    runCommand('git push', 'Pushing to remote');
    runCommand('git push --tags', 'Pushing tags');
    
    // Step 10: Publish to npm
    runCommand('npm publish', 'Publishing to npm');
    
    console.log(`\n🎉 Successfully released v${newVersion}!`);
    console.log('\n📋 Post-release checklist:');
    console.log('   • Update release notes on GitHub');
    console.log('   • Notify users of new release');
    console.log('   • Update documentation if needed');
  } else {
    console.log('\n🧪 Dry run completed. No changes were made.');
    console.log(`Would have released v${newVersion}`);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Release failed:', error);
  process.exit(1);
});