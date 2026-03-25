# `src.toTwos is not a function` — Option&lt;i64/u64&gt; Encoding Issue

## Summary

When encoding `initializeCollection` instruction data, **BNLayout** (used for `i64`/`u64`) receives a non-BN value inside an **Option** and throws `TypeError: src.toTwos is not a function`. The root cause is a mismatch between what the **Anchor TS client** passes (`{ some: value }`) and what **@coral-xyz/borsh**’s **OptionLayout** expects (`null` or the raw inner value).

---

## Error Details

```
TypeError: src.toTwos is not a function
  at BNLayout.encode (node_modules/@coral-xyz/borsh/src/index.ts:59:17)
  at OptionLayout.encode (node_modules/@coral-xyz/borsh/src/index.ts:147:24)
  at Structure.encode (node_modules/buffer-layout/lib/Layout.js:1263:26)
  at Structure.encode (node_modules/buffer-layout/lib/Layout.js:1263:26)
  at BorshInstructionCoder.encode (utils/anchor-buffer-patch.ts:380:28)
  at .../anchor/.../namespace/index.ts (ix → encode)
  at createCollection (tests/nexus-launchpad.ts:94:5)
```

- **BNLayout** always calls `src.toTwos(...)` for signed `i64`; it assumes `src` is a `BN`.
- **OptionLayout.encode** receives `{ some: value }` from the client, then passes that **whole object** into the inner layout (`BNLayout`). The inner layout thus gets an object, not a `BN` → `toTwos` fails.

---

## Current Setup

### 1. Program (Rust)

**Instruction:** `initialize_collection(collection_config: CollectionConfig, platform_fee_basis_points: u16)`

**CollectionConfig** (from `programs/nexus-launchpad/src/lib.rs`):

```rust
pub struct CollectionConfig {
    pub max_supply: u64,
    pub price_per_nft: u64,
    pub start_time: i64,
    pub end_time: Option<i64>,           // Option<i64> → BNLayout
    pub mint_limit_per_wallet: Option<u8>, // Option<u8> → not BN
    pub metadata_standard: MetadataStandard,
    pub freeze_trading_until_date: Option<i64>, // Option<i64> → BNLayout
    pub freeze_trading_until_sold_out: bool,
}
```

- **Option&lt;i64&gt;:** `end_time`, `freeze_trading_until_date` → use **BNLayout**.
- **Option&lt;u8&gt;:** `mint_limit_per_wallet` → plain `u8`, no BN.

### 2. Test / TS Client (`createCollection` in `tests/nexus-launchpad.ts`)

Options are passed in Anchor’s `{ some: value }` form:

```ts
await program.methods.initializeCollection({
  maxSupply: new anchor.BN(...),
  pricePerNft: new anchor.BN(...),
  startTime: new anchor.BN(startTime),
  endTime: config.endTime === null ? null : { some: new anchor.BN(config.endTime) },
  mintLimitPerWallet: config.mintLimitPerWallet === null ? null : { some: 5 },
  metadataStandard: metadataStandard(...),
  freezeTradingUntilDate: freezeTradingUntilDate,  // null or { some: BN(...) }
  freezeTradingUntilSoldOut: ...,
}, platformFeeBasisPoints)
```

- **Anchor** wraps Options as `{ some: value }`.
- **Borsh OptionLayout** expects `null` (None) or the **raw** inner value (Some), not `{ some: v }`.

### 3. Borsh / Layouts

- **@coral-xyz/borsh** `OptionLayout.encode`:

  ```ts
  if (src === null || src === undefined) { /* write 0, None */ return; }
  this.discriminator.encode(1, ...);
  return this.layout.encode(src, ...) + 1;  // passes src as-is to inner layout
  ```

  So for `Option<i64>`, it passes **whatever we give it** (e.g. `{ some: BN }`) into **BNLayout** → `toTwos` on an object → error.

- **OptionLayout** is **not** exported from `@coral-xyz/borsh` (only `option` factory). Patching `OptionLayout.prototype` requires resolving the class indirectly (e.g. via `option(...).constructor`).

### 4. `anchor-buffer-patch` (`utils/anchor-buffer-patch.ts`)

- **Role:**  
  - Grow the instruction encoding buffer (Anchor’s 1KB default).  
  - Normalize instruction args before encoding (e.g. ensure `BN` for `u64`/`i64`, handle Options).

