# Wallet Setup and `_WALLET_DISPLAY_NAMES_w_name` Error

This document describes the current Solana wallet integration in the Frontend and the runtime error **`_WALLET_DISPLAY_NAMES_w_name is not defined`**, including cause and fix.

---

## 1. Current Wallet Setup

### 1.1 Component tree

```
app/layout.tsx (Root Layout, server)
└── <QueryProvider>
    └── <ClientOnlyWalletProvider>
        └── {children}  ← app pages render here
            └── e.g. app/page.tsx
                └── <Layout>
                    └── <Header walletSlot={<ConnectWallet />} />
                    └── <main>…</main>
```

- **Layout** is a client component that renders **Header** with **ConnectWallet** in a slot.
- **ConnectWallet** uses `useWallet()` from `@solana/wallet-adapter-react`, so it **must** be rendered inside a **WalletProvider**.

### 1.2 Why we don’t put WalletProvider in the root layout directly

Solana packages (`@solana/web3.js`, `@noble/*`, wallet adapters) are not safe to run during Next.js server-side rendering (SSR). They can throw when imported or executed on the server (e.g. “root module cannot be imported”). So we must:

1. **Never** import or run wallet code on the server.
2. **Only** mount the wallet provider on the client, after the first paint.

That’s why the root layout uses a **client-only** gate instead of rendering `WalletProvider` directly.

### 1.3 ClientOnlyWalletProvider

**File:** `components/providers/ClientOnlyWalletProvider.tsx`

- **Role:** Gate that mounts Solana wallet providers only on the client.
- **Behavior:**
  - On **first client render:** `mounted` is `false` and `WalletProviderWrapper` is not loaded yet → returns **`null`** (no children).
  - In **useEffect:** sets `mounted = true` and dynamically imports `WalletProviderWrapper`.
  - After the import resolves: re-renders and returns `<WalletProviderWrapper>{children}</WalletProviderWrapper>`.

We **intentionally** do not render `children` until the wallet provider is in the tree. If we rendered `children` before that, **Layout → Header → ConnectWallet** would mount and call `useWallet()` with no **WalletProvider**, causing:  
*“You have tried to read … on a WalletContext without providing one.”*

### 1.4 WalletProviderWrapper

**File:** `components/providers/WalletProviderWrapper.tsx`

- **Role:** Provides Solana RPC connection and wallet adapters to the tree.
- **Behavior:**
  - Reads RPC and network from `getSolanaConfig()` (env: `NEXT_PUBLIC_SOLANA_NETWORK`, `NEXT_PUBLIC_RPC_URL`, etc.).
  - Instantiates adapters: **Phantom**, **Solflare**, **Trust**, **Ledger**.
  - Renders `ConnectionProvider` → `WalletProvider` (with `autoConnect` and `localStorageKey: 'nexus-wallet'`) → children.
  - Renders a small **WalletChangeHandlerSafe** (uses `useWalletChange`) that runs only after mount.

So any component under **ClientOnlyWalletProvider** that eventually renders under **WalletProviderWrapper** (including **ConnectWallet**) can safely use **useWallet()**.

### 1.5 ConnectWallet

**File:** `components/ConnectWallet.tsx`

- **Role:** UI for connecting/disconnecting Solana wallets (button, modal list, dropdown when connected).
- **Data:** Uses `useWallet()` for `wallets`, `select`, `connect`, `disconnect`, `connected`, `connecting`, `publicKey`, `wallet`.
- **Display names:** Wallet labels (e.g. “Phantom”, “Trust Wallet”) come from an **inline function `toLabel(name)`**, not from a shared object like `WALLET_DISPLAY_NAMES[name]`. Each row has a `displayName` set in `useMemo` via `toLabel(name)`.
- **Supporting modules:**
  - `lib/wallet/installUrls.ts` – install URLs and `getWalletInstallUrl`, `isNotInstalledError`.
  - `lib/wallet/iconPaths.ts` – `getWalletIconPath` for wallet icons.
  - `lib/solana/config.ts` – `getCurrentNetwork`, `getNetworkDisplayName`, etc.
  - `WALLET_STORAGE_KEY` from `WalletProviderWrapper` for “last connected” wallet in `localStorage`.

### 1.6 Data flow summary

| Step | What happens |
|------|-----------------------------|
| 1 | Root layout renders `ClientOnlyWalletProvider`; first client render returns `null`. |
| 2 | After mount + dynamic import, `WalletProviderWrapper` wraps `children`. |
| 3 | Pages (e.g. Home) render `Layout` → `Header` → `ConnectWallet`. |
| 4 | `ConnectWallet` runs `useWallet()` inside `WalletProvider` → no context error. |
| 5 | User connects; wallet state lives in adapter + `localStorage` (`nexus-wallet`). |

---

## 2. The error: `_WALLET_DISPLAY_NAMES_w_name is not defined`

### 2.1 What you see

- **Message:** `ReferenceError: _WALLET_DISPLAY_NAMES_w_name is not defined`
- **Location:** Reported at `ConnectWallet.tsx` around line 389 (e.g. at the error block `<div className={styles.errorBlock} role="alert">`).
- **Stack:** Often shows `eval` → `ConnectWallet.tsx` → `Array.map` → … → `Header` → `Layout` → `Home`.

