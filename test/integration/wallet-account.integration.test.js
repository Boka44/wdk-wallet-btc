// Integration tests for WalletAccountBtc
import { jest } from '@jest/globals'
import WalletAccountBtc from '../../src/wallet-account-btc.js'
import { execSync } from 'child_process'

jest.setTimeout(30000)

describe('Integration: WalletAccountBtc + Electrum', () => {
  const seed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  const path = "0'/0/0"
  const config = {
    host: '127.0.0.1',
    port: 50001,
    network: 'regtest'
  }

  let account, address, minerAddr

  beforeAll(async () => {
    account = new WalletAccountBtc(seed, path, config)
    address = await account.getAddress()

    minerAddr = execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet getnewaddress`
    ).toString().trim()

    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 101 ${minerAddr}`)

    execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet sendtoaddress ${address} 0.01`
    )
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)
    await new Promise(resolve => setTimeout(resolve, 1500))
  })

  test('getTokenBalance throws unsupported error', async () => {
    await expect(account.getTokenBalance('dummy')).rejects.toThrow('Method not supported on the bitcoin blockchain.')
  })

  test('throws error for dust limit transaction', async () => {
    const recipient = execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet getnewaddress`
    ).toString().trim()
    await expect(account.sendTransaction({ to: recipient, value: 500 })).rejects.toThrow('dust limit')
  })
})
