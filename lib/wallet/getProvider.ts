/**
 * Wallet provider detection with multi-extension isolation.
 *
 * When multiple Solana wallet extensions are installed, they can overwrite
 * window.solana (whichever loads last wins). To avoid cross-wallet interaction:
 *
 * - Use Wallet Standard (navigator.wallets) in the app: WalletProvider merges
 *   Standard adapters via useStandardWalletAdapters(), so Phantom, Solflare,
 *   etc. each get their own StandardWalletAdapter and do not share window.solana.
 *
 * - For direct Phantom integration (e.g. deeplinks), use getPhantomProvider()
 *   so we always talk to Phantom's own namespace (window.phantom.solana), not
 *   the shared window.solana.
 *
 * - For direct Solflare integration, use getSolflareProvider() so we always talk
 *   to Solflare's own namespace (window.solflare), not the shared window.solana.
 *
 * - For direct Backpack integration, use getBackpackProvider() so we always talk
 *   to Backpack's own namespace (window.backpack), not the shared window.solana.
 *
 * - For direct Exodus integration, use getExodusProvider() so we always talk
 *   to Exodus's own namespace (window.exodus), not the shared window.solana.
 *   This prevents interacting with a different extension when the user has
 *   Phantom, Solflare, Backpack, Exodus, etc. all installed.
 *
 * - For direct Coinbase Wallet (Solana) / Base extension integration, use
 *   getCoinbaseSolanaProvider() so we always talk to window.coinbaseSolana,
 *   not the shared window.solana. (Solana NFT launchpads use extensions only;
 *   OnchainKit / "Sign in with Base" is for Base EVM, not needed here.)
 *
 * - For direct Brave Wallet (Solana) integration, use getBraveSolanaProvider()
 *   so we always talk to window.braveSolana, not the shared window.solana.
 *   Brave also exposes window.solana as an alias; we use only window.braveSolana
 *   so we do not interact with other extensions (Phantom, Solflare, etc.).
 *
 * @see https://docs.phantom.com/ (Detect the provider, Establish a connection)
 * @see https://docs.solflare.com/ (Integrate Solflare)
 * @see https://docs.backpack.app/ (Deeplinks, Provider Methods)
 * @see https://doc-exodus.pages.dev/ (Exodus Web3 Wallet / Solana Wallet Adapter)
 * @see https://docs.cdp.coinbase.com/coinbase-wallet/solana-developers/injected-solana-provider/
 * @see https://github.com/brave/brave-browser/wiki/Brave-Wallet (Solana: window.braveSolana; do not use window.solana for Brave)
 */

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomSolanaProvider
    }
    /** Solflare extension's own namespace; use this instead of window.solana when multiple wallets are installed. */
    solflare?: SolflareProvider
    /** Backpack extension's own namespace; use this instead of window.solana when multiple wallets are installed. */
    backpack?: BackpackProvider
    /** Exodus extension's own namespace; use this instead of window.solana when multiple wallets are installed. */
    exodus?: ExodusProvider
    /** Coinbase Wallet / Base extension Solana provider; use this instead of window.solana when multiple wallets are installed. */
    coinbaseSolana?: CoinbaseSolanaProvider
    /** Brave Wallet Solana provider; use this instead of window.solana so we do not interact with other extensions. */
    braveSolana?: BraveSolanaProvider
    /** Glow wallet's own namespace; use this instead of window.solana so we do not interact with other wallets. */
    glow?: GlowProvider
    /** Magic Eden wallet's Solana provider; use this instead of window.solana so we do not interact with other wallets. */
    magicEden?: { solana?: MagicEdenSolanaProvider }
    /** Bitget Wallet (BitKeep) injects window.bitkeep.solana; use this instead of window.solana so we do not interact with other wallets. */
    bitkeep?: { solana?: BitgetSolanaProvider }
    /** Coin98 wallet injects window.coin98.sol; use this instead of window.solana so we do not interact with other wallets. @see https://docs.coin98.com/developer-guide/solana-dapps-integration */
    coin98?: { sol?: Coin98SolanaProvider }
    /** Solflare mobile web app (e.g. in-app browser). */
    SolflareApp?: unknown
    solana?: unknown
  }
}