So the error occurs at runtime when rendering **ConnectWallet**, but the **variable name** (`_WALLET_DISPLAY_NAMES_w_name`) does not appear anywhere in the current source.

### 2.2 Cause

- The name **`_WALLET_DISPLAY_NAMES_w_name`** looks like a **minified/bundler-generated** identifier. It is the kind of name a bundler (e.g. Webpack) would create for an expression like **`WALLET_DISPLAY_NAMES[w.name]`** or similar when optimizing or inlining.
- In the **current** code there is **no** `WALLET_DISPLAY_NAMES` object. Display names are provided by:
  - The function **`toLabel(n)`** in `ConnectWallet.tsx`, and
  - The **`displayName`** field on each wallet row (set from `toLabel(name)` in `useMemo`).
- So the runtime is still executing **old compiled code** that referred to something like `WALLET_DISPLAY_NAMES[w.name]`. That code was removed/refactored, but the **cached build** (e.g. in `.next`) still contains a reference to the generated variable `_WALLET_DISPLAY_NAMES_w_name`, which is no longer defined in the new bundle → **ReferenceError**.

In short: **stale Next.js/Webpack cache** from a previous version of the code that used a `WALLET_DISPLAY_NAMES`-style lookup.

### 2.3 Why the stack points at line 389

- The **real** failing code in the cached bundle is likely inside the **`.map`** over `sortedWallets` (where `w.name` and `w.displayName` are used). Source maps can point to a nearby line (e.g. the error block) instead of the exact expression. So the reported line is a hint, not necessarily the exact line that references the removed variable.

---

## 3. Fix

### 3.1 Clear the Next.js build cache and restart

1. Stop the dev server.
2. Delete the Next.js cache directory:
   - **Windows (PowerShell):**  
     `Remove-Item -Recurse -Force .next`
   - Or manually delete the `Frontend/.next` folder.
3. Start the dev server again, e.g. `yarn dev` or `npm run dev`.

After a clean build, the bundle will no longer contain the old `_WALLET_DISPLAY_NAMES_w_name` reference, and the error should disappear.

**Additional safeguard:** The comment above `toLabel()` in `ConnectWallet.tsx` was changed so it no longer contains the string `WALLET_DISPLAY_NAMES[key]`. That string can end up in bundled source or source maps and some tooling may derive the identifier `_WALLET_DISPLAY_NAMES_w_name` from it; removing it from source avoids that.

### 3.2 If the error reappears after future refactors

- Any time you remove or rename a variable/object that the bundler might have inlined or optimized (e.g. a lookup like `SOME_OBJECT[key]`), do a **clean build** (delete `.next` and restart) to avoid stale references.

---

## 4. Summary

| Topic | Summary |
|-------|---------|
| **Setup** | Root layout uses **ClientOnlyWalletProvider** so wallet code runs only on the client. It returns `null` until **WalletProviderWrapper** is loaded, then wraps children with **ConnectionProvider** + **WalletProvider**. **ConnectWallet** in **Header** therefore always has a **WalletProvider** when it calls **useWallet()**. |
| **Error** | **`_WALLET_DISPLAY_NAMES_w_name is not defined`** comes from **stale Webpack/Next.js cache**: old compiled code still references a variable that no longer exists (from when display names used something like `WALLET_DISPLAY_NAMES[w.name]`). Current code uses **`toLabel()`** and **`displayName`** only. |
| **Fix** | Delete **`.next`** and restart the dev server so the app is built from current source without the old reference. |

---

## 5. Other console errors (reference)

### 5.1 `Cannot redefine property: ethereum` / MetaMask “cannot set property ethereum”

- **Source:** `evmAsk.js`, MetaMask `inpage.js`, or other **EVM wallet extensions**.
- **Cause:** Multiple browser extensions (e.g. evmAsk, MetaMask) each try to set or redefine `window.ethereum`. One of them defines it with a getter (non-configurable), so the other throws.
- **Not fixable in app code.** This is extension-vs-extension conflict. The app is **Solana-only** and does not use `window.ethereum`; you can safely ignore these errors or disable one EVM extension when developing.

### 5.2 `WalletNotSelectedError` when clicking a wallet

- **Cause:** `select(walletName)` updates React state asynchronously; calling `connect()` immediately can run before the provider has the selected wallet.
- **Fix (in app):** In `ConnectWallet.tsx`, after `select(name)`, wait for the next frame (e.g. double `requestAnimationFrame`) so the WalletProvider has committed the selection before `connect()` runs.

### 5.3 HMR: `Cannot read properties of null (reading 'removeChild')`

- **Source:** Next.js `mini-css-extract-plugin` hot module replacement.
- **Cause:** Known HMR bug when reloading CSS modules; not an error in your components.
- **Action:** Safe to ignore, or restart the dev server if it bothers you.

### 5.4 “Phantom was registered as a Standard Wallet” / “solflare-detect-metamask”

- Phantom is now part of the **Wallet Standard**, so the app does not include an explicit `PhantomWalletAdapter`; Phantom still appears in the list via the standard. The message is informational and does not break Solana wallet connection. “solflare-detect-metamask” is extension-internal.