- **Current normalization (Options):**
  - Accept `{ some: v }` or raw `v`.
  - For **Option&lt;BNLayout&gt;**: output **raw** `toBN(someValue)` (or `null`).
  - For **Option&lt;u8&gt;** etc.: output raw `someValue` (or `null`).
  - Goal: feed **OptionLayout** with `null` or raw value, never `{ some: v }`.

- **Layout detection:**
  - `isOptionLayout(layout)`: `OptionLayout` constructor name or `layout.layout` + `layout.discriminator`.
  - `isBNLayout(layout)`: `BNLayout` constructor name or shape (encode/decode, `signed`, `span`, `blob`).

- **Struct normalization:**  
  Walks `layout.fields`, uses `getStructValue` for camelCase/snake_case, recurses per field.  
  Instruction layout: `struct([collection_config, platform_fee_basis_points])`.  
  `collection_config` is a struct from IdlCoder `typeDefLayout` (`borsh.struct(fieldLayouts, name)`).

- **Encode path:**  
  `normalizeValueForLayout(layout, ix)` → `normalizedIx` → `layout.encode(normalizedIx, data)`.

---

## Observed Test Behavior

| Test | Config | Result |
|------|--------|--------|
| Initializes with **no end time** | `endTime: null` | ✅ Passes |
| Initializes a collection successfully | default (includes `endTime: { some: BN }`, etc.) | ❌ `toTwos` |
| Fails to initialize with zero supply | `maxSupply: 0` | ❌ `toTwos` (never reaches program) |
| Fails to initialize with past start time | `startTime` in past | ❌ `toTwos` |
| Initializes with no mint limit | `mintLimitPerWallet: null` | ❌ `toTwos` |
| Initializes with MetadataStandard Legacy/Cnft | `metadataStandard: "legacy"` / `"cnft"` | ❌ `toTwos` |

- **“No end time”** is the only passing case: we normalize `endTime: null` → `null` → OptionLayout encodes None; no BNLayout is used for that field.
- All failing cases use at least one **Option&lt;i64&gt; Some** (`end_time` and/or `freeze_trading_until_date`) or other Option fields. The error indicates **some** Option-wrapped BNLayout still receives a non-BN (likely still `{ some: value }` or a wrong shape).

---

## What’s Been Tried

1. **Normalize Options to raw**  
   In `normalizeValueForLayout`, for Option types we return `null` or the inner value (BN for Option&lt;i64&gt;, number for Option&lt;u8&gt;), never `{ some: v }`.  
   **Result:** Error persists → either normalization is not applied to all Option&lt;i64&gt; paths, or the encoder sees a different structure.

2. **OptionLayout prototype patch**  
   Unwrap `{ some: v }` and optionally convert to BN inside `OptionLayout.encode` before calling the inner layout.  
   **Result:** `OptionLayout` is not exported; patch never applied. Could be tried by resolving the class via `require("@coral-xyz/borsh").option(borsh.u8("_")).constructor` and then patching that prototype.

3. **`assertNoPlainNumberForBN`**  
   Assertion updated to treat Option values as raw (`null` or inner value). No change to the encoding error.

---

## Likely Causes (To Investigate)

1. **Layout shape vs. normalization**
   - Defined types (e.g. `CollectionConfig`) come from `typeDefLayout` → `borsh.struct(...)`.  
   - Verify we actually recurse into **nested** structs and hit **every** `Option<i64>` field (`end_time`, `freeze_trading_until_date`).  
   - Check for any **replicate**/wrapper layouts that might use a different `.fields` or structure than we handle.

2. **`isOptionLayout` / `isBNLayout`**
   - In bundled/minified builds, `layout.constructor?.name` may differ.  
   - Fallbacks (e.g. `layout.layout` + `layout.discriminator` for Option, `blob`/`signed`/etc. for BN) might not match all layouts.  
   - **Suggestion:** Add short debug logs (or unit tests) that log `layout.constructor?.name`, `isOptionLayout(layout)`, `isBNLayout(inner)` for each Option field we process.

