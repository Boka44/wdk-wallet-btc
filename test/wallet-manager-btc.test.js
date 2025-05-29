import { jest } from '@jest/globals'
import mockWalletAccountBtc from './__mocks__/wallet-account-btc.js'

jest.unstable_mockModule('../src/wallet-account-btc.js', () => ({
  default: mockWalletAccountBtc
}))

const { default: WalletManagerBtc } = await import('../src/wallet-manager-btc.js')
const { default: WalletAccountBtc } = await import('../src/wallet-account-btc.js')

describe('WalletManagerBtc', () => {
  const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  const invalidMnemonic = 'this is not valid mnemonic'

  beforeEach(() => {
    mockWalletAccountBtc.mockClear()
    global.fetch = undefined // reset fetch between tests
  })

  test('getRandomSeedPhrase returns a valid BIP-39 mnemonic', () => {
  const mnemonic = WalletManagerBtc.getRandomSeedPhrase()
    expect(typeof mnemonic).toBe('string')
    expect(WalletManagerBtc.isValidSeedPhrase(mnemonic)).toBe(true)
  })

  test('isValidSeedPhrase returns true for a valid seed phrase', () => {
  const result = WalletManagerBtc.isValidSeedPhrase(validMnemonic)
    expect(result).toBe(true)
  })

  test('isValidSeedPhrase returns false for an invalid seed phrase', () => {
  const result = WalletManagerBtc.isValidSeedPhrase(invalidMnemonic)
    expect(result).toBe(false)
  })

  test('constructor throws an error for invalid seed phrase', () => {
    
    expect(() => new WalletManagerBtc(invalidMnemonic)).toThrow('The seed phrase is invalid.')
  })

  describe('instance methods', () => {
    let manager

    beforeEach(() => {
      manager = new WalletManagerBtc(validMnemonic)
    })
      
    test('isValidSeedPhrase returns true for Buffer input', () => {
      const buf = Buffer.from('hello')
      expect(WalletManagerBtc.isValidSeedPhrase(buf)).toBe(true)
    })

    test('getFeeRates throws if fetch fails', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('network down')))
      await expect(manager.getFeeRates()).rejects.toThrow('network down')
    })

    test('getFeeRates throws if response is not valid JSON', async () => {
      global.fetch = jest.fn(() => Promise.resolve({ json: () => { throw new Error('invalid json') } }))
      await expect(manager.getFeeRates()).rejects.toThrow('invalid json')
    })

    test('constructor stores and propagates config correctly', async () => {
      const config = { host: 'localhost', port: 60001 }
      const managerWithConfig = new WalletManagerBtc(validMnemonic, config)
      await managerWithConfig.getAccountByPath("0'/0/2")
      expect(WalletAccountBtc).toHaveBeenCalledWith(validMnemonic, "0'/0/2", config)
    })

    test('getAccount and getAccountByPath return different instances', async () => {
      const a1 = await manager.getAccount(2)
      const a2 = await manager.getAccountByPath("0'/0/2")
      expect(a1).not.toBe(a2)
    })

    test('getAccount calls WalletAccountBtc with correct path and returns mocked address', async () => {
      const account = await manager.getAccount(1)
      expect(WalletAccountBtc).toHaveBeenCalledWith(validMnemonic, "0'/0/1", {})
      expect(account).toHaveProperty('address', 'btc-mocked-address')
    })

    test('getAccountByPath calls WalletAccountBtc with specified path and returns mocked address', async () => {
      const account = await manager.getAccountByPath("0'/0/0")
      expect(WalletAccountBtc).toHaveBeenCalledWith(validMnemonic, "0'/0/0", {})
      expect(account).toHaveProperty('address', 'btc-mocked-address')
    })

    test('getFeeRates returns normal and fast fee rates from API response', async () => {
      const mockResponse = { fastestFee: 100, hourFee: 50 }
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockResponse)
        })
      )

      const fees = await manager.getFeeRates()
      expect(fees).toEqual({ normal: 50, fast: 100 })
      expect(fetch).toHaveBeenCalledWith('https://mempool.space/api/v1/fees/recommended')
    })

    test('seedPhrase getter returns the correct seed phrase', () => {
      const phrase = manager.seedPhrase
      expect(phrase).toBe(validMnemonic)
    })

    test('getAccount defaults to index 0', async () => {
      const account = await manager.getAccount()
      expect(WalletAccountBtc).toHaveBeenCalledWith(validMnemonic, "0'/0/0", {})
      expect(account).toHaveProperty('address', 'btc-mocked-address')
    })
  })

})
