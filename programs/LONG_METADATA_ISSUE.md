# nexus-collection: "Handles long metadata strings" — RangeError: encoding overruns Buffer

**TL;DR:** The test "Handles long metadata strings" fails with `RangeError: encoding overruns Buffer` **during client-side Borsh encoding** of `create_collection` args. Anchor’s `BorshInstructionCoder` uses a **fixed 1000-byte buffer**; the serialized `CollectionMetadata` (even with all strings truncated to Rust `max_len`) exceeds 1000 bytes, so encoding overruns. The Rust program’s `validate_metadata` truncation never runs because the transaction fails before RPC. Fix: increase or replace the fixed buffer used for instruction encoding in `@coral-xyz/anchor`.

---

## 1. Setup

- **Framework:** Anchor (Solana).
- **Package:** `@coral-xyz/anchor` ^0.32.1.
- **Program:** `nexus-collection` (`programs/programs/nexus-collection/src/lib.rs`).
- **Tests:** `programs/tests/nexus-collection.ts` (ts-mocha).

### Program (Rust)

- **Instructions:** `create_collection(collection_metadata)`, `update_metadata(new_metadata)`.
- **Metadata struct:** `CollectionMetadata` with `#[max_len(...)]` on all string fields:
  - `name`: 100, `symbol`: 10, `description`: 500, `image`: 200.
  - `external_url`: `Option<String>`, max 200.
  - `attributes`: `Vec<TraitAttribute>`, max 10; each has `trait_type` (50), `value` (100), `display_type` (50), `max_value`.
  - `properties`: `files` (max 5, `uri` 200, `r#type` 50), `category` (50), `creators` (max 10, `address` 44, `share`).

The program uses `validate_metadata()` to truncate all strings to these limits **before** storing. So on-chain, metadata is always within `max_len`.

### Tests (TypeScript)

- **Helper:** `createCollection(metadata)` builds `collectionMetadata`, calls `program.methods.createCollection(collectionMetadata).accounts(...).rpc()`.
- **Truncation:** `createCollection` has a `truncateString(str, maxLen)` helper (byte-based UTF-8 truncation) and truncates every string field to the same `max_len` values as the program **before** passing the object to `createCollection`.
- **Failing test:** `"Handles long metadata strings"` (around line 460):
  - `longString = "A".repeat(1000)`.
  - Calls `createCollection({ name: longString, description: longString, image: longString, externalUrl: longString })`.
  - Expects creation to succeed and stored strings to respect max lengths.

### IDL

- `target/idl/nexus_collection.json`: types use plain `"string"` and `"option": "string"`. There is **no** `maxLen` (or equivalent) in the IDL; the Rust `#[max_len]` does not appear there.

---

## 2. The Issue

**Symptom:** The test fails with:

```
RangeError: encoding overruns Buffer
  at Blob.encode (node_modules/buffer-layout/lib/Layout.js:2325:13)
  at Structure.encode (node_modules/buffer-layout/lib/Layout.js:1263:26)
  at WrappedLayout.encode (node_modules/@coral-xyz/borsh/src/index.ts:115:24)
  ...
  at BorshInstructionCoder.encode (node_modules/@coral-xyz/anchor/src/coder/borsh/instruction.ts:53:32)
  ...
  at createCollection (tests/nexus-collection.ts:203:5)
  at Context.<anonymous> (tests/nexus-collection.ts:462:33)
```

So the error occurs **during client-side encoding** of the instruction args (inside Anchor’s `BorshInstructionCoder`), **before** any RPC or on-chain execution. The program’s `validate_metadata` never runs for this failure.

---

## 3. Root Cause

- **Anchor’s instruction encoder** (`@coral-xyz/anchor` → `coder/borsh/instruction.js`) uses a **fixed-size buffer** for encoding instruction arguments:

  ```js
  const buffer = buffer_1.Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = encoder.layout.encode(ix, buffer);
  ```

- The **serialized size** of `CollectionMetadata` (with Borsh layout from the IDL) can **exceed 1000 bytes** even when every string is truncated to `max_len`. Rough lower bound:
  - `name` (4 + 100) + `symbol` (4 + 10) + `description` (4 + 500) + `u16` (2) + `image` (4 + 200) + `external_url` (1 + 4 + 200) ≈ **1033 bytes**, without `attributes` or `properties`.
- With default `attributes`, `properties.files`, `properties.creators`, etc., the full encoded struct is **well over 1000 bytes**.
- `buffer-layout`’s `Blob.encode` throws `RangeError: encoding overruns Buffer` when `offset + span > b.length`, i.e. when the encoder tries to write past the end of the 1000-byte buffer.

So:

1. **Truncation in the test** ensures we never exceed Rust `max_len` per field.
2. **Truncation in the program** would protect on-chain state if the instruction ever ran.
3. The **client-side encoder** still uses a 1000-byte buffer, so **total encoded size** of `CollectionMetadata` overruns that buffer during `createCollection`.

---

## 4. What’s Already in Place

- **Rust:** `validate_metadata()` truncates all metadata strings (and vec lengths) to `max_len` before storing.
- **Tests:** `createCollection` truncates all string fields (and slices vecs) to the same limits before calling `program.methods.createCollection(...)`.
- **IDL:** No `maxLen`; Anchor uses variable-length Borsh strings for IDL `"string"` / `"option": "string"`.

---

## 5. What We Need

A fix that allows encoding `create_collection` / `update_metadata` arguments when the **total Borsh-serialized size** of `CollectionMetadata` exceeds 1000 bytes. Possibilities:

1. **Increase the instruction encode buffer** in `@coral-xyz/anchor`’s `BorshInstructionCoder` (e.g. in `coder/borsh/instruction.js`) from 1000 to a sufficiently large value (or make it configurable). Same buffer is used in `BorshTypesCoder` and possibly elsewhere (see `Buffer.alloc(1000)` in the Anchor package).
2. **Use a dynamically sized buffer** for encoding: e.g. compute an upper bound from the layout (if available) or use a two-pass approach (encode into a growable buffer or estimate size from the payload).
3. **Shrink metadata in the test** so the encoded `CollectionMetadata` stays under 1000 bytes. This would avoid the overrun for this specific test but:
   - Does not fix the underlying limitation.
   - Forces artificially small metadata (e.g. shorter descriptions, fewer attributes/files/creators) and may not reflect real use.

---

## 6. Quick Reference

| Item | Location |
|------|----------|
| Program | `programs/programs/nexus-collection/src/lib.rs` |
| Tests | `programs/tests/nexus-collection.ts` |
| Failing test | `"Edge Cases & Security"` → `"Handles long metadata strings"` (~line 460) |
| `createCollection` helper | `tests/nexus-collection.ts` (~95–214) |
| Instruction encode buffer | `node_modules/@coral-xyz/anchor/dist/cjs/coder/borsh/instruction.js` (~line 53) |
| IDL | `programs/target/idl/nexus_collection.json` |

---

## 7. Reproduce

From `programs/`:

```bash
npm install
anchor build
npm test -- --grep "Handles long metadata strings"
```

The failure is 100% reproducible: encoding overruns the 1000-byte buffer during `createCollection` before any RPC call.
