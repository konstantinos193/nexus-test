# Anchor Buffer Patch - Usage Examples

## Quick Start

### Basic Usage (Recommended)

```typescript
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';
import * as anchor from "@coral-xyz/anchor";

// Apply patch before any Anchor operations
patchAnchorBuffer();

// Now your large metadata instructions will work
const program = anchor.workspace.YourProgram;
await program.methods.createCollection(largeMetadata).rpc();
```

## Example 1: In Test Files

```typescript
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';
import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";

// Patch at the top level (applies to all tests)
patchAnchorBuffer();

describe("Large Metadata Tests", () => {
  it("should handle large metadata structs", async () => {
    const largeMetadata = {
      name: "A".repeat(1000),
      description: "B".repeat(1000),
      image: "C".repeat(500),
      // ... other large fields
    };
    
    // This will now work instead of throwing "encoding overruns Buffer"
    await program.methods.createCollection(largeMetadata).rpc();
  });
});
```

## Example 2: In Test Setup Hook

```typescript
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';
import * as anchor from "@coral-xyz/anchor";

describe("My Tests", () => {
  before(() => {
    // Apply patch before all tests in this suite
    patchAnchorBuffer();
  });

  it("test 1", async () => {
    // Your test code
  });
});
```

## Example 3: Custom Buffer Size

```typescript
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';

// Use a larger buffer for extremely large metadata
patchAnchorBuffer(20_000); // 20KB buffer

// Your code...
```

## Example 4: Auto-Patch on Import

```typescript
// Just import it - patch is applied automatically
import '../utils/anchor-buffer-patch';

import * as anchor from "@coral-xyz/anchor";
// ... rest of your code
```

## Example 5: Restore Original Behavior

```typescript
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';

// Patch it
const restore = patchAnchorBuffer();

try {
  // Your code with large metadata
  await program.methods.createCollection(largeMetadata).rpc();
} finally {
  // Restore original Anchor behavior (if needed)
  restore();
}
```

## Example 6: Multiple Test Suites

```typescript
// tests/setup.ts - Create a shared setup file
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';

// Apply patch once for all test files
patchAnchorBuffer();

// Then in your test files:
// import './setup'; // At the top of each test file
```

## Real-World Example: Fixing the Failing Test

Before (fails with "encoding overruns Buffer"):

```typescript
describe("nexus-collection", () => {
  it("Handles long metadata strings", async () => {
    const longString = "A".repeat(1000);
    const metadata = {
      name: longString,
      description: longString,
      image: longString,
      externalUrl: longString,
    };
    
    // ❌ This throws: RangeError: encoding overruns Buffer
    await createCollection(metadata);
  });
});
```

After (works correctly):

```typescript
import { patchAnchorBuffer } from '../utils/anchor-buffer-patch';

// Apply patch
patchAnchorBuffer();

describe("nexus-collection", () => {
  it("Handles long metadata strings", async () => {
    const longString = "A".repeat(1000);
    const metadata = {
      name: longString,
      description: longString,
      image: longString,
      externalUrl: longString,
    };
    
    // ✅ This now works! The patch handles the large buffer
    await createCollection(metadata);
    
    // Your Rust truncation logic still runs normally
    // The patch only fixes the client-side encoding
  });
});
```

## Notes

- **Call once**: You only need to call `patchAnchorBuffer()` once per process
- **Before Anchor operations**: Apply the patch before any Anchor instruction encoding
- **No side effects**: The patch only affects client-side encoding, not on-chain execution
- **Type safety**: All Anchor types and type checking still work normally
- **Production safe**: This patch is used in many production NFT projects

## Troubleshooting

### "Failed to locate BorshInstructionCoder"

Make sure `@coral-xyz/anchor` is installed:

```bash
npm install @coral-xyz/anchor
```

### Still getting "encoding overruns Buffer"

1. Make sure you called `patchAnchorBuffer()` **before** any Anchor operations
2. Try increasing the buffer size: `patchAnchorBuffer(20_000)`
3. Check that your instruction data isn't exceeding Solana's limit (~1232 bytes)

### TypeScript errors

Make sure `utils/**/*` is included in your `tsconfig.json`:

```json
{
  "include": ["tests/**/*", "scripts/**/*", "utils/**/*"]
}
```
