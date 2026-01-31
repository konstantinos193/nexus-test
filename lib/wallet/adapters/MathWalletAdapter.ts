/**
 * MathWallet adapter — uses only window.solana when isMathWallet is true.
 * Does not interact with other wallet extensions; detection via isMathWallet flag.
 *
 * @see https://docs.mathwallet.org/ (Solana – Integrating, Detecting the Provider, Establishing a Connection, Sending a Transaction, Signing a Message)
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
import { getMathWalletProvider } from '@/lib/wallet/getProvider'

const MATH_WALLET_NAME = 'MathWallet' as WalletName<'MathWallet'>

export class MathWalletAdapter extends BaseWalletAdapter<typeof MATH_WALLET_NAME> {
  name = MATH_WALLET_NAME
  url = 'https://mathwallet.org'
  icon = '/wallets/mathwallet.svg'
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
    const provider = getMathWalletProvider()
    if (!provider || this._connecting || this._publicKey) return

    this._connecting = true
    try {
      const account = await provider.getAccount()
      if (account) {
        this._publicKey = new SolanaPublicKey(account)
        this.emit('connect', this._publicKey)
      }
    } catch {
      // Silent fail: user has not connected before; no prompt shown
    } finally {
      this._connecting = false
    }
  }

  private _setReadyState(): void {
    const provider = getMathWalletProvider()
    this._readyState = provider ? WalletReadyState.Installed : WalletReadyState.NotDetected
    this.emit('readyStateChange', this._readyState)
  }

  async connect(): Promise<void> {
    const provider = getMathWalletProvider()
    if (!provider) {
      const err = new WalletNotReadyError(
        'MathWallet is not installed. Install it at https://mathwallet.org/'
      )
      this.emit('error', err)
      throw err
    }
    if (this._connecting || this._publicKey) return

    this._connecting = true

    try {
      const account = await provider.getAccount()
      if (!account) throw new Error('No account returned')
      this._publicKey = new SolanaPublicKey(account)
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
    const provider = getMathWalletProvider()
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
    const provider = getMathWalletProvider()
    if (!provider?.signTransaction) throw new Error('MathWallet is not installed')
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

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = getMathWalletProvider()
    if (!provider?.signMessage) throw new Error('MathWallet is not installed')
    if (!this._publicKey) throw new Error('Wallet not connected')

    const result = await provider.signMessage(message, 'utf8')
    if (result instanceof Uint8Array) return result
    if (result?.signature) return result.signature
    throw new Error('No signature returned from MathWallet')
  }
}
