/**
 * Bitget Wallet adapter — uses only window.bitkeep.solana (Bitget's own namespace).
 * Does not interact with window.solana or other wallet extensions.
 *
 * @see https://web3.bitget.com/en/docs/connect/solana
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
import { getBitgetProvider } from '@/lib/wallet/getProvider'

const BITGET_WALLET_NAME = 'Bitget Wallet' as WalletName<'Bitget Wallet'>

export class BitgetWalletAdapter extends BaseWalletAdapter<typeof BITGET_WALLET_NAME> {
  name = BITGET_WALLET_NAME
  url = 'https://web3.bitget.com'
  icon = '/wallets/bitget.png'
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
    const provider = getBitgetProvider()
    if (!provider || this._connecting || this._publicKey) return

    this._connecting = true
    try {
      const result = await provider.connect?.({ onlyIfTrusted: true })
      if (result?.accounts?.length) {
        const address = result.accounts[0].address
        this._publicKey = new SolanaPublicKey(address)
        this.emit('connect', this._publicKey)
      }
    } catch {
      // Silent fail: user has not connected before
    } finally {
      this._connecting = false
    }
  }

  private _setReadyState(): void {
    const provider = getBitgetProvider()
    this._readyState = provider ? WalletReadyState.Installed : WalletReadyState.NotDetected
    this.emit('readyStateChange', this._readyState)
  }

  async connect(): Promise<void> {
    const provider = getBitgetProvider()
    if (!provider?.connect) {
      const err = new WalletNotReadyError(
        'Bitget Wallet is not installed. Install it at https://web3.bitget.com'
      )
      this.emit('error', err)
      throw err
    }
    if (this._connecting || this._publicKey) return

    this._connecting = true

    try {
      const result = await provider.connect()
      if (!result?.accounts?.length) throw new Error('No accounts returned')
      const address = result.accounts[0].address
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
    const provider = getBitgetProvider()
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
    const provider = getBitgetProvider()
    if (!provider?.signTransaction) throw new Error('Bitget Wallet is not installed')
    const publicKey = this._publicKey
    if (!publicKey) throw new Error('Wallet not connected')

    let signedRaw: Uint8Array
    try {
      const results = await provider.signTransaction(transaction)
      const first = results?.[0]
      if (!first?.signedTransaction) throw new Error('No signed transaction returned')
      signedRaw = first.signedTransaction instanceof Uint8Array
        ? first.signedTransaction
        : new Uint8Array(first.signedTransaction)
    } catch (err) {
      throw new WalletSendTransactionError(
        err instanceof Error ? err.message : String(err),
        err
      )
    }

    return connection.sendRawTransaction(signedRaw, {
      skipPreflight: options?.skipPreflight,
      preflightCommitment: options?.preflightCommitment,
      maxRetries: options?.maxRetries,
    })
  }
}
