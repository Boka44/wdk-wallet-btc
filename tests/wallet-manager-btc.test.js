import { describe, test, expect, beforeEach, jest } from '@jest/globals'

import WalletManagerBtc from '../src/wallet-manager-btc.js'
import WalletAccountBtc from '../src/wallet-account-btc.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

describe('WalletManagerBtc', () => {
  let wallet

  beforeEach(() => {
    wallet = new WalletManagerBtc(SEED_PHRASE)
  })

  afterEach(() => {
    wallet.dispose()
  })

  describe('getAccount', () => {
    test('should return the account at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountBtc)

      expect(account.path).toBe("m/84'/0'/0'/0/0")
    })

    test('should return the account at the given index', async () => {
      const account = await wallet.getAccount(3)

      expect(account).toBeInstanceOf(WalletAccountBtc)

      expect(account.path).toBe("m/84'/0'/0'/0/3")
    })

    test('should throw if the index is a negative number', async () => {
      await expect(wallet.getAccount(-1)).rejects.toThrow(/Expected BIP32Path/)
    })
  })

  describe('getAccountByPath', () => {
    test('should return the account with the given path', async () => {
      const account = await wallet.getAccountByPath("1'/2/3")

      expect(account).toBeInstanceOf(WalletAccountBtc)

      expect(account.path).toBe("m/84'/0'/1'/2/3")
    })

    test('should throw if the path is invalid', async () => {
      await expect(wallet.getAccountByPath("a'/b/c"))
        .rejects.toThrow(/Expected BIP32Path/)
    })
  })

  describe('getFeeRates', () => {
    beforeAll(() => {
      global.fetch = jest.fn()
    })

    afterAll(() => {
      delete global.fetch
    })

    test('should return the correct fee rates', async () => {
      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          fastestFee: 6_000_000_000,
          hourFee: 3_300_000_000
        })
      })
      const feeRates = await wallet.getFeeRates()
      expect(feeRates.normal).toBe(3_300_000_000)
      expect(feeRates.fast).toBe(6_000_000_000)
    })

    test('should propagate network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('network error'))
      await expect(wallet.getFeeRates()).rejects.toThrow('network error')
    })
  })
})
