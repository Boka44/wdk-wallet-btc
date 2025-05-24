import { jest } from '@jest/globals'

const verify = jest.fn(() => true)

const mockBip32 = {
  BIP32Factory: () => ({
    fromSeed: () => ({
      derivePath: () => ({
        publicKey: Buffer.from('03'.repeat(33), 'hex'),
        toWIF: () => 'mock-wif'
      }),
      sign: () => Buffer.from('signature'),
      verify,
      fingerprint: 123456789
    })
  })
}

export default mockBip32
export { verify }
