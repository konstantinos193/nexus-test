/**
 * Coin98 wallet adapter — uses only window.coin98.sol (Coin98's own namespace).
 * Does not interact with window.solana or other wallet extensions.
 *
 * @see https://docs.coin98.com/developer-guide/solana-dapps-integration
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
import { getCoin98Provider } from '@/lib/wallet/getProvider'

const COIN98_WALLET_NAME = 'Coin98 Wallet' as WalletName<'Coin98 Wallet'>

export class Coin98WalletAdapter extends BaseWalletAdapter<typeof COIN98_WALLET_NAME> {
  name = COIN98_WALLET_NAME
  url = 'https://coin98.com'
  icon = '/wallets/coin98.png'
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
    const provider = getCoin98Provider()
    if (!provider || this._connecting || this._publicKey) return

    this._connecting = true
    try {
      const res = await provider.request<string[]>({ method: 'sol_requestAccounts' })
      const accounts = res?.result
      if (accounts?.length) {
        const address = accounts[0]
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
    const provider = getCoin98Provider()
    this._readyState = provider ? WalletReadyState.Installed : WalletReadyState.NotDetected
    this.emit('readyStateChange', this._readyState)
  }

  async connect(): Promise<void> {
    const provider = getCoin98Provider()
    if (!provider) {
      const err = new WalletNotReadyError(
        'Coin98 Wallet is not installed. Install it at https://coin98.com'
      )
      this.emit('error', err)
      throw err
    }
    if (this._connecting || this._publicKey) return

    this._connecting = true

    try {
      const res = await provider.request<string[]>({ method: 'sol_requestAccounts' })
      if (res?.error) throw new Error(String(res.error))
      const accounts = res?.result
      if (!accounts?.length) throw new Error('No accounts returned')
      const address = accounts[0]
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
    const provider = getCoin98Provider()
    if (provider?.request) {
      try {
        await provider.request({ method: 'sol_disconnect', params: [] })
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
    const provider = getCoin98Provider()
    if (!provider) throw new Error('Coin98 Wallet is not installed')
    const publicKey = this._publicKey
    if (!publicKey) throw new Error('Wallet not connected')

    try {
      const res = await provider.request<{ signedTransaction?: string | Uint8Array } | Transaction | VersionedTransaction>({
        method: 'sol_sign',
        params: [transaction],
      })
      if (res?.error) throw new Error(String(res.error))
      const rawResult = (res as { result?: unknown }).result
      if (rawResult == null) throw new Error('No signed transaction returned')

      let signedRaw: Uint8Array
      if (typeof rawResult === 'string') {
        signedRaw = Uint8Array.from(atob(rawResult), (c) => c.charCodeAt(0))
      } else if (rawResult instanceof Uint8Array) {
        signedRaw = rawResult
      } else if (typeof rawResult === 'object' && rawResult !== null && 'signedTransaction' in rawResult) {
        const st = (rawResult as { signedTransaction: string | Uint8Array }).signedTransaction
        signedRaw =
          typeof st === 'string'
            ? Uint8Array.from(atob(st), (c) => c.charCodeAt(0))
            : st instanceof Uint8Array
              ? st
              : new Uint8Array(st)
      } else if (
        typeof rawResult === 'object' &&
        rawResult !== null &&
        'serialize' in rawResult &&
        typeof (rawResult as Transaction | VersionedTransaction).serialize === 'function'
      ) {
        const ser = (rawResult as Transaction | VersionedTransaction).serialize()
        signedRaw = ser instanceof Uint8Array ? ser : new Uint8Array(ser)
      } else {
        throw new Error('Unexpected signed transaction format')
      }

      return connection.sendRawTransaction(signedRaw, {
        skipPreflight: options?.skipPreflight,
        preflightCommitment: options?.preflightCommitment,
        maxRetries: options?.maxRetries,
      })
    } catch (err) {
      throw new WalletSendTransactionError(
        err instanceof Error ? err.message : String(err),
        err
      )
    }
  }
}
