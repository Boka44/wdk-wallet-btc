// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict'

import { crypto, payments, Psbt, initEccLib } from 'bitcoinjs-lib'
import { BIP32Factory } from 'bip32'
import * as tools from 'uint8array-tools'
import { hmac } from '@noble/hashes/hmac'
import { sha512 } from '@noble/hashes/sha512'
import BigNumber from 'bignumber.js'
import ElectrumClient from './electrum-client.js'

// eslint-disable-next-line camelcase
import { sodium_memzero } from 'sodium-universal'

// Import the ECC library you have installed
import * as ecc from '@bitcoinerlab/secp256k1'

/** @typedef {import('@wdk/wallet').IWalletAccount} IWalletAccount */

/** @typedef {import('@wdk/wallet').KeyPair} KeyPair */
/** @typedef {import('@wdk/wallet').TransactionResult} TransactionResult */

/**
 * @typedef {Object} BtcTransaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of bitcoins to send to the recipient (in satoshis).
 */

/**
 * @typedef {Object} BtcWalletConfig
 * @property {string} [host] - The electrum server's hostname (default: "electrum.blockstream.info").
 * @property {number} [port] - The electrum server's port (default: 50001).
 * @property {"bitcoin"|"regtest"|"testnet"} [network="bitcoin"] The name of the network to use (default: "bitcoin").
 * @property {44|84} [bip=84] - The bip standard to use for derivation paths; available values: 44, 84 (default: 84).
 */

const DUST_LIMIT = 546
const bip32 = BIP32Factory(ecc)
const BIP_84_BTC_DERIVATION_PATH_PREFIX = "m/84'/0'"

const BITCOIN = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: { public: 0x0488b21e, private: 0x0488ade4 },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80
}

initEccLib(ecc)

/**
 * Error thrown when a method or operation isn't supported
 * @extends Error
 */
export class UnsupportedOperationError extends Error {
  /**
   * @param {string} methodName  - Name of the method invoked.
   */
  constructor (methodName) {
    super(`${methodName} is not supported on the Bitcoin blockchain.`)
    this.name = 'UnsupportedOperationError'
  }
}

/** @implements {IWalletAccount} */
export default class WalletAccountBtc {
  /**
   * Creates a new bitcoin wallet account.
   *
   * @param {Uint8Array} seedBuffer - Uint8Array seed buffer.
   * @param {string} path - The BIP-84 derivation path (e.g. "0'/0/0").
   * @param {BtcWalletConfig} [config] - The configuration object.
   */
  constructor (seedBuffer, path, config) {
    /** @private @type {ElectrumClient} */
    this._electrumClient = new ElectrumClient(config)

    /** @private @type {Uint8Array} */
    this._masterKeyAndChainCodeBuffer =
      hmac(sha512, tools.fromUtf8('Bitcoin seed'), seedBuffer)

    /** @private @type {Uint8Array} */
    this._privateKeyBuffer = this._masterKeyAndChainCodeBuffer.slice(0, 32)

    /** @private @type {Uint8Array} */
    this._chainCodeBuffer = this._masterKeyAndChainCodeBuffer.slice(32)

    /** @private @type {import('bip32').BIP32Interface} */
    this._bip32 = bip32.fromPrivateKey(
      Buffer.from(this._privateKeyBuffer),
      Buffer.from(this._chainCodeBuffer),
      BITCOIN
    )

    /** @private */
    this._path = `${BIP_84_BTC_DERIVATION_PATH_PREFIX}/${path}`

    const wallet = this._bip32.derivePath(this._path)

    /** @private */
    this._address = payments.p2wpkh({
      pubkey: wallet.publicKey,
      network: this._electrumClient.network
    }).address

    /** @private */
    this._keyPair = {
      publicKey: wallet.publicKey,
      privateKey: this._privateKeyBuffer
    }
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return +this._path.split('/').pop()
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return this._keyPair
  }

