# @wdk/wallet-btc

A simple and secure package to manage BIP-44 wallets for the Bitcoin blockchain. This package provides a clean API for creating, managing, and interacting with Bitcoin wallets using BIP-39 seed phrases and Bitcoin-specific derivation paths.

## 🔍 About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control. 

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## 🌟 Features

- **BIP-39 Seed Phrase Support**: Generate and validate BIP-39 mnemonic seed phrases
- **Bitcoin Derivation Paths**: Support for BIP-44 standard derivation paths for Bitcoin (m/44'/0')
- **Multi-Account Management**: Create and manage multiple accounts from a single seed phrase
- **Address Types Support**: Generate and manage Legacy, SegWit, and Native SegWit addresses
- **UTXO Management**: Track and manage unspent transaction outputs
- **Transaction Management**: Create, sign, and broadcast Bitcoin transactions
- **Fee Estimation**: Dynamic fee calculation with different priority levels
- **Electrum Support**: Connect to Electrum servers for network interaction
- **TypeScript Support**: Full TypeScript definitions included
- **Memory Safety**: Secure private key management with memory-safe implementation
- **Network Flexibility**: Support for both mainnet and testnet
- **Transaction Building**: Support for complex transaction construction with multiple inputs/outputs

## ⬇️ Installation

To install the `@wdk/wallet-btc` package, follow these instructions:

### Public Release

Once the package is publicly available, you can install it using npm:

```bash
npm install @wdk/wallet-btc
```

### Private Access

If you have access to the private repository, install the package from the develop branch on GitHub:

```bash
npm install git+https://github.com/tetherto/wdk-wallet-btc.git#develop
```

After installation, ensure your package.json includes the dependency correctly:

```json
"dependencies": {
  // ... other dependencies ...
  "@wdk/wallet-btc": "git+ssh://git@github.com:tetherto/wdk-wallet-btc.git#develop"
  // ... other dependencies ...
}
```

## 🚀 Quick Start

### Importing from `@wdk/wallet-btc`

1. WalletManagerBtc: Main class for managing wallets
2. WalletAccountBtc: Use this for full access accounts
3. ElectrumClient: Client for interacting with Electrum servers

### Creating a New Wallet

```javascript
import WalletManagerBtc, { WalletAccountBtc } from '@wdk/wallet-btc'

// Use a BIP-39 seed phrase (replace with your own secure phrase)
const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// Create wallet manager with Electrum server config
const wallet = new WalletManagerBtc(seedPhrase, {
  electrumServer: 'ssl://electrum.blockstream.info:50002', // or any Electrum server
  network: 'mainnet', // or 'testnet'
  addressType: 'segwit' // 'legacy', 'segwit', or 'native_segwit'
})

// Get a full access account
const account = await wallet.getAccount(0)

// Get the account's addresses
const address = await account.getAddress()
console.log('Account address:', address)
```

### Managing Multiple Accounts

```javascript
import WalletManagerBtc from '@wdk/wallet-btc'

// Assume wallet is already created
// Get the first account (index 0)
const account = await wallet.getAccount(0)
const address = await account.getAddress()
console.log('Account 0 address:', address)

// Get the second account (index 1)
const account1 = await wallet.getAccount(1)
const address1 = await account1.getAddress()
console.log('Account 1 address:', address1)

// Get account by custom derivation path
const customAccount = await wallet.getAccountByPath("0'/0/5")
const customAddress = await customAccount.getAddress()
console.log('Custom account address:', customAddress)

// Get different address types
const legacyAddress = await account.getAddress('legacy')
const segwitAddress = await account.getAddress('segwit')
const nativeSegwitAddress = await account.getAddress('native_segwit')
```

### Checking Balances

#### Account Balance

```javascript
import WalletManagerBtc from '@wdk/wallet-btc'

// Assume wallet and account are already created
// Get total balance (confirmed + unconfirmed)
const balance = await account.getBalance()
console.log('Total balance:', balance, 'satoshis') // 1 BTC = 100000000 satoshis

// Get confirmed balance only
const confirmedBalance = await account.getBalance({ onlyConfirmed: true })
console.log('Confirmed balance:', confirmedBalance, 'satoshis')

// Get UTXO set
const utxos = await account.getUTXOs()
console.log('Available UTXOs:', utxos)

// Get transaction history
const history = await account.getTransactionHistory()
console.log('Transaction history:', history)

// Note: All balance and UTXO queries require an active Electrum server connection
```