/** Coin98 wallet injects window.coin98.sol; request-based API: sol_requestAccounts, sol_sign, sol_signMessage. Use only window.coin98.sol so we do not interact with other wallets. @see https://docs.coin98.com/developer-guide/solana-dapps-integration */
export interface Coin98SolanaProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<{ result?: T; error?: unknown }>
}

/** MathWallet injects window.solana with isMathWallet flag. Connect via getAccount(), sign via signTransaction/signAllTransactions/signMessage(encodedMessage, "utf8"). @see https://docs.mathwallet.org/ (Solana – Integrating, Detecting the Provider) */
export interface MathWalletSolanaProvider {
  isMathWallet?: boolean
  publicKey?: { toString(): string; toBase58?(): string; toBytes?(): Uint8Array } | null
  isConnected?: boolean
  getAccount(): Promise<string>
  disconnect(): Promise<void>
  signTransaction<T>(transaction: T): Promise<T>
  signAllTransactions<T>(transactions: T[]): Promise<T[]>
  signMessage(message: Uint8Array, encoding: 'utf8'): Promise<{ signature: Uint8Array } | Uint8Array>
}

/** Bitget Wallet (BitKeep) injects window.bitkeep.solana. Wallet Standard–style connect (accounts array), signTransaction returns [{ signedTransaction: Uint8Array }]. @see https://web3.bitget.com/en/docs/connect/solana */
export interface BitgetSolanaProvider {
  connected?: boolean
  publicKey?: { toString(): string; toBase58?(): string; toBytes?(): Uint8Array } | null
  connect?(params?: { onlyIfTrusted?: boolean }): Promise<{ accounts: Array<{ address: string; publicKey: Uint8Array }> }>
  getAccount?(): Promise<string>
  disconnect?(): Promise<void>
  signMessage?(message: Uint8Array | string): Promise<Array<{ signedMessage: Uint8Array; signature: Uint8Array; signatureType?: string }>>
  signTransaction?<T>(transaction: T): Promise<Array<{ signedTransaction: Uint8Array }>>
  signAllTransactions?<T>(transactions: T[]): Promise<Array<{ signedTransaction: Uint8Array }>>
  signAndSendTransaction?(transaction: unknown, sendOptions?: unknown): Promise<Array<{ signature: Uint8Array }>>
  on?(event: string, callback: (...args: unknown[]) => void): void
}