3. **Key / shape mismatch**
   - `toInstruction` builds `{ collection_config, platform_fee_basis_points }` (snake_case).  
   - We use `getStructValue` for camel/snake. Confirm we actually read and write `collection_config` and its nested keys (`end_time`, `freeze_trading_until_date`, etc.) correctly.

4. **OptionLayout patch not applied**
   - Even with normalization, **borsh** itself still expects raw `null` | value.  
   - If we ever pass `{ some: v }` (e.g. from an unnormalized path), we’d see this error.  
   - **Suggestion:** Implement OptionLayout patch via `option(...).constructor` and ensure it’s applied before any encode; use it as a safety net even if we normalize.

---

## Suggested Next Steps

1. **Debug logging**
   - In `normalizeValueForLayout`, when handling Option: log `layout.constructor?.name`, `isBNLayout(inner)`, and the **normalized** value (e.g. `null` vs `BN` vs number).  
   - Log the **normalized** `collection_config` (or full `normalizedIx`) right before `layout.encode(normalizedIx, data)` and assert that `end_time` / `freeze_trading_until_date` are either `null` or `BN`, never `{ some: ... }`.

2. **Unit test for normalization**
   - Build a minimal `borsh.struct` that includes `option(i64)("end_time")` (and optionally `option(u8)(...)`).  
   - Run `normalizeValueForLayout` with `{ end_time: { some: 123 } }` and with `{ end_time: null }`.  
   - Assert output is `{ end_time: BN(123) }` and `{ end_time: null }` respectively, and that encoding with `layout.encode` succeeds.

3. **Patch OptionLayout via constructor**
   - `const OptionLayout = require("@coral-xyz/borsh").option(require("@coral-xyz/borsh").u8("_")).constructor;`  
   - Patch `OptionLayout.prototype.encode` to unwrap `{ some: v }` and convert to BN when inner is BNLayout, then call original encode.  
   - Re-run the same tests; see if the error disappears or shifts.

4. **Inspect exact layout hierarchy**
   - For `initializeCollection`, log `encoder.layout` (and optionally its `fields` and their `layout`/`property`).  
   - Confirm the `collection_config` field layout has `OptionLayout(i64)` for `end_time` and `freeze_trading_until_date`, and that we recurse into those.

5. **Client-side workaround (last resort)**
   - Instead of `{ some: value }`, pass `null` or raw `anchor.BN` / `number` for Option fields in `createCollection` and ensure that matches what `toInstruction` / Idl expects.  
   - This may conflict with Anchor’s generated types; useful only if we confirm Anchor accepts raw values for Option args.

---

## Relevant Files

- `programs/utils/anchor-buffer-patch.ts` — normalization + BorshInstructionCoder patch.
- `programs/tests/nexus-launchpad.ts` — `createCollection`, `patchAnchorBuffer()`, Initialization tests.
- `programs/programs/nexus-launchpad/src/lib.rs` — `CollectionConfig`, `initialize_collection`.
- `node_modules/@coral-xyz/borsh/dist/index.js` — `OptionLayout`, `BNLayout`, `option`, `i64`/`u64`.
- `node_modules/@coral-xyz/anchor/dist/cjs/coder/borsh/instruction.js` — `BorshInstructionCoder`, layout build.
- `node_modules/@coral-xyz/anchor/dist/cjs/coder/borsh/idl.js` — `IdlCoder.fieldLayout`, `typeDefLayout`.
- `node_modules/buffer-layout/lib/Layout.js` — `Structure.encode` (iterates `fields`, uses `src[fd.property]`).

---

## Package Versions (for reference)

- **@coral-xyz/anchor:** ^0.32.1  
- **@coral-xyz/borsh:** 0.31.1 (via Anchor)  
- **buffer-layout:** ^1.2.0 (via borsh)  
- **bn.js:** ^5.1.2  

---

## Quick Reference: OptionLayout vs Client

| Client passes | OptionLayout expects | BNLayout expects |
|---------------|----------------------|-------------------|
| `null` | `null` (None) ✅ | — |
| `{ some: BN }` | **raw** `BN` (Some) | **raw** `BN` |
| `{ some: 5 }` (Option&lt;u8&gt;) | **raw** `5` | — |

We must ensure the **normalized** object we pass to `layout.encode` uses the “OptionLayout expects” column for every Option field, so that OptionLayout never forwards `{ some: v }` into BNLayout.
