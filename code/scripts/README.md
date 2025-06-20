# PackFS Release Scripts

## Overview

This directory contains scripts for managing the PackFS release process.

## Scripts

### release.js

The main release script that handles the complete release process in the correct order:

1. **Checks git status** - Ensures working directory is clean
2. **Runs tests** - Validates the code (can be skipped with `--skip-tests`)
3. **Builds the project** - Ensures dist/ is up to date
4. **Bumps version** - Updates package.json version
5. **Updates CHANGELOG** - Adds new version section
6. **Commits everything together** - Single commit with all changes
7. **Creates git tag** - Tags the release commit
8. **Pushes to GitHub** - Pushes commit and tag
9. **Publishes to npm** - Publishes the package

### Usage

```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major

# Dry run (shows what would happen)
npm run release:dry

# Skip tests (for emergency releases)
npm run release:skip-tests
```

### test-and-publish.js

Legacy script that runs tests and publishes, but allows publishing even if tests fail. 
This was used during initial development but should not be used for regular releases.

## Release Process Best Practices

1. **Always ensure tests pass** before releasing
2. **Update CHANGELOG** with meaningful entries before running release
3. **Use semantic versioning**:
   - Patch: Bug fixes, minor updates
   - Minor: New features, backward compatible
   - Major: Breaking changes
4. **Create GitHub release** after npm publish with release notes

## Common Issues

### "Working directory is not clean"

Commit or stash your changes before running release:
```bash
git add .
git commit -m "Your changes"
npm run release
```

### "npm publish failed"

Make sure you're logged in to npm:
```bash
npm login
```

### CHANGELOG conflicts

The script will create a CHANGELOG.md if it doesn't exist. If you have conflicts,
resolve them manually before running the release script.