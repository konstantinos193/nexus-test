/**
 * Magic Eden wallet adapter — uses only window.magicEden.solana.
 * Does not interact with window.solana or other wallet extensions.
 *
 * @see https://docs-wallet.magiceden.io/solana/provider-api-methods
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
  WalletSendTransactionError,
} from '@solana/wallet-adapter-base'
import { isVersionedTransaction } from '@solana/wallet-adapter-base'
import { getMagicEdenProvider } from '@/lib/wallet/getProvider'

const MAGIC_EDEN_WALLET_NAME = 'Magic Eden' as WalletName<'Magic Eden'>

export class MagicEdenWalletAdapter extends BaseWalletAdapter<typeof MAGIC_EDEN_WALLET_NAME> {
  name = MAGIC_EDEN_WALLET_NAME
  url = 'https://wallet.magiceden.io'
  icon = '/wallets/ME.png'
  supportedTransactionVersions = new Set(['legacy', 0] as const)

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
    const provider = getMagicEdenProvider()
    if (!provider || this._connecting || this._publicKey) return

    this._connecting = true
    try {
      const resp = await provider.connect?.({ onlyIfTrusted: true })
      if (resp?.publicKey) {
        this._publicKey = new SolanaPublicKey(resp.publicKey.toBase58())
        this.emit('connect', this._publicKey)
      }
    } catch {
      // Silent fail: user has not connected before
    } finally {
      this._connecting = false
    }
  }

  private _setReadyState(): void {
    const provider = getMagicEdenProvider()
    this._readyState = provider ? WalletReadyState.Installed : WalletReadyState.NotDetected
    this.emit('readyStateChange', this._readyState)
  }

  async connect(): Promise<void> {
    const provider = getMagicEdenProvider()
    if (!provider?.connect) {
      const err = new WalletNotReadyError('Magic Eden Wallet is not installed. Install it at https://wallet.magiceden.io')
      this.emit('error', err)
      throw err
    }
    if (this._connecting || this._publicKey) return

    this._connecting = true

    try {
      const resp = await provider.connect()
      if (!resp?.publicKey) throw new Error('No public key returned')
      this._publicKey = new SolanaPublicKey(resp.publicKey.toBase58())
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
    const provider = getMagicEdenProvider()
    if (provider?.disconnect) {
      try {
        await provider.disconnect()
      } catch {
        // ignore
      }
    }
    this._publicKey = null
    this.emit('disconnect')
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<TransactionSignature> {
    const provider = getMagicEdenProvider()
    if (!provider?.signTransaction) throw new Error('Magic Eden Wallet is not installed')
    const publicKey = this._publicKey
    if (!publicKey) throw new Error('Wallet not connected')

    let signedTx: Transaction | VersionedTransaction
    try {
      const signed = await provider.signTransaction(transaction)
      signedTx = (signed ?? transaction) as Transaction | VersionedTransaction
    } catch (err) {
      throw new WalletSendTransactionError(
        err instanceof Error ? err.message : String(err),
        err
      )
    }
    const serialized =
      isVersionedTransaction(signedTx)
        ? signedTx.serialize()
        : (signedTx as Transaction).serialize()
    const raw = serialized instanceof Uint8Array ? serialized : new Uint8Array(serialized)
    return connection.sendRawTransaction(raw, {
      skipPreflight: options?.skipPreflight,
      preflightCommitment: options?.preflightCommitment,
      maxRetries: options?.maxRetries,
    })
  }
}