### Transaction Management

```javascript
// Create and send a transaction
const result = await account.sendTransaction({
  recipients: [{
    address: 'bc1...', // Recipient's Bitcoin address
    amount: 50000 // Amount in satoshis
  }],
  feeRate: 5 // Fee rate in sat/vB
})
console.log('Transaction ID:', result.txid)
console.log('Transaction fee:', result.fee, 'satoshis')

// Get transaction fee estimate
const quote = await account.quoteSendTransaction({
  recipients: [{
    address: 'bc1...',
    amount: 50000
  }]
})
console.log('Estimated fee:', quote.fee, 'satoshis')
console.log('Virtual size:', quote.vsize, 'vBytes')
```

### Fee Management

Retrieve current fee rates using `WalletManagerBtc`. Rates are provided in satoshis per virtual byte (sat/vB).

```javascript
// Get current fee rates
const feeRates = await wallet.getFeeRates();
console.log('Economic fee rate:', feeRates.economic, 'sat/vB'); // Slower, cheaper transactions
console.log('Normal fee rate:', feeRates.normal, 'sat/vB');     // Standard confirmation time
console.log('Priority fee rate:', feeRates.priority, 'sat/vB'); // Faster confirmation time

// Estimate specific transaction fee
const estimatedFee = await account.estimateFee({
  recipients: [{
    address: 'bc1...',
    amount: 50000
  }],
  feeRate: feeRates.normal
})
console.log('Estimated fee:', estimatedFee.fee, 'satoshis')
console.log('Virtual size:', estimatedFee.vsize, 'vBytes')
```

### UTXO Management

```javascript
// Get all UTXOs
const utxos = await account.getUTXOs()

// Get only confirmed UTXOs
const confirmedUtxos = await account.getUTXOs({ onlyConfirmed: true })

// Select UTXOs for a specific amount
const selectedUtxos = await account.selectUTXOs({
  amount: 100000, // Amount in satoshis
  feeRate: 5 // Fee rate in sat/vB
})
console.log('Selected UTXOs:', selectedUtxos)
console.log('Total input amount:', selectedUtxos.totalAmount)
console.log('Change amount:', selectedUtxos.changeAmount)
```

### Memory Management

Clear sensitive data from memory using `dispose` methods.

```javascript
// Dispose wallet accounts to clear private keys from memory
account.dispose()

// Dispose entire wallet manager
wallet.dispose()

// Close Electrum client connection
await wallet.electrumClient.close()
```
## 📚 API Reference

### Table of Contents

