import { execSync } from 'child_process'

export default class BitcoinCli {
  constructor (dataDir, walletName = 'testwallet') {
    this.base = `bitcoin-cli -regtest -datadir=${dataDir} -rpcwallet=${walletName}`
  }

  call (cmd) {
    return execSync(`${this.base} ${cmd}`).toString().trim()
  }
}
