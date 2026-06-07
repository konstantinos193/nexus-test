# Keeping IDL and Tests in Sync (Jan 2026)

A robust approach so the Anchor program (Rust), IDL, and TypeScript tests stay in sync.

## 1. Simple Workflow

**Edit contracts → Build → Test**

```bash
# When you edit contracts, build:
anchor build
# or
npm run build

# Run tests (anchor test builds automatically):
anchor test
# or
npm test
```

**That's it!** `anchor test` automatically builds the program before running tests, so IDL and types are always fresh.

## 2. Single source of truth: IDL

- **`anchor build`** generates:
  - `target/idl/<program>.json` – instruction and account names, types, errors
  - `target/types/<program>.ts` – TypeScript types

- The IDL uses the **exact account names** from your Rust `#[derive(Accounts)]` structs. The TypeScript client’s `validateAccounts()` checks that every account required by the IDL is present in the object you pass to `.accounts({ ... })`. If a key is missing, you get: **`Account \`<name>\` not provided`**.

- Anchor versions may expose those names in the IDL as **snake_case** (Rust) or **camelCase** (JS). Relying on one convention in tests can break when the IDL or Anchor version changes.

## 3. Use the IDL for account keys in tests

So tests never hardcode camelCase vs snake_case:

1. **Read required account names from the IDL**  
   Use the helper in `utils/idl-sync.ts`:

   - `getInstructionAccountNames(program, "mint")`  
     Returns the exact account names the IDL expects for `mint` (e.g. `["collection", "buyer", "creator_wallet", "platform_wallet", "wallet_tracker", "system_program"]`).

2. **Build the accounts object with those keys**  
   Build the object you pass to `.accounts({ ... })` using the same keys (and values) returned above. You can use `buildAccountsFromIdl(program, "mint", { ... })` so the keys always match the IDL.

3. **Optional: assert before calling**  
   `assertAccountsForInstruction(program, "mint", accounts)` ensures all required accounts are present; if the program adds a new account and you forget to pass it, the test fails with a clear “Missing: …” message.

## 4. Example (mint with IDL-driven keys)

```ts
import { getInstructionAccountNames, buildAccountsFromIdl } from "../utils/idl-sync";

// Once at setup, log the names the IDL expects (so you know what to pass):
const mintAccountNames = getInstructionAccountNames(program, "mint");
// e.g. ["collection", "buyer", "creator_wallet", "platform_wallet", "wallet_tracker", "system_program"]

// Build accounts using those keys (no hardcoded camelCase/snake_case):
const accounts = buildAccountsFromIdl(program, "mint", {
  collection: collectionPda,
  buyer: buyer.publicKey,
  creator_wallet: creatorWallet,   // match IDL key
  platform_wallet: platformWallet,
  wallet_tracker: walletTrackerPda,
  system_program: anchor.web3.SystemProgram.programId,
});
await program.methods.mint(new anchor.BN(1)).accounts(accounts).signers([buyer]).rpc();
```

## 5. Checklist

- [ ] Run **`anchor build`** when you edit contracts (or use `npm run build`).
- [ ] Run **`anchor test`** for tests (it builds automatically, or use `npm test`).
- [ ] Use **`getInstructionAccountNames(program, "mint")`** (or similar) to see the exact keys the IDL expects.
- [ ] Use those keys in the object passed to **`.accounts({ ... })`** (or use `buildAccountsFromIdl`).
- [ ] Optionally **`assertAccountsForInstruction`** before calling the instruction to catch missing accounts early.
- [ ] Do not rely on a fixed convention (e.g. “always camelCase”); let the IDL define the keys.

This keeps the program, IDL, and tests in sync regardless of Anchor version and naming in the generated IDL.
