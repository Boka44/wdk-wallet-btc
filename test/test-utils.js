// Returns a single mocked UTXO with specified value
export const mockUtxo = (value = 100_000) => [
  { tx_hash: 'a'.repeat(64), tx_pos: 0, value }
]

// Returns a mocked transaction with a single output
export const mockTransaction = (value = 100_000) => ({
  vout: [{ value, scriptPubKey: { hex: '0014abcdef' } }]
})

// Resets and configures Electrum client mocks
export const setupElectrumMocks = (__mockBehaviors, overrides = {}) => {
  const defaults = {
    getBalance: { confirmed: 100_000 },
    getTransaction: mockTransaction(),
    getUnspent: [],
    getFeeEstimate: 0.00001,
    broadcastTransaction: 'mocked-txid',
    getHistory: []
  }

  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    __mockBehaviors[key].mockReset()
    __mockBehaviors[key].mockResolvedValue(value)
  }
}
