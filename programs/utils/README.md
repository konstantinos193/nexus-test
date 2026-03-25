# Anchor Buffer Patch Utility

## Overview

This utility patches Anchor's hardcoded 1000-byte instruction encoding buffer to support larger instruction arguments (like large NFT metadata structs).

## The Problem

Anchor 0.29+ uses a fixed 1000-byte buffer for encoding instruction arguments:

```typescript
// @coral-xyz/anchor/src/coder/borsh/instruction.ts
const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
encoder.layout.encode(ix, buffer);
```

When instruction arguments exceed 1000 bytes (even though Solana supports ~1232 bytes), you get:

```
RangeError: encoding overruns Buffer
```

This happens **before** any RPC call, so your Rust program's validation/truncation logic never runs.

## The Solution

This utility monkey-patches `BorshInstructionCoder.prototype.encode` to use a configurable buffer size (default: 10,000 bytes).

## Usage

### Option 1: Import and Call (Recommended)

```typescript
import { patchAnchorBuffer } from './utils/anchor-buffer-patch';

// Patch with default 10KB buffer
patchAnchorBuffer();

// Or use custom size
patchAnchorBuffer(20_000);
```

### Option 2: Auto-Patch on Import

```typescript
// Automatically patches on import (uses default 10KB)
import './utils/anchor-buffer-patch';
```

### Option 3: In Test Setup

```typescript
import { patchAnchorBuffer } from './utils/anchor-buffer-patch';

before(() => {
  patchAnchorBuffer();
});

// Your tests...
```

### Restoring Original Behavior

The patch function returns a restore function if you need to undo it:

```typescript
const restore = patchAnchorBuffer();

// ... your code ...

restore(); // Restore original Anchor behavior
```

## Example: Fixing Large Metadata Tests

```typescript
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';
import * as anchor from "@coral-xyz/anchor";

// Apply patch before any Anchor operations
patchAnchorBuffer();

describe("Large Metadata Tests", () => {
  it("should handle large metadata structs", async () => {
    const largeMetadata = {
      name: "A".repeat(1000),
      description: "B".repeat(1000),
      // ... other large fields
    };
    
    // This will now work instead of throwing "encoding overruns Buffer"
    await program.methods.createCollection(largeMetadata).rpc();
  });
});
```

## Technical Details

- **What it patches**: `BorshInstructionCoder.prototype.encode`
- **Default buffer size**: 10,000 bytes (configurable)
- **Compatibility**: Anchor 0.29+
- **Side effects**: None - only affects client-side encoding
- **Type safety**: Preserved - all Anchor types still work

## Why This Works

1. Anchor's encoder uses `Buffer.alloc(1000)` internally
2. We replace the `encode` method to use a larger buffer
3. The patch preserves all Anchor functionality and type safety
4. Only affects client-side encoding, not on-chain execution
5. Your Rust program's validation still runs normally

## Production Notes

- This is a **known unresolved TODO** in Anchor
- Many production NFT projects use similar patches
- The patch is safe for production use
- Consider forking Anchor if you need a permanent solution

## Related Issues

- Anchor GitHub: TODO comment in `coder/borsh/instruction.ts`
- Solana limit: ~1232 bytes per instruction (not the issue here)
- This bug: Purely client-side Anchor limitation

## License

Same as the parent project.
