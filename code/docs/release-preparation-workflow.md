# Release Preparation Workflow

## Overview

This document outlines the proper workflow for preparing releases in PackFS. It's crucial to understand what should be done manually during preparation versus what is automated by `npm run release`.

## ⚠️ Important: Version Management

**DO NOT manually change the version in package.json**. The version bump is handled automatically by `npm run release`.

## Release Preparation Steps

### 1. Planning Phase
- Create release notes for the UPCOMING version (e.g., `RELEASE-NOTES-v0.2.2.md`)
- Document planned improvements in version-specific docs (e.g., `docs/v0.2.2-improvements.md`)
- Use the future version number in planning documents - this is OK and expected

### 2. Development Phase
- Implement planned features and fixes
- Ensure all tests pass
- Update documentation as needed
- Keep the context network in sync with code changes

### 3. Pre-Release Checklist
Before running `npm run release`, ensure:
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript has no errors: `npm run typecheck`
- [ ] Lint passes: `npm run lint` (if available)
- [ ] CHANGELOG.md has been updated with changes (can be done manually or will be prompted)
- [ ] Release notes document exists for the new version
- [ ] Documentation is up to date

### 4. What NOT to Do
**Never manually edit these during preparation:**
- `package.json` version field
- Git tags
- npm publish commands

These are ALL handled by `npm run release`.

### 5. Release Execution
When ready to release:

```bash
# For patch release (0.2.1 -> 0.2.2)
npm run release

# For minor release (0.2.1 -> 0.3.0)
npm run release:minor

# For major release (0.2.1 -> 1.0.0)
npm run release:major

# To preview without making changes
npm run release:dry
```

### 6. What `npm run release` Does
The script automatically:
1. Checks git status (working directory must be clean)
2. Runs tests
3. Builds the project
4. **Bumps the version in package.json**
5. Updates CHANGELOG.md
6. Commits all changes together
7. Creates a git tag
8. Pushes to GitHub (commit + tag)
9. Publishes to npm

### 7. Post-Release Tasks
After successful release:
1. Create GitHub release with release notes
2. Move completed issues to archive
3. Update project boards
4. Announce release if needed

## Example Workflow

For the v0.2.2 release addressing multi-project feedback:

### ✅ Correct Preparation:
1. Create `/RELEASE-NOTES-v0.2.2.md` (planning document)
2. Create `/docs/v0.2.2-improvements.md` (planning document)
3. Implement improvements
4. Test thoroughly
5. Run `npm run release` (this will bump 0.2.1 -> 0.2.2)

### ❌ Incorrect Preparation:
1. Manually edit package.json to change version to 0.2.2
2. Create git tag manually
3. Run npm publish manually

## Integration with Context Network

This workflow integrates with the context network structure:
- `/context-network/planning/` - Version planning documents
- `/context-network/processes/` - This workflow document
- `/context-network/architecture/` - Technical changes documentation

Always keep the context network updated throughout the release preparation process.

## References
- `/scripts/README.md` - Detailed release script documentation
- `/scripts/release.js` - The release automation script
- `/CHANGELOG.md` - Version history
- NPM Scripts in `package.json` - Available release commands