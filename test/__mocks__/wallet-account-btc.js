import { jest } from '@jest/globals'

const mockWalletAccountBtc = jest.fn().mockImplementation((mnemonic, path, options) => ({
  address: 'btc-mocked-address',
  getAddress: jest.fn().mockResolvedValue('btc-mocked-address'),
  sign: jest.fn(),
  verify: jest.fn()
}))

export default mockWalletAccountBtc
