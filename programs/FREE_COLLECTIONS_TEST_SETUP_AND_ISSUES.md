# Free Collections Test – Setup, Issue, and What We Tried

## Current Setup

### Stack
- **Anchor** 0.32.1
- **Program**: `nexus-launchpad` (Solana), IDL in `target/idl/nexus_launchpad.json`, TypeScript types in `target/types/nexus_launchpad.ts`
- **Tests**: `tests/**/*.ts` via ts-mocha (pattern `tests/**/*.ts`), timeout 1000000 ms, `--bail`
- **Helpers**: `tests/nexus-launchpad-helpers.ts` – `program`, `provider`, `createCollection`, `mintAccounts`, `setStartTimeToNow`, etc.

### Test File
- **`tests/00-free-collections-zero-mint-price.test.ts`** – “Free Collections (Zero Mint Price)” describe block.
- First test: **“Mints from free collection successfully (no payment)”** – creates a free collection (price 0), mints 1, asserts no payment and only tx fees.

### Program (contract) behavior relevant to free mints
- **Mint instruction**: 3 IDL args – `quantity`, `allowlistProof`, `allowlistLeafIndex`. Accounts: `collection`, `buyer`, `creatorWallet`, `platformWallet`, `walletTracker`, `systemProgram`.
- **Zero price**: Contract allows `price == 0`. It skips transfers when `platform_fee == 0` and `creator_amount == 0` (no `invoke` for 0 lamports).
- **Start time**:  
  - **Initialize**: `require!(collection_config.start_time >= clock.unix_timestamp)` → **start time must be >= now** (no “past” start time at creation).  
  - **Mint**: `require!(clock.unix_timestamp >= collection.start_time)` → mint only after start time.
- So: collection must be created with start time in the **future** (or now); then mint only after that time (or after updating start time via `update_config`).

### Helper `createCollection`
- Default `startTime = config.startTime ?? (now + 60)` (60 seconds in the future).
- No `startTime` in config → collection is not mintable until 60 seconds later.

### Helper `mintAccounts`
- Builds accounts for `mint` with both camelCase and snake_case keys so it works with either IDL (types vs JSON).
- Used as: `program.methods.mint(quantity, null, null).accountsStrict(mintAccounts({...})).signers([buyer]).rpc(...)`.

---

## The Issue

The test **“Mints from free collection successfully (no payment)”** fails, with the failure point moving as we applied fixes:

1. **First**: `ReferenceError: provider is not defined` (fixed by importing `provider` and using helpers).
2. **Then**: `Error: Account 'collection' not provided` in Anchor’s `validateAccounts` (fixed by using `mintAccounts` and correct instruction args).
3. **Then**: Empty `Error:` from `ProgramError.parse` / `translateError` – transaction reverted; root cause was **MintingNotStarted** because we tried to mint before the collection’s start time (default `now + 60`).
4. **Then**: We set `startTime: Math.floor(Date.now()/1000) - 60` in `createCollection` so “minting is open.” Failure moved to **inside `createCollection`** (same empty `Error:` from Anchor).  
   **Cause**: The **contract** rejects start time in the past at **initialize** time: `require!(collection_config.start_time >= clock.unix_timestamp)` → **InvalidStartTime**. So we cannot create a collection with `startTime` in the past; init fails.

So currently:
- If we **don’t** pass a past `startTime`: init succeeds, but mint fails with MintingNotStarted (or empty ProgramError).
- If we **do** pass a past `startTime`**: init fails with InvalidStartTime (empty ProgramError in Node).

---

## What We Tried Already

### 1. `provider` and `mintAccounts`
- **Tried**: Use `provider` from helpers; use `mintAccounts({ collection, buyer, creatorWallet, platformWallet, walletTracker })` and `.accountsStrict(accounts as any)` so account keys match IDL (camelCase/snake_case).
- **Result**: Fixed “Account `collection` not provided” once the instruction was actually receiving the context (see next).

### 2. Anchor `splitArgsAndCtx` – why context was empty
- **Tried**: Debug why `validateAccounts` saw `accounts` with `keys: []` even though `resolveOptionals` had correctly set `this._accounts` (including `collection`).
- **Finding**: In Anchor, `splitArgsAndCtx(idlIx, args)` only treats the **last** argument as the context object when `args.length === idlIx.args.length + 1`.  
  Mint has **3** IDL args (`quantity`, `allowlistProof`, `allowlistLeafIndex`). We were calling `.mint(new anchor.BN(1))` → builder called the ix with `[BN(1), context]` (length 2). So the context was **not** popped; it was consumed as the second instruction arg, and `ctx.accounts` stayed `{}`.
- **Fix**: Call `.mint(quantity, null, null)` for public mint so that when the builder appends the context, `args.length === 4 === 3+1` and the last element is correctly used as context.  
- **Result**: “Account `collection` not provided” fixed; next failure was on-chain (MintingNotStarted).

### 3. MintingNotStarted
- **Tried**: Allow minting by creating the collection with start time already in the past: `createCollection({ pricePerNft: 0, startTime: Math.floor(Date.now()/1000) - 60 })`.
- **Result**: Failure moved to **inside `createCollection`** (line 400 in `nexus-launchpad-helpers.ts`, `initializeCollection` RPC). The program rejects **InvalidStartTime** at init: the contract requires `start_time >= clock.unix_timestamp` at initialization, so a **past** start time is invalid and must not be used in `createCollection`.

### 4. Other tests in the same file
- **Tried**: Add the same `startTime` (past) to every `createCollection` that is followed by a mint.
- **Result**: Same contract rule applies: init with past start time is invalid; those tests would also fail at `createCollection` if they use a past `startTime`.

---

## Recommended Approach

- **Do not** pass a start time in the past to `createCollection`; the contract disallows it at init.
- **Do** one of:
  1. **Create then update**: Create the collection with default (future) `startTime`, then call **`setStartTimeToNow(collectionPda, authority)`** (which uses `update_config` to set `startTime` to `now - 1`), then perform the mint.  
  2. **Create with near-future start**: Use a start time very soon (e.g. `now + 1`) and add a short `sleep` before minting (fragile and slower).

Prefer (1): keep `createCollection` as-is (or with explicit future `startTime`), and in tests that need to mint immediately, call `setStartTimeToNow(collectionPda, authority)` after `createCollection` and before the first mint.

---

## Quick reference

| Item | Detail |
|------|--------|
| Contract init start time | `start_time >= clock.unix_timestamp` (future or now only) |
| Contract mint start check | `clock.unix_timestamp >= collection.start_time` |
| Mint instruction args | Must pass all 3: `quantity`, `allowlistProof`, `allowlistLeafIndex` (e.g. `null, null` for public) |
| Accounts for mint | Use `mintAccounts(...)` and `.accountsStrict(accounts as any)` |
| Opening mint in tests | After `createCollection`, call `setStartTimeToNow(collectionPda, authority)` then mint |
