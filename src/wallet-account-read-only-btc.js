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
import {
  payments,
  Psbt,
  address as btcAddress,
  networks,
  crypto as btcCrypto,
  Transaction
} from 'bitcoinjs-lib'
import BigNumber from 'bignumber.js'

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
     * The bitcoin network (bitcoinjs-lib).
     * @protected
     * @type {import('bitcoinjs-lib').Network}
     */
    const netName = this._config.network || 'bitcoin'
    this._network =
      netName === 'testnet'
        ? networks.testnet
        : netName === 'regtest'
          ? networks.regtest
          : networks.bitcoin

    /**
     * Electrum client to interact with a bitcoin node.
     *
     * @protected
     * @type {ElectrumClient}
     */
    const host = this._config.host || 'electrum.blockstream.info'
    const port = this._config.port || 50001
    const protocol = this._config.protocol || 'tcp'
    this._electrumClient = new ElectrumClient(port, host, protocol, {
      client: 'wdk-wallet',
      version: '1.4',
      persistence: { retryPeriod: 1000, maxRetry: 2, pingPeriod: 120000, callback: null }
    })

    /**
     *  Script hash for this address.
     * @protected
     * @type {string}
     */
    this._scriptHash = this._toScriptHash(address)
  }

  /**
   * Returns the account's bitcoin balance.
   *
   * @returns {Promise<number>} The bitcoin balance (in satoshis).
   */
  async getBalance () {
    const { confirmed } = await this._electrumClient.blockchainScripthash_getBalance(this._scriptHash)
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

    const history = await this._electrumClient.blockchainScripthash_getHistory(this._scriptHash)

    const isAddressMatch = (scriptPubKey, addr) => {
      if (!scriptPubKey) return false
      if (scriptPubKey.address) return scriptPubKey.address === addr
      if (Array.isArray(scriptPubKey.addresses)) return scriptPubKey.addresses.includes(addr)
      return false
    }

    const extractAddress = (scriptPubKey) => {
      if (!scriptPubKey) return null
      if (scriptPubKey.address) return scriptPubKey.address
      if (Array.isArray(scriptPubKey.addresses)) return scriptPubKey.addresses[0]
      return null
    }

    const getInputValue = async (ins) => {
      let total = 0
      for (const input of ins) {
        try {
          const prevId = Buffer.from(input.hash).reverse().toString('hex')
          const prevHex = await this._electrumClient.blockchainTransaction_get(prevId, false)
          const prevTx = Transaction.fromHex(prevHex)
          total += prevTx.outs[input.index].value
        } catch (_) {}
      }
      return total
    }

    const isOutgoingTx = async (ins) => {
      for (const input of ins) {
        try {
          const prevId = Buffer.from(input.hash).reverse().toString('hex')
          const prevHex = await this._electrumClient.blockchainTransaction_get(prevId, false)
          const prevTx = Transaction.fromHex(prevHex)
          const script = prevTx.outs[input.index].script
          const addr = payments.p2wpkh({
            output: script,
            network: this._network
          }).address
          if (isAddressMatch({ address: addr }, address)) return true
        } catch (_) {}
      }
      return false
    }

    const transfers = []

    for (const item of history.slice(skip)) {
      if (transfers.length >= limit) break

      const hex = await this._electrumClient.blockchainTransaction_get(item.tx_hash, false)
      const tx = Transaction.fromHex(hex)

      const totalInput = await getInputValue(tx.ins)
      const totalOutput = tx.outs.reduce((sum, o) => sum + o.value, 0)
      const fee = totalInput > 0 ? +(totalInput - totalOutput).toFixed(8) : null
      const outgoing = await isOutgoingTx(tx.ins)

      for (const [index, out] of tx.outs.entries()) {
        const hex = out.script.toString('hex')
        const addr = payments.p2wpkh({
          output: out.script,
          network: this._network
        }).address
        const spk = { hex, address: addr }
        const recipient = extractAddress(spk)
        const isToSelf = isAddressMatch(spk, address)

        let directionType = null
        if (isToSelf && !outgoing) directionType = 'incoming'
        else if (!isToSelf && outgoing) directionType = 'outgoing'
        else if (isToSelf && outgoing) directionType = 'change'
        else continue

        if (directionType === 'change') continue
        if (direction !== 'all' && direction !== directionType) continue
        if (transfers.length >= limit) break

        transfers.push({
          txid: item.tx_hash,
          height: item.height,
          value: out.value,
          vout: index,
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

    let feeRate = this._btcPerKbToSatsPerVbBN(
      await this._electrumClient.blockchainEstimatefee(1)
    ).toNumber()
    feeRate = Math.max(Number(feeRate), 1)

    const utxos = await this._electrumClient.blockchainScripthash_listunspent(this._scriptHash)
    if (!utxos || utxos.length === 0) {
      throw new Error('No unspent outputs available.')
    }

    const net = this._network
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

  /**
   * @protected
   * @param {string} addr
   * @returns {string}
   */
  _toScriptHash (addr) {
    const script = btcAddress.toOutputScript(addr, this._network)
    const hash = btcCrypto.sha256(script)
    return Buffer.from(hash).reverse().toString('hex')
  }

  /**
   * @protected
   * @param {number} btcPerKb
   * @returns {BigNumber}
   */
  _btcPerKbToSatsPerVbBN (btcPerKb) {
    return new BigNumber(btcPerKb).multipliedBy(100_000).integerValue(BigNumber.ROUND_CEIL)
  }
}
