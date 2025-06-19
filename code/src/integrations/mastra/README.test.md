# Mastra Native Integration Tests

## Status: Pending Implementation

The test files in `__tests__.pending/` are ready for the upcoming v0.1.9 release which will include the native Mastra integration with tool factory pattern.

### Test Coverage Prepared:

1. **Unit Tests**:
   - `security-validator.test.ts` - MastraSecurityValidator tests
   - `tool-factory.test.ts` - createPackfsTools function tests

2. **Integration Tests**:
   - `mastra-tools.test.ts` - Full tool integration tests

### To Enable Tests:

When implementing the Mastra native integration for v0.1.9:

1. Rename the test directory back:
   ```bash
   mv __tests__.pending __tests__
   ```

2. Implement the required modules:
   - `security/validator.ts` - MastraSecurityValidator class
   - `security/config.ts` - Security configuration types
   - `intents/index.ts` - Intent types (AccessIntent, DiscoverIntent, UpdateIntent)
   - `types.ts` - PackfsToolConfig and related types
   - `index.ts` - Main export with createPackfsTools function

3. Install required dependencies:
   ```bash
   npm install zod @mastra/core
   ```

The tests are comprehensive and follow the specification in:
- `/workspace/context-network/decisions/adr_004_native_mastra_integration_layer.md`
- `/workspace/context-network/architecture/mastra_integration_specification.md`
- `/workspace/context-network/architecture/mastra_test_plan.md`