# Anchor "Account `collection` not provided" — Setup & Issue Summary

Use this doc to share context with ChatGPT or others when debugging.

---

## Setup

- **Framework:** Anchor (Solana) **0.32.1**
- **Test runner:** `ts-mocha` (see `Anchor.toml`), timeout 1e6 ms
- **Command:** `yarn test:skip-build` → `anchor test --skip-build`
- **Cluster:** localnet (validator RPC port 8900)
- **Program:** `nexus_launchpad` (IDL in `target/types/nexus_launchpad.ts`)
- **RPC options (localnet):** `{ skipPreflight: true, commitment: "processed" }`
- **Pre-test patch:** `anchor-buffer-patch` is applied so instruction encoding doesn’t overrun the buffer.

---

## Failing Test

**File:** `tests/04-minting-edge-cases.test.ts`  
**Describe block:** `nexus-launchpad` → `Minting - Edge Cases`  
**Test:** `Mints exactly remaining supply`

**Intent:** Create a collection with `maxSupply: 5`, mint 2 then mint 3 (exact remaining), assert `minted === 5`, then try to mint 1 more and expect `SupplyExceeded`.

**Observed behavior:**

- First mint (quantity 2) **succeeds**.
- Second mint (quantity 3) **fails** before the RPC is sent, with:

```text
Error: Account `collection` not provided.
  at validateAccounts (node_modules/@coral-xyz/anchor/src/program/common.ts:51:15)
  at ix (node_modules/@coral-xyz/anchor/src/program/namespace/instruction.ts:44:23)
  at txFn (node_modules/@coral-xyz/anchor/src/program/namespace/transaction.ts:24:14)
  at MethodsBuilder.rpc [as _rpcFn] (node_modules/@coral-xyz/anchor/src/program/namespace/rpc.ts:21:18)
  at MethodsBuilder.rpc (node_modules/@coral-xyz/anchor/src/program/namespace/methods.ts:434:17)
  at Context.<anonymous> (tests/04-minting-edge-cases.test.ts:88:10)
```

So the failure is in **Anchor’s client-side validation** (`validateAccounts`): when building the second mint instruction, `ctx.accounts` does not contain the key `collection` (or it’s falsy). The same pattern fails for any **second** mint in the same test (e.g. the “mint 1 more” call would also throw this if it were reached).

---

## Relevant Code

### 1. Failing test (simplified)

```ts
it("Mints exactly remaining supply", async () => {
  const { collectionPda, creatorWallet, platformWallet } = await createCollection({ maxSupply: 5 });
  const buyer = anchor.web3.Keypair.generate();
  // ... airdrop, walletTrackerPda ...

  const baseMintParams = {
    collection: collectionPda,
    buyer: buyer.publicKey,
    creatorWallet: creatorWallet.publicKey,
    platformWallet: platformWallet.publicKey,
    walletTracker: walletTrackerPda,
  };

  // First mint — succeeds
  await program.methods
    .mint(new anchor.BN(2))
    .accountsStrict(mintAccounts({ ...baseMintParams }))
    .signers([buyer])
    .rpc(rpcOptions);

  // Second mint — fails with "Account `collection` not provided"
  await program.methods
    .mint(new anchor.BN(3))
    .accountsStrict(mintAccounts({ ...baseMintParams }))  // line 91 / 88 in stack
    .signers([buyer])
    .rpc(rpcOptions);
  // ...
});
```

Each call uses a **new** object from `mintAccounts({ ...baseMintParams })`, so we are not reusing a single mutated reference.

### 2. `mintAccounts` helper (`tests/nexus-launchpad-helpers.ts`)

```ts
export function mintAccounts(params: {
  collection: anchor.web3.PublicKey;
  buyer: anchor.web3.PublicKey;
  creatorWallet: anchor.web3.PublicKey;
  platformWallet: anchor.web3.PublicKey;
  walletTracker: anchor.web3.PublicKey;
}) {
  const systemProgram = anchor.web3.SystemProgram.programId;
  return {
    collection: params.collection,
    buyer: params.buyer,
    creatorWallet: params.creatorWallet,
    creator_wallet: params.creatorWallet,
    platformWallet: params.platformWallet,
    platform_wallet: params.platformWallet,
    walletTracker: params.walletTracker,
    wallet_tracker: params.walletTracker,
    systemProgram,
    system_program: systemProgram,
  };
}
```

So the object passed to `.accountsStrict(...)` **does** include `collection` (and both camelCase and snake_case keys for IDL compatibility).

### 3. IDL mint instruction accounts (`target/types/nexus_launchpad.ts`)

The `mint` instruction has accounts (order and names):

- `collection` (writable)
- `buyer` (writable, signer)
- `creatorWallet` (writable)
- `platformWallet` (writable)
- `walletTracker` (writable, PDA)
- `systemProgram` (address: system program)

So the IDL expects a top-level key `collection`; we pass it.

---

## What we already tried

1. **Single shared `accounts` object** — same error on second mint.
2. **Fresh accounts per call** — `mintAccounts({ ...baseMintParams })` for each of the two mints — same error on second mint.
3. **Confirming the first tx** — `await provider.connection.confirmTransaction(sig1, "confirmed")` after the first mint — no change; the failure is in client-side `validateAccounts`, not on-chain.

Conclusion so far: the second (and later) `.methods.mint(...).accountsStrict(...).rpc(...)` chain is receiving or resolving accounts in a way that leaves `ctx.accounts` without a valid `collection` when the instruction `ix` is built, even though we pass an object that includes `collection` and the first mint works.

---

## Root cause (resolved)

- Why would Anchor’s `validateAccounts(idlIx.accounts, ctx.accounts)` see `ctx.accounts.collection` as missing/falsy on the **second** mint call when we pass a fresh object that has `collection`?
- Is there a known interaction with `skipPreflight` / `processed` commitment, or with calling `.methods.*.accountsStrict().rpc()` multiple times in the same test?
- Suggested workaround (e.g. different way to pass accounts, or to chain two mints in one test) that avoids this client-side error.

---

## Reproduce

From repo root (e.g. `programs/` or `Martech/programs/`):

```bash
yarn test:skip-build
# or
anchor test --skip-build
```

With `--bail`, the suite stops at the first failure (this test). The first test in the same describe block (“Fails to mint with quantity = 0”) passes.
