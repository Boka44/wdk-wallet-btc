import { jest } from '@jest/globals'

export const __mockBehaviors = {
  getBalance: jest.fn().mockResolvedValue({ confirmed: 100000 }),
  getTransaction: jest.fn().mockResolvedValue({}),
  getUnspent: jest.fn().mockResolvedValue([]),
  getFeeEstimate: jest.fn().mockResolvedValue(1),
  broadcastTransaction: jest.fn().mockResolvedValue('mocked-txid'),
  getHistory: jest.fn().mockResolvedValue([]),
}

const mockElectrumClient = jest.fn().mockImplementation(() => ({
  ...__mockBehaviors,
  network: { bech32: 'bcrt' },
}))

export default mockElectrumClient