| Class | Description | Methods |
|-------|-------------|---------|
| [WalletManagerBtc](#walletmanagerbtc) | Main class for managing Bitcoin wallets. Extends `WalletManager` from `@wdk/wallet`. | [Constructor](#constructor), [Methods](#methods) |
| [WalletAccountBtc](#walletaccountbtc) | Individual Bitcoin wallet account implementation. Implements `IWalletAccount`. | [Constructor](#constructor-1), [Methods](#methods-1), [Properties](#properties) |
| [ElectrumClient](#electrumclient) | Client for interacting with Electrum servers. | [Constructor](#constructor-2), [Methods](#methods-2) |

### WalletManagerBtc

The main class for managing Bitcoin wallets.  
Extends `WalletManager` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletManagerBtc(seed, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `config` (object): Configuration object
  - `electrumServer` (string): Electrum server URL (e.g., 'ssl://electrum.blockstream.info:50002')
  - `network` (string, optional): 'mainnet' or 'testnet' (default: 'mainnet')
  - `addressType` (string, optional): 'legacy', 'segwit', or 'native_segwit' (default: 'segwit')
  - `timeout` (number, optional): Connection timeout in milliseconds

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAccount(index)` | Returns a wallet account at the specified index | `Promise<WalletAccountBtc>` |
| `getAccountByPath(path)` | Returns a wallet account at the specified BIP-44 derivation path | `Promise<WalletAccountBtc>` |
| `getFeeRates()` | Returns current fee rates for transactions | `Promise<{economic: number, normal: number, priority: number}>` |
| `dispose()` | Disposes all wallet accounts, clearing private keys from memory | `void` |

##### `getAccount(index)`
Returns a wallet account at the specified index.

**Parameters:**
- `index` (number, optional): The index of the account to get (default: 0)

**Returns:** `Promise<WalletAccountBtc>` - The wallet account

**Example:**
```javascript
const account = await wallet.getAccount(0)
```

##### `getAccountByPath(path)`
Returns a wallet account at the specified BIP-44 derivation path.

**Parameters:**
- `path` (string): The derivation path (e.g., "0'/0/0")

**Returns:** `Promise<WalletAccountBtc>` - The wallet account

**Example:**
```javascript
const account = await wallet.getAccountByPath("0'/0/1")
```

##### `getFeeRates()`
Returns current fee rates based on network conditions and mempool state.

**Returns:** `Promise<{economic: number, normal: number, priority: number}>` - Object containing fee rates in sat/vB
- `economic`: Lowest fee rate for eventual confirmation (within 24 blocks)
- `normal`: Standard fee rate for medium-priority confirmation (within 6 blocks)
- `priority`: High fee rate for fast confirmation (within 2 blocks)

**Throws:**
- `FeeEstimationError`: When fee estimation fails
- `NetworkError`: When network request fails

**Example:**
```javascript
const feeRates = await wallet.getFeeRates()
console.log('Normal fee rate:', feeRates.normal, 'sat/vB')
```

##### `dispose()`
Disposes all wallet accounts and clears sensitive data from memory.

**Returns:** `void`

**Example:**
```javascript
wallet.dispose()
```

### WalletAccountBtc

Represents an individual Bitcoin wallet account. Implements `IWalletAccount` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletAccountBtc(seed, path, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `path` (string): BIP-44 derivation path (e.g., "0'/0/0")
- `config` (object): Configuration object
  - `network` (string, optional): 'mainnet' or 'testnet' (default: 'mainnet')
  - `addressType` (string, optional): 'legacy', 'segwit', or 'native_segwit' (default: 'segwit')
  - `electrumClient` (ElectrumClient): Instance of ElectrumClient for network interaction

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAddress(type?)` | Returns the account's address for specified type | `Promise<string>` |
| `getBalance(options?)` | Returns the account balance in satoshis | `Promise<number>` |
| `getUTXOs(options?)` | Returns the account's unspent transaction outputs | `Promise<UTXO[]>` |
| `selectUTXOs(options)` | Selects UTXOs for a transaction | `Promise<{utxos: UTXO[], totalAmount: number, changeAmount: number}>` |
| `sendTransaction(options)` | Sends a Bitcoin transaction | `Promise<{txid: string, fee: number}>` |
| `quoteSendTransaction(options)` | Estimates the fee for a transaction | `Promise<{fee: number, vsize: number}>` |
| `getTransactionHistory()` | Returns the account's transaction history | `Promise<Transaction[]>` |
| `dispose()` | Disposes the wallet account, clearing private keys from memory | `void` |

##### `getAddress(type?)`
Returns the account's address for the specified type.

**Parameters:**
- `type` (string, optional): Address type ('legacy', 'segwit', or 'native_segwit', default: configured type)

**Returns:** `Promise<string>` - The Bitcoin address

**Example:**
```javascript
const legacyAddress = await account.getAddress('legacy')
const segwitAddress = await account.getAddress('segwit')
const nativeSegwitAddress = await account.getAddress('native_segwit')
```

##### `getBalance(options?)`
Returns the account balance in satoshis.

**Parameters:**
- `options` (object, optional): Balance options
  - `onlyConfirmed` (boolean, optional): Only include confirmed balance
  - `minConfirmations` (number, optional): Minimum confirmations required

**Returns:** `Promise<number>` - Balance in satoshis

**Example:**
```javascript
const balance = await account.getBalance()
const confirmedBalance = await account.getBalance({ onlyConfirmed: true })
```

##### `getUTXOs(options?)`
Returns the account's unspent transaction outputs (UTXOs).

**Parameters:**
- `options` (object, optional): UTXO filter options
  - `onlyConfirmed` (boolean, optional): Only include confirmed UTXOs
  - `minConfirmations` (number, optional): Minimum confirmations required

**Returns:** `Promise<UTXO[]>` - Array of unspent transaction outputs

**Example:**
```javascript
const utxos = await account.getUTXOs()
const confirmedUtxos = await account.getUTXOs({ onlyConfirmed: true })
```

##### `selectUTXOs(options)`
Selects UTXOs for a transaction using coin selection algorithm.

**Parameters:**
- `options` (object): Selection options
  - `amount` (number): Target amount in satoshis
  - `feeRate` (number): Base fee rate in sat/vB
  - `targetFeeRate` (number, optional): Desired fee rate for priority
  - `minConfirmations` (number, optional): Minimum confirmations required
  - `excludeUTXOs` (UTXO[], optional): UTXOs to exclude from selection
  - `dustThreshold` (number, optional): Minimum output value (default: 546 satoshis)

**Returns:** `Promise<{utxos: UTXO[], totalAmount: number, changeAmount: number}>`
- `utxos`: Selected UTXOs
- `totalAmount`: Total input amount in satoshis
- `changeAmount`: Change amount in satoshis

**Example:**
```javascript
const { utxos, totalAmount, changeAmount } = await account.selectUTXOs({
  amount: 100000,
  feeRate: 5
})
```

##### `sendTransaction(options)`
Sends a Bitcoin transaction.

**Parameters:**
- `options` (object): Transaction options
  - `recipients` (array): Array of recipients
    - `address` (string): Recipient's Bitcoin address
    - `amount` (number): Amount in satoshis
  - `feeRate` (number): Fee rate in sat/vB
  - `utxos` (UTXO[], optional): Specific UTXOs to use
  - `rbf` (boolean, optional): Enable Replace-By-Fee
  - `sequence` (number, optional): Sequence number for RBF (default: 0xffffffff - 2)
  - `changeAddress` (string, optional): Specific address for change output
  - `memo` (string, optional): Transaction memo

**Returns:** `Promise<{txid: string, fee: number}>`
- `txid`: Transaction ID
- `fee`: Transaction fee in satoshis

**Example:**
```javascript
const result = await account.sendTransaction({
  recipients: [{ address: 'bc1...', amount: 50000 }],
  feeRate: 5,
  rbf: true
})
```

##### `quoteSendTransaction(options)`
Estimates the fee for a transaction.

**Parameters:**
- `options` (object): Same as sendTransaction options

**Returns:** `Promise<{fee: number, vsize: number}>`
- `fee`: Estimated fee in satoshis
- `vsize`: Estimated virtual size in vBytes

**Example:**
```javascript
const quote = await account.quoteSendTransaction({
  recipients: [{ address: 'bc1...', amount: 50000 }],
  feeRate: 5
})
```

##### `getTransactionHistory()`
Returns the account's transaction history.

**Returns:** `Promise<Transaction[]>` - Array of transactions

**Example:**
```javascript
const history = await account.getTransactionHistory()
```

##### `dispose()`
Disposes the wallet account and clears sensitive data from memory.

**Returns:** `void`

**Example:**
```javascript
account.dispose()
```


#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | The derivation path's index of this account |
| `path` | `string` | The full derivation path of this account |
| `network` | `string` | The current network ('mainnet' or 'testnet') |
| `addressType` | `string` | The current address type ('legacy', 'segwit', or 'native_segwit') |

### ElectrumClient

Client for interacting with Electrum servers.

#### Constructor

```javascript
new ElectrumClient(url, options?)
```

**Parameters:**
- `url` (string): Electrum server URL (e.g., 'ssl://electrum.blockstream.info:50002')
- `options` (object, optional): Configuration options
  - `timeout` (number, optional): Connection timeout in milliseconds
  - `maxRetries` (number, optional): Maximum connection retry attempts

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `connect()` | Establishes connection to the Electrum server | `Promise<void>` |
| `close()` | Closes the connection to the Electrum server | `Promise<void>` |
| `isConnected()` | Checks if connected to the server | `boolean` |
| `getBalance(address)` | Gets balance for an address | `Promise<{confirmed: number, unconfirmed: number}>` |
| `getTransaction(txid)` | Gets transaction details | `Promise<Transaction>` |
| `broadcastTransaction(txHex)` | Broadcasts a raw transaction | `Promise<string>` |
| `estimateFee(blocks)` | Gets fee estimate for target block count | `Promise<number>` |
| `getBlockHeader(height)` | Gets block header at specified height | `Promise<BlockHeader>` |
| `subscribeToAddress(address, callback)` | Subscribes to address updates | `Promise<void>` |
| `getAddressHistory(address)` | Gets transaction history for an address | `Promise<HistoryEntry[]>` |
| `getAddressUnspent(address)` | Gets unspent outputs for an address | `Promise<UTXO[]>` |
| `subscribeToHeaders(callback)` | Subscribes to new block headers | `Promise<void>` |

##### `connect()`
Establishes connection to the Electrum server.

**Returns:** `Promise<void>`

**Throws:**
- `ElectrumConnectionError`: When connection fails
- `ElectrumTimeoutError`: When connection times out
- `ElectrumSSLError`: When SSL verification fails

**Example:**
```javascript
try {
  await client.connect()
} catch (error) {
  if (error instanceof ElectrumConnectionError) {
    // Handle connection failure
  }
}
```

##### `close()`
Closes the connection to the Electrum server.

**Returns:** `Promise<void>`

**Example:**
```javascript
await client.close()
```

##### `isConnected()`
Checks if connected to the Electrum server.

**Returns:** `boolean` - True if connected

**Example:**
```javascript
if (!client.isConnected()) {
  await client.connect()
}
```

##### `getBalance(address)`
Gets confirmed and unconfirmed balance for an address.

**Parameters:**
- `address` (string): Bitcoin address

**Returns:** `Promise<{confirmed: number, unconfirmed: number}>`
- `confirmed`: Confirmed balance in satoshis
- `unconfirmed`: Unconfirmed balance in satoshis

**Example:**
```javascript
const balance = await client.getBalance('bc1...')
```

##### `getTransaction(txid)`
Gets transaction details by transaction ID.

**Parameters:**
- `txid` (string): Transaction ID

**Returns:** `Promise<Transaction>` - Transaction details

**Example:**
```javascript
const tx = await client.getTransaction('abc123...')
```

##### `broadcastTransaction(txHex)`
Broadcasts a raw transaction to the network.

**Parameters:**
- `txHex` (string): Raw transaction in hexadecimal format

**Returns:** `Promise<string>` - Transaction ID

**Example:**
```javascript
const txid = await client.broadcastTransaction('0200000001...')
```

##### `estimateFee(blocks)`
Gets fee estimate for target number of blocks.

**Parameters:**
- `blocks` (number): Target number of blocks for confirmation

**Returns:** `Promise<number>` - Fee rate in sat/vB

**Example:**
```javascript
const feeRate = await client.estimateFee(6) // Target: 6 blocks
```

##### `getBlockHeader(height)`
Gets block header at specified height.

**Parameters:**
- `height` (number): Block height

**Returns:** `Promise<BlockHeader>` - Block header information

**Example:**
```javascript
const header = await client.getBlockHeader(700000)
```

##### `subscribeToAddress(address, callback)`
Subscribes to updates for a specific address.

**Parameters:**
- `address` (string): Bitcoin address to monitor
- `callback` (function): Callback function for updates

**Returns:** `Promise<void>`

**Example:**
```javascript
await client.subscribeToAddress('bc1...', (status) => {
  console.log('Address updated:', status)
})
```

##### `getAddressHistory(address)`
Gets transaction history for an address.

**Parameters:**
- `address` (string): Bitcoin address

**Returns:** `Promise<HistoryEntry[]>` - Array of transaction history entries

**Example:**
```javascript
const history = await client.getAddressHistory('bc1...')
```

##### `getAddressUnspent(address)`
Gets unspent transaction outputs for an address.

**Parameters:**
- `address` (string): Bitcoin address

**Returns:** `Promise<UTXO[]>` - Array of unspent outputs

**Example:**
```javascript
const utxos = await client.getAddressUnspent('bc1...')
```

##### `subscribeToHeaders(callback)`
Subscribes to new block header notifications.

**Parameters:**
- `callback` (function): Callback function for new headers

**Returns:** `Promise<void>`

**Example:**
```javascript
await client.subscribeToHeaders((header) => {
  console.log('New block:', header.height)
})
```

## 🌐 Supported Networks

This package works with the Bitcoin blockchain, including:

- **Bitcoin Mainnet**
  - Electrum: ssl://electrum.blockstream.info:50002
  - Explorer: https://blockstream.info
- **Bitcoin Testnet**
  - Electrum: ssl://electrum.blockstream.info:60002
  - Explorer: https://blockstream.info/testnet

### Supported Address Types

- **Legacy (P2PKH)**: Addresses starting with '1'
- **SegWit (P2SH-P2WPKH)**: Addresses starting with '3'
- **Native SegWit (P2WPKH)**: Addresses starting with 'bc1' (mainnet) or 'tb1' (testnet)

## 🔒 Security Considerations

- **Seed Phrase Security**: 
  - Always store your seed phrase securely and never share it
  - Use strong entropy for seed generation
  - Keep backups in secure, offline locations

- **Private Key Management**: 
  - The package handles private keys internally with memory safety features
  - Keys are never stored on disk
  - Keys are cleared from memory when `dispose()` is called

- **Network Security**: 
  - Use trusted Electrum servers
  - Consider running your own Electrum server for production
  - Verify SSL certificates when using SSL connections
  - Be aware of potential network analysis risks

- **Transaction Validation**:
  - Always verify recipient addresses
  - Double-check transaction amounts and fees
  - Wait for appropriate confirmation count based on amount
  - Understand the implications of RBF (Replace-By-Fee)

- **UTXO Management**:
  - Properly handle change outputs
  - Consider coin selection strategies
  - Be aware of dust limits
  - Understand the privacy implications of UTXO consolidation

- **Fee Management**: 
  - Set appropriate fee rates based on urgency
  - Monitor mempool for fee estimation
  - Consider using RBF for fee bumping
  - Account for varying transaction sizes based on input count

- **Address Type Safety**:
  - Use appropriate address types for compatibility
  - Verify address format matches expected network
  - Understand the trade-offs between address types
  - Consider SegWit for lower fees and better scaling

## 🛠️ Development

### Building

```bash
# Install dependencies
npm install

# Build TypeScript definitions
npm run build:types

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 💡 Examples

### Complete Wallet Setup

```javascript
import WalletManagerBtc from '@wdk/wallet-btc'

async function setupWallet() {
  // Use a BIP-39 seed phrase (replace with your own secure phrase)
  const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  
  // Create wallet manager
  const wallet = new WalletManagerBtc(seedPhrase, {
    electrumServer: 'ssl://electrum.blockstream.info:50002',
    network: 'mainnet',
    addressType: 'native_segwit'
  })
  
  // Get first account
  const account = await wallet.getAccount(0)
  
  // Get addresses for different formats
  const addresses = {
    legacy: await account.getAddress('legacy'),
    segwit: await account.getAddress('segwit'),
    nativeSegwit: await account.getAddress('native_segwit')
  }
  
  // Check balance
  const balance = await account.getBalance()
  console.log('Balance:', balance, 'satoshis')
  
  return { wallet, account, addresses, balance }
}
```

### Advanced Transaction Building

```javascript
async function createTransaction(account) {
  // Select UTXOs for the transaction
  const { utxos, totalAmount, changeAmount } = await account.selectUTXOs({
    amount: 100000, // Amount to send
    feeRate: 5, // Fee rate in sat/vB
    minConfirmations: 1 // Minimum confirmations required
  })

  // Create and send the transaction
  const result = await account.sendTransaction({
    recipients: [{
      address: 'bc1...', // Recipient's address
      amount: 100000 // Amount in satoshis
    }],
    utxos, // Optional: use pre-selected UTXOs
    feeRate: 5,
    rbf: true // Enable Replace-By-Fee
  })

  return result
}
```

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🆘 Support

For support, please open an issue on the GitHub repository.

---

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.