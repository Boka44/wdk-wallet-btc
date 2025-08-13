// wallet-account-read-only-btc.js
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

import { WalletAccountReadOnly } from '@wdk/wallet'
import { Psbt, address as btcAddress } from 'bitcoinjs-lib'

import ElectrumClient from './electrum-client.js'

/** @typedef {import('@wdk/wallet').TransactionResult} TransactionResult */
/** @typedef {import('@wdk/wallet').TransferOptions} TransferOptions */

/**
 * @typedef {Object} BtcTransaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of bitcoins to send to the recipient (in satoshis).
 */

/**
 * @typedef {Object} BtcWalletConfig
 * @property {string} [host] - The electrum server's hostname (default: "electrum.blockstream.info").
 * @property {number} [port] - The electrum server's port (default: 50001).
 * @property {"bitcoin" | "regtest" | "testnet"} [network] The name of the network to use (default: "bitcoin").
 */

/**
 * @typedef {Object} BtcTransfer
 * @property {string} txid - The transaction's id.
 * @property {string} address - The user's own address.
 * @property {number} vout - The index of the output in the transaction.
 * @property {number} height - The block height (if unconfirmed, 0).
 * @property {number} value - The value of the transfer (in satoshis).
 * @property {"incoming" | "outgoing"} direction - The direction of the transfer.
 * @property {number} [fee] - The fee paid for the full transaction (in satoshis).
 * @property {string} [recipient] - The receiving address for outgoing transfers.
 */

const DUST_LIMIT = 546