/** Magic Eden wallet injects window.magicEden.solana; use this instead of window.solana so we do not interact with other extensions. @see https://docs-wallet.magiceden.io/solana/provider-api-methods */
export interface MagicEdenSolanaProvider {
  publicKey?: { toBase58(): string; toBytes(): Uint8Array } | null
  isConnected?: boolean
  connect?(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect?(): Promise<void>
  signTransaction?<T>(transaction: T): Promise<T>
  on?(event: string, callback: (...args: unknown[]) => void): void
  request?<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

/** Glow SDK: https://docs.glow.app/ — connect, signTransaction, signAndSendTransaction. Use window.glow only. */
export interface GlowProvider {
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ address: string; publicKey: GlowPublicKey }>
  signTransaction(params: { transactionBase64: string; network?: 'mainnet' | 'devnet' }): Promise<{ signature: string; signedTransactionBase64: string }>
  signAndSendTransaction(params: {
    transactionBase64: string
    network?: 'mainnet' | 'devnet'
    waitForConfirmation?: boolean
  }): Promise<{ signature: string }>
  signAllTransactions?(params: { transactionsBase64: string[]; network?: 'mainnet' | 'devnet' }): Promise<{ signedTransactionsBase64: string[] }>
}

export interface GlowPublicKey {
  toBase58(): string
  toBytes(): Uint8Array
  toBuffer?(): Buffer
  toString(): string
}

export interface PhantomSolanaProvider {
  isPhantom?: boolean
  publicKey?: { toBase58(): string; toBytes(): Uint8Array }
  isConnected?: boolean
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect(): Promise<void>
  on(event: string, callback: (...args: unknown[]) => void): void
  request<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

/** Solflare extension injects window.solflare with isSolflare; use this instead of window.solana when multiple wallets are installed. */
export interface SolflareProvider {
  isSolflare?: boolean
  publicKey?: { toBase58(): string; toBytes(): Uint8Array }
  isConnected?: boolean
  connect?(options?: unknown): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect?(): Promise<void>
  on?(event: string, callback: (...args: unknown[]) => void): void
  request?<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

/** Backpack extension injects window.backpack with isBackpack; use this instead of window.solana when multiple wallets are installed. */
export interface BackpackProvider {
  isBackpack?: boolean
  publicKey?: { toBase58(): string; toBytes(): Uint8Array }
  isConnected?: boolean
  connect?(options?: unknown): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect?(): Promise<void>
  on?(event: string, callback: (...args: unknown[]) => void): void
  request?<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

/** Exodus extension injects window.exodus with isExodus (or nested solana); use this instead of window.solana when multiple wallets are installed. */
export interface ExodusProvider {
  isExodus?: boolean
  /** Some Exodus builds expose Solana at exodus.solana. */
  solana?: ExodusSolanaProvider
  publicKey?: { toBase58(): string; toBytes(): Uint8Array }
  isConnected?: boolean
  connect?(options?: unknown): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect?(): Promise<void>
  on?(event: string, callback: (...args: unknown[]) => void): void
  request?<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

export interface ExodusSolanaProvider {
  isExodus?: boolean
  publicKey?: { toBase58(): string; toBytes(): Uint8Array }
  isConnected?: boolean
  connect?(options?: unknown): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect?(): Promise<void>
  on?(event: string, callback: (...args: unknown[]) => void): void
  request?<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

/** Coinbase Wallet / Base extension injects window.coinbaseSolana; use this instead of window.solana when multiple wallets are installed. */
export interface CoinbaseSolanaProvider {
  publicKey?: { toBase58(): string; toBytes(): Uint8Array } | null
  isConnected?: boolean
  connect?(options?: unknown): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect?(): Promise<void>
  on?(event: string, callback: (...args: unknown[]) => void): void
  request?<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

/** Brave Wallet injects window.braveSolana (window.solana is an alias; use only window.braveSolana so we do not interact with other extensions). */
export interface BraveSolanaProvider {
  isBraveWallet?: boolean
  isPhantom?: boolean
  publicKey?: { toBase58(): string; toBytes(): Uint8Array } | null
  isConnected?: boolean
  connect?(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string; toBytes(): Uint8Array } }>
  disconnect?(): Promise<void>
  on?(event: string, callback: (...args: unknown[]) => void): void
  request?<T = unknown>(args: { method: string; params?: unknown }): Promise<T>
}

/**
 * Returns Phantom's Solana provider from window.phantom.solana (Phantom's own
 * namespace). Use this instead of window.solana so multiple extensions don't
 * interact: window.solana can be overwritten by another wallet; window.phantom.solana
 * is always Phantom.
 *
 * @see https://docs.phantom.com/ (Detect the provider: check window.phantom?.solana?.isPhantom)
 */
export function getPhantomProvider(): PhantomSolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.phantom?.solana
  if (provider?.isPhantom) return provider
  return undefined
}

/**
 * True if Phantom extension is installed (Phantom's own namespace check).
 */
export function isPhantomInstalled(): boolean {
  return !!getPhantomProvider()
}

/**
 * Returns Solflare's provider from window.solflare (Solflare's own namespace).
 * Use this instead of window.solana so multiple extensions don't interact:
 * window.solana can be overwritten by another wallet; window.solflare is always Solflare.
 * When the user has Phantom, Solflare, Backpack, etc. all installed, this ensures
 * we talk only to the Solflare extension and never to a different one.
 *
 * @see https://docs.solflare.com/ (Integrate Solflare; extension uses window.solflare?.isSolflare)
 */
export function getSolflareProvider(): SolflareProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.solflare
  if (provider?.isSolflare) return provider
  return undefined
}

/**
 * True if Solflare extension is installed (Solflare's own namespace check).
 */
export function isSolflareInstalled(): boolean {
  return !!getSolflareProvider()
}

/**
 * Returns Backpack's provider from window.backpack (Backpack's own namespace).
 * Use this instead of window.solana so multiple extensions don't interact:
 * window.solana can be overwritten by another wallet; window.backpack is always Backpack.
 * When the user has Phantom, Solflare, Backpack, etc. all installed, this ensures
 * we talk only to the Backpack extension and never to a different one.
 *
 * @see https://docs.backpack.app/ (Deeplinks, Provider Methods; extension uses window.backpack?.isBackpack)
 */
export function getBackpackProvider(): BackpackProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.backpack
  if (provider?.isBackpack) return provider
  return undefined
}

/**
 * True if Backpack extension is installed (Backpack's own namespace check).
 */
export function isBackpackInstalled(): boolean {
  return !!getBackpackProvider()
}

/**
 * Returns Exodus's Solana provider from window.exodus (or window.exodus.solana when nested).
 * Use this instead of window.solana so multiple extensions don't interact:
 * window.solana can be overwritten by another wallet; window.exodus is always Exodus.
 * When the user has Phantom, Solflare, Backpack, Exodus, etc. all installed, this ensures
 * we talk only to the Exodus extension and never to a different one.
 *
 * @see https://doc-exodus.pages.dev/ (Exodus Web3 Wallet; Solana Wallet Adapter / Wallet Standard)
 */
export function getExodusProvider(): ExodusProvider | ExodusSolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const exodus = window.exodus
  if (!exodus) return undefined
  // Prefer nested Solana provider when present (e.g. window.exodus.solana).
  const solana = exodus.solana
  if (solana && (solana as ExodusSolanaProvider).isExodus) return solana as ExodusSolanaProvider
  if (exodus.isExodus) return exodus
  return undefined
}

/**
 * True if Exodus extension is installed (Exodus's own namespace check).
 */
export function isExodusInstalled(): boolean {
  return !!getExodusProvider()
}

/**
 * Returns Coinbase Wallet's Solana provider from window.coinbaseSolana (Coinbase's own namespace).
 * Use this instead of window.solana so multiple extensions don't interact:
 * window.solana can be overwritten by another wallet; window.coinbaseSolana is always Coinbase/Base.
 * When the user has Phantom, Solflare, Coinbase Wallet, etc. all installed, this ensures
 * we talk only to the Coinbase Wallet extension and never to a different one.
 *
 * @see https://docs.cdp.coinbase.com/coinbase-wallet/solana-developers/injected-solana-provider/
 */
export function getCoinbaseSolanaProvider(): CoinbaseSolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.coinbaseSolana
  if (provider && typeof provider.connect === 'function') return provider
  return undefined
}

/**
 * True if Coinbase Wallet (Solana) / Base extension is installed (Coinbase's own namespace check).
 */
export function isCoinbaseWalletInstalled(): boolean {
  return !!getCoinbaseSolanaProvider()
}

/**
 * Returns Brave Wallet's Solana provider from window.braveSolana (Brave's own namespace).
 * Use this instead of window.solana so multiple extensions don't interact: window.solana
 * can be overwritten by another wallet; window.braveSolana is always Brave. Do not use
 * window.solana for Brave so we do not interact with Phantom, Solflare, etc.
 *
 * @see https://github.com/brave/brave-browser/wiki/Brave-Wallet (Solana: window.braveSolana; isBraveWallet)
 */
export function getBraveSolanaProvider(): BraveSolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.braveSolana
  if (provider?.isBraveWallet) return provider
  return undefined
}

