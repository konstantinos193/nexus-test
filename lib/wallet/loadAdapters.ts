/**
 * Load wallet adapters (dynamic import). Keeps crypto / adapters out of initial bundle.
 * Run only on client (e.g. from useEffect in WalletProviderShell).
 */

import type { Adapter } from '@solana/wallet-adapter-base'
import { initializeWhenDetected } from '@solflare-wallet/metamask-wallet-standard'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { LedgerWalletAdapter } from '@solana/wallet-adapter-ledger'
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust'
import { GlowWalletAdapter } from '@/lib/wallet/adapters/GlowWalletAdapter'
import { MagicEdenWalletAdapter } from '@/lib/wallet/adapters/MagicEdenWalletAdapter'
import { BitgetWalletAdapter } from '@/lib/wallet/adapters/BitgetWalletAdapter'
import { Coin98WalletAdapter } from '@/lib/wallet/adapters/Coin98WalletAdapter'
import { MathWalletAdapter } from '@/lib/wallet/adapters/MathWalletAdapter'

export async function loadAdapters(): Promise<Adapter[]> {
  initializeWhenDetected()
  return [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new GlowWalletAdapter(),
    new MagicEdenWalletAdapter(),
    new BitgetWalletAdapter(),
    new Coin98WalletAdapter(),
    new MathWalletAdapter(),
    new TrustWalletAdapter(),
    new LedgerWalletAdapter(),
  ]
}
