/**
 * Glow wallet adapter — uses only window.glow (Glow SDK).
 * Does not interact with window.solana or other wallet extensions.
 *
 * @see https://docs.glow.app/ (Detecting Glow, Connecting, Executing Transactions)
 */

import type {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js'
import { PublicKey as SolanaPublicKey } from '@solana/web3.js'
import {
  BaseWalletAdapter,
  type SendTransactionOptions,
  type WalletName,
  WalletConnectionError,
  WalletNotReadyError,
  WalletReadyState,
} from '@solana/wallet-adapter-base'
import { isVersionedTransaction } from '@solana/wallet-adapter-base'
import { getGlowProvider } from '@/lib/wallet/getProvider'
import { getCurrentNetwork } from '@/lib/solana/config'

const GLOW_WALLET_NAME = 'Glow' as WalletName<'Glow'>

function toBase64(bytes: Uint8Array | Buffer): string {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(bytes)) {
    return bytes.toString('base64')
  }
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i])
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(u8).toString('base64')
}

function fromBase64(base64: string): Uint8Array {
  const binary = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Map app network to Glow SDK network param. */
function toGlowNetwork(): 'mainnet' | 'devnet' {
  const net = getCurrentNetwork()
  if (net === 'mainnet-beta') return 'mainnet'
  return 'devnet'
}

export class GlowWalletAdapter extends BaseWalletAdapter<typeof GLOW_WALLET_NAME> {
  name = GLOW_WALLET_NAME
  url = 'https://glow.app'
  icon = '/wallets/glow.svg'
  supportedTransactionVersions = null

  private _connecting = false
  private _publicKey: PublicKey | null = null
  private _readyState: WalletReadyState = WalletReadyState.NotDetected

  constructor() {
    super()
    this._setReadyState()
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => this._setReadyState())
    }
  }

  get publicKey(): PublicKey | null {
    return this._publicKey
  }

  get connecting(): boolean {
    return this._connecting
  }

  get readyState(): WalletReadyState {
    return this._readyState
  }

  override async autoConnect(): Promise<void> {
    const glow = getGlowProvider()
    if (!glow || this._connecting || this._publicKey) return

    this._connecting = true
    try {
      const resp = await glow.connect({ onlyIfTrusted: true })
      this._publicKey = new SolanaPublicKey(resp.address)
      this.emit('connect', this._publicKey)
    } catch {
      // Silent fail: user has not connected before; no prompt shown
    } finally {
      this._connecting = false
    }
  }

  private _setReadyState(): void {
    const glow = getGlowProvider()
    this._readyState = glow ? WalletReadyState.Installed : WalletReadyState.NotDetected
    this.emit('readyStateChange', this._readyState)
  }

  async connect(): Promise<void> {
    const glow = getGlowProvider()
    if (!glow) {
      const err = new WalletNotReadyError('Glow is not installed. Install it at https://glow.app')
      this.emit('error', err)
      throw err
    }
    if (this._connecting || this._publicKey) return

    this._connecting = true

    try {
      const resp = await glow.connect()
      const address = resp.address
      this._publicKey = new SolanaPublicKey(address)
      this.emit('connect', this._publicKey)
    } catch (err) {
      const walletErr = new WalletConnectionError(
        err instanceof Error ? err.message : String(err),
        err
      )
      this.emit('error', walletErr)
      throw walletErr
    } finally {
      this._connecting = false
    }
  }

  async disconnect(): Promise<void> {
    this._publicKey = null
    this.emit('disconnect')
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<TransactionSignature> {
    const glow = getGlowProvider()
    if (!glow) throw new Error('Glow is not installed')
    const publicKey = this._publicKey
    if (!publicKey) throw new Error('Wallet not connected')

    const serialized =
      isVersionedTransaction(transaction) ? transaction.serialize() : (transaction as Transaction).serialize()
    const transactionBase64 = toBase64(serialized instanceof Uint8Array ? serialized : new Uint8Array(serialized))
    const network = toGlowNetwork()

    const { signedTransactionBase64 } = await glow.signTransaction({
      transactionBase64,
      network,
    })

    const signedRaw = fromBase64(signedTransactionBase64)
    return connection.sendRawTransaction(signedRaw, {
      skipPreflight: options?.skipPreflight,
      preflightCommitment: options?.preflightCommitment,
      maxRetries: options?.maxRetries,
    })
  }
}
