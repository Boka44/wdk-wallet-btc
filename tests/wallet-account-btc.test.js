import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

import { HOST, PORT, ELECTRUM_PORT, ZMQ_PORT, DATA_DIR, ACCOUNT_CONFIG } from './config.js'
import accountFixtures, { BitcoinCli, Waiter } from './helpers/index.js'

import { WalletAccountBtc, WalletAccountReadOnlyBtc } from '../index.js'

const { SEED_PHRASE, SEED, getBtcAccount, getExpectedSignature } = accountFixtures

const ACCOUNT = getBtcAccount(1)

describe('WalletAccountBtc', () => {
  const bitcoin = new BitcoinCli({
    host: HOST,
    port: PORT,
    zmqPort: ZMQ_PORT,
    dataDir: DATA_DIR,
    wallet: 'testwallet'
  })

  const waiter = new Waiter(bitcoin, {
    host: HOST,
    electrumPort: ELECTRUM_PORT,
    zmqPort: ZMQ_PORT
  })

  let account, recipient

  beforeAll(async () => {
    account = new WalletAccountBtc(SEED_PHRASE, "0'/0/1", ACCOUNT_CONFIG)
    recipient = bitcoin.getNewAddress()

    bitcoin.sendToAddress(ACCOUNT.address, 0.01)
    await waiter.mine()
  })

  afterAll(() => {
    account.dispose()
  })

  describe('constructor', () => {
    test('should successfully initialize an account for the given seed phrase and path', () => {
      const account = new WalletAccountBtc(SEED_PHRASE, "0'/0/1")

      expect(account.index).toBe(ACCOUNT.index)
      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT_BIP44.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT_BIP44.keyPair.publicKey, 'hex'))
      })
    })

    test('should successfully initialize an account for the given seed and path', () => {
      const account = new WalletAccountBtc(SEED, "0'/0/1")

      expect(account.index).toBe(ACCOUNT.index)
      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT_BIP44.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT_BIP44.keyPair.publicKey, 'hex'))
      })
    })

    test('should successfully initialize an account for the given seed and path (bip-84)', () => {
      const account = new WalletAccountBtc(SEED, "0'/0/0", { bip: 84 })

      expect(account.index).toBe(ACCOUNT_BIP84.index)

      expect(account.path).toBe(ACCOUNT_BIP84.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT_BIP84.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT_BIP84.keyPair.publicKey, 'hex'))
      })
    })

    test('should throw if the seed phrase is invalid', () => {
      const INVALID_SEED_PHRASE = 'invalid seed phrase'
      // eslint-disable-next-line no-new
      expect(() => new WalletAccountBtc(INVALID_SEED_PHRASE, "0'/0/1"))
        .toThrow('The seed phrase is invalid.')
    })

    test('should throw if the path is invalid', () => {
      // eslint-disable-next-line no-new
      expect(() => new WalletAccountBtc(SEED_PHRASE, "a'/b/c"))
        .toThrow(/Expected BIP32Path/)
    })

    test('should throw for unsupported bip type', () => {
      // eslint-disable-next-line no-new
      expect(() => new WalletAccountBtc(SEED_PHRASE, "0'/0/0", { bip: 33 }))
        .toThrow(/Unsupported BIP type/)
    })
  })

  describe('sign', () => {
    const MESSAGE = 'Dummy message to sign.'
    const EXPECTED_SIGNATURE = getExpectedSignature(1, MESSAGE)

    test('should return the correct signature', async () => {
      const signature = await account.sign(MESSAGE)
      expect(signature).toBe(EXPECTED_SIGNATURE)
    })
  })

  describe('verify', () => {
    const MESSAGE = 'Dummy message to sign.'
    const SIGNATURE = getExpectedSignature(1, MESSAGE)

    test('should return true for a valid signature', async () => {
      const result = await account.verify(MESSAGE, SIGNATURE)
      expect(result).toBe(true)
    })

    test('should return false for an invalid signature', async () => {
      const result = await account.verify('Another message.', SIGNATURE)
      expect(result).toBe(false)
    })

    test('should return false for an invalid BIP84 signature', async () => {
      const bip84Account = new WalletAccountBtc(SEED_PHRASE, "0'/0/0", { ...CONFIGURATION, bip: 84 })
      const result = await bip84Account.verify('Another message.', SIGNATURE_BIP84)

      expect(result).toBe(false)
      
      bip84Account.dispose()
    })

    test('should throw on a malformed signature', async () => {
      await expect(account.verify(MESSAGE, 'A bad signature'))
        .rejects.toThrow('Expected Signature')
    })
  })

  describe('sendTransaction', () => {
    test('should successfully send a BIP44 transaction', async () => {
      const TRANSACTION = {
        to: recipient,
        value: 1_000
      }

      const { hash, fee } = await account.sendTransaction(TRANSACTION)

      const { fees } = bitcoin.getMempoolEntry(hash)
      const baseFee = Math.round(fees.base * 1e+8)
      expect(fee).toBe(baseFee)

      const transaction = bitcoin.getTransaction(hash)
      expect(transaction.txid).toBe(hash)
      expect(transaction.details[0].address).toBe(TRANSACTION.to)

      const amount = Math.round(transaction.details[0].amount * 1e+8)
      expect(amount).toBe(TRANSACTION.value)
    })

    test('should successfully send a BIP84 transaction', async () => {
      const bip84Account = new WalletAccountBtc(SEED_PHRASE, "0'/0/0", { ...CONFIGURATION, bip: 84 })
      
      const bip84Address = await bip84Account.getAddress()
      bitcoin.sendToAddress(bip84Address, 0.01)
      await waiter.mine()

      const TRANSACTION = {
        to: recipient,
        value: 1_000
      }

      const { hash, fee } = await bip84Account.sendTransaction(TRANSACTION)

      const { fees } = bitcoin.getMempoolEntry(hash)
      const baseFee = Math.round(fees.base * 1e+8)
      expect(fee).toBe(baseFee)

      const transaction = bitcoin.getTransaction(hash)
      expect(transaction.txid).toBe(hash)
      expect(transaction.details[0].address).toBe(TRANSACTION.to)

      const amount = Math.round(transaction.details[0].amount * 1e+8)
      expect(amount).toBe(TRANSACTION.value)

      bip84Account.dispose()
    })

    test('should throw if value is less than the dust limit for BIP44', async () => {
      await expect(account.sendTransaction({ to: recipient, value: 500 }))
        .rejects.toThrow('The amount must be bigger than the dust limit')
    })

    test('should throw if value is less than the dust limit for BIP84', async () => {
      const bip84Account = new WalletAccountBtc(SEED_PHRASE, "0'/0/0", { ...CONFIGURATION, bip: 84 })
      
      await expect(bip84Account.sendTransaction({ to: recipient, value: 500 }))
        .rejects.toThrow('The amount must be bigger than the dust limit')

      bip84Account.dispose()
    })

    test('should throw if the account balance does not cover the transaction costs for BIP44', async () => {
      await expect(account.sendTransaction({ to: recipient, value: 1_000_000_000_000 }))
        .rejects.toThrow('Insufficient balance to send the transaction')
    })

    test('should throw if there an no utxos available', async () => {
      const unfunded = new WalletAccountBtc(SEED_PHRASE, "0'/0/2", ACCOUNT_CONFIG)

      await expect(unfunded.sendTransaction({ to: recipient, value: 1_000 }))
        .rejects.toThrow('No unspent outputs available')

      unfunded.dispose()
    })
  })

  describe('transfer', () => {
    test('should throw an unsupported operation error', async () => {
      await expect(account.transfer({}))
        .rejects.toThrow("The 'transfer' method is not supported on the bitcoin blockchain.")
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should return a read-only copy of the account', async () => {
      const readOnlyAccount = await account.toReadOnlyAccount()

      expect(readOnlyAccount).toBeInstanceOf(WalletAccountReadOnlyBtc)

      expect(await readOnlyAccount.getAddress()).toBe(ACCOUNT.address)
    })
  })
})
