/**
 * Official install / download URLs for wallet extensions.
 * Used when wallet is not installed (error UX: show message + link).
 */

export const WALLET_INSTALL_URLS: Record<string, string> = {
  Phantom: 'https://phantom.app/download',
  Solflare: 'https://solflare.com/download',
  Backpack: 'https://backpack.app/download',
  Glow: 'https://glow.app',
  'Trust Wallet': 'https://trustwallet.com/download',
  Trust: 'https://trustwallet.com/download',
  Exodus: 'https://exodus.com/download',
  'Coinbase Wallet': 'https://www.coinbase.com/wallet/downloads',
  'Brave Wallet': 'https://brave.com/wallet/',
  'Bitget Wallet': 'https://web3.bitget.com/',
  'Coin98 Wallet': 'https://coin98.com/',
  MathWallet: 'https://mathwallet.org/',
  'SafePal Wallet': 'https://www.safepal.com/download',
  'Atomic Wallet': 'https://atomicwallet.io/',
  'Guarda Wallet': 'https://guarda.com/',
  'OKX Wallet': 'https://www.okx.com/web3',
  'Binance Wallet': 'https://www.binance.com/en/web3wallet',
  'Binance Web3 Wallet': 'https://www.binance.com/en/web3wallet',
  TokenPocket: 'https://www.tokenpocket.pro/',
  Zelcore: 'https://zelcore.io/',
  'Torus Wallet': 'https://tor.us/',
  'Nightly Wallet': 'https://nightly.app/',
  FoxWallet: 'https://foxwallet.com/',
  'iToken Wallet': 'https://www.token.im/',
  'Infinity Wallet': 'https://infinitywallet.io/',
  Coinomi: 'https://www.coinomi.com/',
  'Wombat Wallet': 'https://www.wombat.app/',
  'Nufi Wallet': 'https://nufi.com/',
  'HyperPay Wallet': 'https://www.hyperpay.tech/',
  'Safeheron Wallet': 'https://www.safeheron.com/',
  imToken: 'https://token.im/',
  ImToken: 'https://token.im/',
  Ledger: 'https://www.ledger.com/ledger-live',
  WalletConnect: 'https://walletconnect.com',
}

export function getWalletInstallUrl(walletName: string): string | undefined {
  return WALLET_INSTALL_URLS[walletName]
}

export function isNotInstalledError(error: unknown): boolean {
  if (error == null) return false
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase()
  return (
    msg.includes('not installed') ||
    msg.includes('no provider') ||
    msg.includes('wallet not installed')
  )
}