/**
 * True if Brave Wallet is installed (Brave's own namespace check: window.braveSolana.isBraveWallet).
 */
export function isBraveWalletInstalled(): boolean {
  return !!getBraveSolanaProvider()
}

/**
 * Returns Glow's provider from window.glow (Glow's own namespace).
 * Use this instead of window.solana so we do not interact with other wallets:
 * when the user selects Glow, all connect/sign/send flows use window.glow only.
 *
 * @see https://docs.glow.app/ (Detecting Glow: window.glow != null; Connecting: window.glow.connect())
 */
export function getGlowProvider(): GlowProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const glow = window.glow
  if (glow && typeof glow.connect === 'function') return glow
  return undefined
}

/**
 * True if Glow is installed (Glow's own namespace: window.glow).
 */
export function isGlowInstalled(): boolean {
  return !!getGlowProvider()
}

/**
 * Returns Magic Eden's Solana provider from window.magicEden.solana (Magic Eden's own namespace).
 * Use this instead of window.solana so we do not interact with other extensions:
 * when the user selects Magic Eden Wallet, all connect/sign flows use window.magicEden.solana only.
 *
 * @see https://docs-wallet.magiceden.io/solana/provider-api-methods
 */
export function getMagicEdenProvider(): MagicEdenSolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.magicEden?.solana
  if (provider && typeof provider.connect === 'function') return provider
  return undefined
}

