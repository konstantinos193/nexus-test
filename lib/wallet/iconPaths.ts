/**
 * Local wallet icon paths (/wallets/*.svg).
 * Use when adapter.icon is missing or for fallback list.
 * Wallets without an entry fall back to undefined (no icon in list).
 */
const WALLET_ICON_PATHS: Record<string, string> = {
  Phantom: '/wallets/phantom.svg',
  Solflare: '/wallets/solflare.svg',
  Backpack: '/wallets/backpack.png',
  Glow: '/wallets/glow.svg',
  Exodus: '/wallets/exodus.svg',
  MetaMask: '/wallets/MetaMask.svg',
  'MetaMask Solana': '/wallets/MetaMask.svg',
  'Magic Eden': '/wallets/ME.png',
  'Magic Eden Wallet': '/wallets/ME.png',
  'Bitget Wallet': '/wallets/bitget.png',
  'Coin98 Wallet': '/wallets/coin98.png',
  MathWallet: '/wallets/mathwallet.svg',
  'Coinbase Wallet': '/wallets/coinbase.svg',
  'Brave Wallet': '/wallets/brave.svg',
  Trust: '/wallets/Trust.svg',
  'Trust Wallet': '/wallets/Trust.svg',
  Ledger: '/wallets/ledger.svg',
  WalletConnect: '/wallets/walletconnect.svg',
}

export function getWalletIconPath(walletName: string): string | undefined {
  return WALLET_ICON_PATHS[walletName] ?? WALLET_ICON_PATHS[walletName.replace(/\s+/g, '')]
}
