import { jest } from '@jest/globals'
import WalletManagerBtc from '../../src/wallet-manager-btc.js'
import { execSync } from 'child_process'

jest.setTimeout(10000)

describe('Integration: WalletManagerBtc + Electrum', () => {
  const seed = WalletManagerBtc.getRandomSeedPhrase()
  const config = {
    host: '127.0.0.1',
    port: 50001,
    network: 'regtest'
  }

  let wallet, account0, account1, addr0, addr1, minerAddr

  beforeAll(async () => {
    wallet = new WalletManagerBtc(seed, config)
    account0 = await wallet.getAccount(0)
    account1 = await wallet.getAccount(1)

    addr0 = await account0.getAddress()
    addr1 = await account1.getAddress()

    // get a core wallet address to mine to
    minerAddr = execSync(
      `bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet getnewaddress`
    ).toString().trim()

    // mine 101 blocks w the core wallet
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 101 ${minerAddr}`)

    // initial funding of account0 to enable txs
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet sendtoaddress ${addr0} 0.01`)
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)
    await new Promise(resolve => setTimeout(resolve, 1500))
  })

  test('account 0 has incoming transfer in history', async () => {
    // additional incoming tx for test
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet sendtoaddress ${addr0} 0.002`)
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)
    await new Promise(resolve => setTimeout(resolve, 1500))

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

  test('getBalance reflects accurate funds post-transfer', async () => {
    // send 15k sats from account0 to account1
    await account0.sendTransaction({ to: addr1, value: 15_000 })
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)
    await new Promise(resolve => setTimeout(resolve, 1500))

    const balance0 = await account0.getBalance()
    const balance1 = await account1.getBalance()

    expect(typeof balance0).toBe('number')
    expect(typeof balance1).toBe('number')
    expect(balance0).toBeGreaterThanOrEqual(0)
    expect(balance1).toBeGreaterThanOrEqual(15_000)
  })

  test('quoteTransaction estimates fees properly', async () => {
    // quote fee for sending 1k sats
    const estimatedFee = await account0.quoteTransaction({ to: addr1, value: 1_000 })
    expect(typeof estimatedFee).toBe('number')
    expect(estimatedFee).toBeGreaterThan(0)
  })

  test('getTransfers filters incoming transfers correctly', async () => {
    // make incoming tx
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin -rpcwallet=testwallet sendtoaddress ${addr0} 0.0015`)
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)
    await new Promise(resolve => setTimeout(resolve, 1500))

    const transfers = await account0.getTransfers({ direction: 'incoming' })
    expect(transfers.length).toBeGreaterThan(0)
    expect(transfers.every(t => t.direction === 'incoming')).toBe(true)
  })

  test('getTransfers filters outgoing transfers correctly', async () => {
    // make outgoing tx
    await account0.sendTransaction({ to: addr1, value: 6_000 })
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)
    await new Promise(resolve => setTimeout(resolve, 1500))

    const transfers = await account0.getTransfers({ direction: 'outgoing' })
    expect(transfers.length).toBeGreaterThan(0)
    expect(transfers.every(t => t.direction === 'outgoing')).toBe(true)
  })

  test('getTransfers paginates correctly', async () => {
    // create multiple txs
    await account0.sendTransaction({ to: addr1, value: 7_000 })
    await account0.sendTransaction({ to: addr1, value: 8_000 })
    execSync(`bitcoin-cli -regtest -datadir=$HOME/.bitcoin generatetoaddress 1 ${minerAddr}`)
    await new Promise(resolve => setTimeout(resolve, 1500))

    const firstBatch = await account0.getTransfers({ limit: 1 })
    const secondBatch = await account0.getTransfers({ limit: 1, skip: 1 })

    expect(firstBatch.length).toBeLessThanOrEqual(1)
    expect(secondBatch.length).toBeLessThanOrEqual(1)
    if (firstBatch.length > 0 && secondBatch.length > 0) {
      expect(firstBatch[0].txid).not.toBe(secondBatch[0].txid)
    }
  })
  test('throws error when trying to send more than balance', async () => {
    await expect(account0.sendTransaction({
      to: addr1,
      value: 1e9
    })).rejects.toThrow('Insufficient balance')
  })

  test('fails gracefully when Electrum is unavailable', async () => {
    const badConfig = { host: '127.0.0.1', port: 65535, network: 'regtest' } // unused port
    const badWallet = new WalletManagerBtc(seed, badConfig)
    const badAccount = await badWallet.getAccount(0)
    await expect(badAccount.getTransfers()).rejects.toThrow()
  })
})
