# External Library Type Definitions

Generated: 2025-06-20T18:54:05.460Z

This document contains extracted type definitions from external libraries used by PackFS.


## mastra (@mastra/core)

Version: 0.10.6

### Tool

```typescript
class Tool<TSchemaIn extends z.ZodSchema | undefined = undefined, TSchemaOut extends z.ZodSchema | undefined = undefined, TContext extends ToolExecutionContext<TSchemaIn> = ToolExecutionContext<TSchemaIn>> extends Tool$1<TSchemaIn, TSchemaOut, TContext> {
    constructor(opts: ToolAction<TSchemaIn, TSchemaOut, TContext>);
}
```