export default class WalletAccountReadOnlyBtc extends WalletAccountReadOnly {
  /**
   * Creates a new bitcoin read-only wallet account.
   *
   * @param {string} address - The account's address.
   * @param {BtcWalletConfig} [config] - The configuration object.
   */
  constructor (address, config = {}) {
    super(address)

    /**
     * The wallet account configuration.
     *
     * @protected
     * @type {BtcWalletConfig}
     */
    this._config = config

    /**
     * Electrum client to interact with a bitcoin node.
     *
     * @protected
     * @type {ElectrumClient}
     */
    this._electrumClient = new ElectrumClient(config)
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

  /**
   * Returns the account balance for a specific token.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<number>} The token balance (in base unit).
   */
  async getTokenBalance (tokenAddress) {
    throw new Error("The 'getTokenBalance' method is not supported on the bitcoin blockchain.")
  }

  /**
   * Quotes the costs of a send transaction operation.
   *
   * @param {BtcTransaction} tx - The transaction.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction ({ to, value }) {
    const address = await this.getAddress()
    const fee = await this._estimateFee({ fromAddress: address, to, value })
    return { fee }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */
  async quoteTransfer (options) {
    throw new Error("The 'quoteTransfer' method is not supported on the bitcoin blockchain.")
  }

  /**
   * Returns the bitcoin transfers history of the account.
   *
   * @param {Object} [options] - The options.
   * @param {"incoming" | "outgoing" | "all"} [options.direction] - If set, only returns transfers with the given direction (default: "all").
   * @param {number} [options.limit] - The number of transfers to return (default: 10).
   * @param {number} [options.skip] - The number of transfers to skip (default: 0).
   * @returns {Promise<BtcTransfer[]>} The bitcoin transfers.
   */
  async getTransfers (options = {}) {
    const { direction = 'all', limit = 10, skip = 0 } = options

    const address = await this.getAddress()
    const net = this._electrumClient.network
    const history = await this._electrumClient.getHistory(address)

    const myScript = btcAddress.toOutputScript(address, net)

    const txCache = new Map()
    const getTx = async (txid) => {
      if (txCache.has(txid)) return txCache.get(txid)
      const tx = await this._electrumClient.getTransaction(txid)
      txCache.set(txid, tx)
      return tx
    }

    const transfers = []

    for (const item of history.slice(skip)) {
      if (transfers.length >= limit) break

      let tx
      try {
        tx = await getTx(item.tx_hash)
      } catch (_) { continue }

      let totalInput = 0
      let isOutgoing = false

      const prevOuts = await Promise.all(
        tx.ins.map(async (input) => {
          try {
            const prevId = Buffer.from(input.hash).reverse().toString('hex')
            const prevTx = await getTx(prevId)
            const prevOut = prevTx.outs[input.index]
            return prevOut || null
          } catch (_) {
            return null
          }
        })
      )

      for (const prevOut of prevOuts) {
        if (!prevOut) continue
        totalInput += prevOut.value
        if (!isOutgoing && Buffer.compare(prevOut.script, myScript) === 0) {
          isOutgoing = true
        }
      }

      const totalOutput = tx.outs.reduce((sum, o) => sum + o.value, 0)
      const fee = totalInput > 0 ? (totalInput - totalOutput) : null

      for (let vout = 0; vout < tx.outs.length; vout++) {
        const out = tx.outs[vout]
        const toSelf = Buffer.compare(out.script, myScript) === 0

        let directionType = null
        if (toSelf && !isOutgoing) directionType = 'incoming'
        else if (!toSelf && isOutgoing) directionType = 'outgoing'
        else if (toSelf && isOutgoing) directionType = 'change'
        else continue

        if (directionType === 'change') continue
        if (direction !== 'all' && direction !== directionType) continue
        if (transfers.length >= limit) break

        let recipient = null
        try {
          recipient = btcAddress.fromOutputScript(out.script, net)
        } catch (_) {}

        transfers.push({
          txid: item.tx_hash,
          height: item.height,
          value: out.value,
          vout,
          direction: directionType,
          recipient,
          fee,
          address
        })
      }
    }

    return transfers
  }

  /**
   * Estimates the fee for a transaction.
   *
   * @protected
   * @param {{ fromAddress: string, to: string, value: number }} params
   * @returns {Promise<number>}
   */
  async _estimateFee ({ fromAddress, to, value }) {
    function encodeVarInt (n) {
      if (n < 0xfd) return Buffer.from([n])
      if (n <= 0xffff) {
        const b = Buffer.alloc(3); b[0] = 0xfd; b.writeUInt16LE(n, 1); return b
      }
      const b = Buffer.alloc(5); b[0] = 0xfe; b.writeUInt32LE(n, 1); return b
    }

    function serializeWitness (items) {
      const parts = [encodeVarInt(items.length)]
      for (const it of items) {
        parts.push(encodeVarInt(it.length), it)
      }
      return Buffer.concat(parts)
    }

    let feeRate = await this._electrumClient.getFeeEstimateInSatsPerVb()
    feeRate = Math.max(Number(feeRate), 1)

    const utxos = await this._electrumClient.getUnspent(fromAddress)
    if (!utxos || utxos.length === 0) {
      throw new Error('No unspent outputs available.')
    }

    const net = this._electrumClient.network
    const fromScript = btcAddress.toOutputScript(fromAddress, net)
    const toScript = btcAddress.toOutputScript(to, net)

    const selected = []
    let total = 0
    let fee = 0

    const dummySig = Buffer.alloc(71, 1)
    const dummyPub = Buffer.alloc(33, 2)
    const finalWitness = serializeWitness([dummySig, dummyPub])

    for (const u of utxos) {
      selected.push(u)
      total += u.value

      const psbt = new Psbt({ network: net })
      for (const s of selected) {
        psbt.addInput({
          hash: s.tx_hash,
          index: s.tx_pos,
          witnessUtxo: { script: fromScript, value: s.value }
        })
      }
      psbt.addOutput({ script: toScript, value })

      const provisionalChange = total - value
      if (provisionalChange > DUST_LIMIT) {
        psbt.addOutput({ script: fromScript, value: provisionalChange })
      }

      for (let i = 0; i < selected.length; i++) {
        psbt.updateInput(i, { finalScriptWitness: finalWitness })
      }

      const vsize = psbt.extractTransaction().virtualSize()
      fee = Math.max(Math.ceil(vsize * feeRate), 141)

      if (total >= value + fee) break
    }

    if (total < value + fee) {
      throw new Error('Insufficient balance to send the transaction.')
    }

    return fee
  }
}
