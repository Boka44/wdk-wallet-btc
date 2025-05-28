import WalletManagerBtc from '../../src/wallet-manager-btc.js'
import { execSync } from 'child_process'

jest.setTimeout(30000)

describe('Integration: WalletManagerBtc + Electrum', () => {
  const seed = WalletManagerBtc.getRandomSeedPhrase()
  const config = {
    host: '127.0.0.1',
    port: 50001,
    network: 'regtest'
  }

  let wallet, account0, account1, addr0, addr1

  beforeAll(async () => {
    wallet = new WalletManagerBtc(seed, config)
    account0 = await wallet.getAccount(0)
    account1 = await wallet.getAccount(1)

    addr0 = await account0.getAddress()
    addr1 = await account1.getAddress()

    // get a core wallet address to mine to
    const minerAddr = execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet getnewaddress`
    ).toString().trim()

    // mine 101 blocks w the core wallet
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 101 ${minerAddr}`)

    // send 0.005 btc to account0 from our core wallet
    execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet sendtoaddress ${addr0} 0.005`
    )

    // mine 1 block to confirm the send
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)

    // wait for electrum
    await new Promise(resolve => setTimeout(resolve, 1500))
  })

  test('account 0 has incoming transfer in history', async () => {
    const transfers = await account0.getTransfers()
    expect(transfers.length).toBeGreaterThan(0)
    expect(transfers.some(t => t.direction === 'incoming')).toBe(true)
  })

  test('can send transaction from account 0 to account 1', async () => {
    // send 10k sats from account0 to account1
    const txid = await account0.sendTransaction({ to: addr1, value: 10_000 })

    // mine 1 block so the tx gets confirmed
    const dummyAddr = execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin getnewaddress`
    ).toString().trim()
    execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${dummyAddr}`
    )

    // wait for electrum
    await new Promise(resolve => setTimeout(resolve, 1500))

    const transfers = await account0.getTransfers()
    const sent = transfers.find(t => t.txid === txid)

    expect(sent).toBeDefined()
    expect(sent.direction).toBe('outgoing')
    expect(sent.value).toBe(0.0001)
  })
})