  /**
   * Returns the account's address.
   *
   * @returns {Promise<string>} The account's address.
   */
  async getAddress () {
    return this._address
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async sign (message) {
    const messageHash = crypto.sha256(Buffer.from(message))
    return this._bip32.sign(messageHash).toString('base64')
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    const messageHash = crypto.sha256(Buffer.from(message))
    const signatureBuffer = Buffer.from(signature, 'base64')
    return this._bip32.verify(messageHash, signatureBuffer)
  }

  /**
   * Returns the account's bitcoin balance.
   *
   * @returns {Promise<number>} The bitcoin balance (in satoshis).
   */
  async getBalance () {
    const address = await this.getAddress()
    const { confirmed } = await this._electrumClient.getBalance(address)
    return +confirmed
  }

  /** @private */
  async getTokenBalance (_) {
    throw new UnsupportedOperationError('getTokenBalance')
  }

  /**
   * Sends a transaction.
   *
   * @param {BtcTransaction} tx - The transaction.
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async sendTransaction ({ to, value }) {
    const tx = await this._getTransaction({ recipient: to, amount: value })
    await this._broadcastTransaction(tx.hex)
    return {
      hash: tx.txid,
      fee: +tx.fee
    }
  }

  /**
   * Quotes the costs of a send transaction operation.
   * @see {sendTransaction}
   * @param {BtcTransaction} tx - The transaction.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction ({ to, value }) {
    const tx = await this._getTransaction({ recipient: to, amount: value })
    return {
      fee: +tx.fee
    }
  }

  /** @private */
  async transfer (options) {
    throw new UnsupportedOperationError('transfer')
  }

  /** @private */
  async quoteTransfer (options) {
    throw new UnsupportedOperationError('quoteTransfer')
  }

  /**
   * Disposes the wallet account, erasing the private key from the memory.
   */
  dispose () {
    sodium_memzero(this._privateKeyBuffer)
    sodium_memzero(this._chainCodeBuffer)
    sodium_memzero(this._masterKeyAndChainCodeBuffer)
    sodium_memzero(this._keyPair.privateKey)
    sodium_memzero(this._bip32.__Q)
    sodium_memzero(this._bip32.__D)

    this._bip32 = null
    this._privateKeyBuffer = null
    this._chainCodeBuffer = null
    this._masterKeyAndChainCodeBuffer = null

    if (this._electrumClient?.disconnect) this._electrumClient.disconnect()
  }

  /**
   * Prepares a transaction object for the given recipient and amount ready.
   *
   * @protected
   * @param {Object} params - The transaction parameters.
   * @param {string} params.recipient - The recipient's address.
   * @param {number} params.amount - The amount to send.
   * @returns {Promise<{txid: string, hex: string, fee: string}>} The prepared transaction object.
   */
  async _getTransaction ({ recipient, amount }) {
    const address = await this.getAddress()
    const utxoSet = await this._getUtxos(amount, address)
    let feeRateInSatsPerVb = await this._electrumClient.getFeeEstimateInSatsPerVb()

    if (feeRateInSatsPerVb.lt(1)) {
      // As a safety measure, ensure the fee rate is at least 1 sat/vB
      feeRateInSatsPerVb = new BigNumber(1)
    }

    return await this._getRawTransaction(utxoSet, amount, recipient, feeRateInSatsPerVb)
  }

  /**
   * Gathers Unspent Transaction Outputs (UTXOs) for a transaction.
   *
   * @protected
   * @param {number} amount - The amount the UTXOs should cover.
   * @param {string} address - The address to fetch the UTXOs from.
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of UTXOs.
   * @throws {Error} If no unspent outputs are available.
   */
  async _getUtxos (amount, address) {
    const unspent = await this._electrumClient.getUnspent(address)
    if (!unspent || unspent.length === 0) throw new Error('No unspent outputs available.')

    const collected = []
    let totalCollected = new BigNumber(0)

    for (const utxo of unspent) {
      const tx = await this._electrumClient.getTransaction(utxo.tx_hash)
      const vout = tx.outs[utxo.tx_pos]
      const scriptHex = vout.script.toString('hex')
      const collectedVout = {
        value: vout.value,
        scriptPubKey: {
          hex: scriptHex
        }
      }

      collected.push({ ...utxo, vout: collectedVout })
      totalCollected = totalCollected.plus(utxo.value)
      if (totalCollected.isGreaterThanOrEqualTo(amount)) break
    }
    return collected
  }

  /**
   * Creates a raw transaction.
   *
   * @protected
   * @param {Array<Object>} utxoSet - The set of UTXOs to be used as inputs.
   * @param {number} amount - The amount to be sent.
   * @param {string} recipient - The recipient's address.
   * @param {BigNumber} feeRate - The fee rate for the transaction.
   * @returns {Promise<{txid: string, hex: string, fee: BigNumber}>} A promise that resolves to an object containing the transaction ID, the transaction hex, and the fee.
   * @throws {Error} If the amount is less than or equal to the dust limit.
   * @throws {Error} If there is an insufficient balance to send the transaction.
   */
  async _getRawTransaction (utxoSet, amount, recipient, feeRate) {
    if (+amount <= DUST_LIMIT) throw new Error(`The amount must be bigger than the dust limit (= ${DUST_LIMIT}).`)
    const totalInput = utxoSet.reduce((sum, utxo) => sum.plus(utxo.value), new BigNumber(0))

    const createPsbt = async (fee) => {
      const psbt = new Psbt({ network: this._electrumClient.network })
      utxoSet.forEach((utxo, index) => {
        psbt.addInput({
          hash: utxo.tx_hash,
          index: utxo.tx_pos,
          witnessUtxo: { script: Buffer.from(utxo.vout.scriptPubKey.hex, 'hex'), value: utxo.value },
          bip32Derivation: [{ masterFingerprint: this._bip32.fingerprint, path: this.path, pubkey: this.keyPair.publicKey }]
        })
      })
      psbt.addOutput({ address: recipient, value: amount })
      const change = totalInput.minus(amount).minus(fee)
      if (change.isGreaterThan(DUST_LIMIT)) psbt.addOutput({ address: await this.getAddress(), value: change.toNumber() })
      else if (change.isLessThan(0)) throw new Error('Insufficient balance to send the transaction.')
      utxoSet.forEach((_, index) => psbt.signInputHD(index, this._bip32))
      psbt.finalizeAllInputs()
      return psbt
    }

    let psbt = await createPsbt(0)
    const dummyTx = psbt.extractTransaction()
    let estimatedFee = new BigNumber(feeRate).multipliedBy(dummyTx.virtualSize()).integerValue(BigNumber.ROUND_CEIL)
    estimatedFee = BigNumber.max(estimatedFee, new BigNumber(141))
    psbt = await createPsbt(estimatedFee)
    const tx = psbt.extractTransaction()
    return { txid: tx.getId(), hex: tx.toHex(), fee: estimatedFee }
  }

  /**
   * Broadcast a transaction to the network.
   *
   * @protected
   * @param {string} txHex - The hexadecimal representation of the transaction.
   * @returns {Promise<string>} A promise that resolves to the transaction ID upon successful broadcast.
   */
  async _broadcastTransaction (txHex) {
    return await this._electrumClient.broadcastTransaction(txHex)
  }
}