/**
 * True if Magic Eden Wallet is installed (Magic Eden's own namespace: window.magicEden.solana).
 */
export function isMagicEdenInstalled(): boolean {
  return !!getMagicEdenProvider()
}

/**
 * Returns Bitget Wallet's Solana provider from window.bitkeep.solana (Bitget's own namespace).
 * Use this instead of window.solana so we do not interact with other extensions:
 * when the user selects Bitget Wallet, all connect/sign flows use window.bitkeep.solana only.
 *
 * @see https://web3.bitget.com/en/docs/connect/solana
 */
export function getBitgetProvider(): BitgetSolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.bitkeep?.solana
  if (provider && typeof provider.connect === 'function') return provider
  return undefined
}

/**
 * True if Bitget Wallet is installed (Bitget's own namespace: window.bitkeep.solana).
 */
export function isBitgetInstalled(): boolean {
  return !!getBitgetProvider()
}

/**
 * Returns Coin98's Solana provider from window.coin98.sol (Coin98's own namespace).
 * Use this instead of window.solana so we do not interact with other extensions:
 * when the user selects Coin98 Wallet, all connect/sign flows use window.coin98.sol only.
 *
 * @see https://docs.coin98.com/developer-guide/solana-dapps-integration
 */
export function getCoin98Provider(): Coin98SolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.coin98?.sol
  if (provider && typeof provider.request === 'function') return provider
  return undefined
}

/**
 * True if Coin98 Wallet is installed (Coin98's own namespace: window.coin98.sol).
 */
export function isCoin98Installed(): boolean {
  return !!getCoin98Provider()
}

/**
 * Returns MathWallet's Solana provider from window.solana when isMathWallet is true.
 * MathWallet injects window.solana and sets isMathWallet so we only use it when the user selects MathWallet.
 *
 * @see https://docs.mathwallet.org/ (Solana – Detecting the Provider: window.solana && window.solana.isMathWallet)
 */
export function getMathWalletProvider(): MathWalletSolanaProvider | undefined {
  if (typeof window === 'undefined') return undefined
  const provider = window.solana as MathWalletSolanaProvider | undefined
  if (provider?.isMathWallet && typeof provider.getAccount === 'function') return provider
  return undefined
}

/**
 * True if MathWallet extension is installed (window.solana.isMathWallet).
 */
export function isMathWalletInstalled(): boolean {
  return !!getMathWalletProvider()
}
