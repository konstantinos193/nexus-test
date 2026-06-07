# How We Save Deployment Fees & Rent Per Byte

This doc summarizes what’s already in place and optional next steps to shrink program size and account rent.

---

## Already implemented

### 1. Release build (binary size)

**Root `Cargo.toml`** already has size-oriented release settings:

- `opt-level = "z"` – optimize for size
- `lto = true` – link-time optimization
- `codegen-units = 1` – single codegen unit
- `panic = "abort"` – no unwinding
- `strip = "symbols"` – strip symbols
- `overflow-checks = false` – no runtime overflow (we use `checked_*` everywhere)
- `incremental = false` – better optimization

**Build for deploy:**

```bash
cargo build-sbf --release
```

Expect roughly **30–60%** smaller binaries than unoptimized builds.

---

### 2. Dependencies & features

- **nexus-launchpad**: `anchor-lang` (default-features = false), `sha3` (default-features = false). No serde_json/regex.
- **nexus-payment**: Only `anchor-lang` (default-features = false).
- **nexus-collection**: `anchor-lang`, `mpl-token-metadata` (default-features = false).

All programs use **default = ["no-idl", "no-log-ix-name"]** so IDL and log instruction names are not embedded in release (saves ~20–50KB and CU).

Logging is behind a **"logs"** feature; default build has no `msg!` in release.

---

### 3. Account layout (rent)

**nexus-launchpad – `Collection`**

- Flattened config (no nested struct).
- Sentinels: `-1` for optional `i64`, `0` for optional `u8`, `[0u8;32]` for optional allowlist root (no `Option` overhead).
- Booleans packed into `flags: u8` (paused, freeze_until_sold_out).
- `metadata_standard` as `u8`; `mint_limit_per_wallet` as `u8`.
- `InitSpace` for correct space calculation.

**nexus-launchpad – `WalletMintTracker`**

- Only `minted: u8`. Wallet + collection come from PDA seeds (saves 64 bytes per tracker).

**nexus-payment – `Splitter`**

- 67 bytes: creator (32) + platform (32) + fee_bps (2) + bump (1). No extra fields.

**nexus-collection – `Collection`**

- Minimal on-chain: authority, mint, metadata_uri (max 200), created_at, bump, status (u8), featured (bool).

---

### 4. Rent-exempt init

Anchor’s `init` with fixed `space = 8 + T::INIT_SPACE` (or explicit `space`) uses rent-exempt minimum. No change needed.

---

### 5. Struct packing

- No `bool` next to `u64` without packing; flags and small enums use `u8`.
- Launchpad uses sentinels and bitflags instead of `Option`/extra bools where it matters.

---

## Optional next steps

### A. Shrink `base_uri` / `metadata_uri` (strings)

- **nexus-launchpad**: `Collection.base_uri` is `String` with `#[max_len(200)]` → 4-byte length + up to 200 bytes.
- **nexus-collection**: `Collection.metadata_uri` same pattern.

**Option:** Store as fixed `[u8; 200]` (or smaller cap, e.g. 128). Saves the 4-byte length prefix and keeps size predictable. Requires serialization/deserialization and truncation to use byte slices; clients already send strings so this is a small contract + client change.

**Rough savings:** 4 bytes per account (length prefix). If you later move to zero-copy, fixed-size fields are required anyway.

---

### B. Zero-copy accounts

`#[account(zero_copy)]` removes Borsh (de)serialization and can reduce account size and CU.

**Requirements:** Only fixed-size types (no `String`, no `Vec`). So:

- Replace `base_uri` / `metadata_uri` with something like `[u8; 200]` (or 128).
- Add `#[repr(C)]` and use `AccountLoader<'info, T>` at the call sites.

**Benefit:** Smaller account representation and faster access; worth it if you’re refactoring these accounts anyway (e.g. for (A)).

---

### C. Close accounts when done

Where an account is no longer needed, return lamports to the user:

- In Anchor: `#[account(mut, close = authority)]` (or the relevant wallet).
- Use when: deleting a collection, retiring a tracker, or any “final” state that doesn’t need the account anymore.

Right now there are no `close =` instructions in the programs; adding them for any “end-of-life” accounts will recover rent.

---

### D. Check binary bloat

See what contributes to program size:

```bash
cargo install cargo-bloat
cargo bloat --release -n 30
```

Run from the workspace root or from each program directory. Use this to spot heavy crates or unexpected dependencies.

---

### E. Deploy and finalize

- Test on **devnet** first: `solana config set --url devnet`.
- When the program is final and not going to be upgraded:  
  `solana program deploy --final` (or equivalent for your workflow) to avoid paying rent on the upgradeable buffer.

---

## Quick reference

| Method                         | Status / Savings                    |
|--------------------------------|-------------------------------------|
| Release build + LTO            | Done (opt-level=z, lto, codegen-units=1) |
| Struct packing / sentinels     | Done (Collection, WalletMintTracker, Splitter) |
| No IDL / no-log-ix-name in prod| Done (default features)             |
| Logging behind feature         | Done ("logs" feature)               |
| Fixed string → `[u8; N]`       | Optional (~4 bytes per string field) |
| Zero-copy                      | Optional (larger refactor)           |
| Close unused accounts          | Optional (recover rent when done)    |
| cargo bloat                    | Optional (inspect size)              |
| Deploy devnet / --final        | Process (test then finalize)        |

If you want to go deeper, paste your current program size (`.so` after `cargo build-sbf --release`), account structs, and we can target the next 5–10% of savings (e.g. exact field order for padding, or a concrete zero-copy layout).
