# wdk-wallet-btc Integration Test Setup

This guide explains how to set up your local development environment to run integration tests for the `WalletManagerBtc` module.

---

## Prerequisites

Before starting, ensure the following are installed:

- **[Node.js](https://nodejs.org/)** ≥ 18  
- **[Bitcoin Core](https://bitcoin.org/en/download)**  
- **[Rust & Cargo](https://rustup.rs/)**  
- **`npm` or `yarn`** for dependency management and test execution.

---

## Step 1: Configure and Run Bitcoin Core (Regtest Mode)

### 1. Start `bitcoind` with regtest configuration:

```bash
bitcoind -regtest -daemon \
  -txindex=1 \
  -fallbackfee=0.0002 \
  -server=1
```

> Restart `bitcoind` if you change these flags.

---

### 2. Create a wallet and generate initial blocks:

```bash
bitcoin-cli -regtest  createwallet testwallet
ADDRESS=$(bitcoin-cli -regtest  getnewaddress)
bitcoin-cli -regtest  generatetoaddress 101 $ADDRESS
```

- Note the address used — this can be logged to verify funding later.

---

## Step 2: Install and Run Electrum Server

### 1. Install `electrs` (if not already):

```bash
cargo install --locked electrs
```

### 2. Run `electrs` connected to your regtest `bitcoind`:

```bash
electrs \
  --network regtest \
  --daemon-dir ~/.bitcoin/regtest \
  --electrum-rpc-addr 127.0.0.1:50001
```

Once running, you should see Electrs logs like:

```
Indexer finished: height=101
Electrum RPC server running on 127.0.0.1:50001
```

---

## Step 3: Run Integration Tests

From the root of the `wdk-wallet-btc` project:

```bash
npm run test:integration
```

---

## Troubleshooting

- **Electrs fails to start or can't find `.cookie`**  
  Make sure you're pointing to `--daemon-dir ~/.bitcoin/regtest` and `bitcoind` is running.

- **Electrs returns 401 / auth errors**  
  Ensure you're not using `--auth` or a `.cookie` if your `bitcoind` is configured with `rpcuser/rpcpassword`.

- **Can't broadcast tx or wallet is empty**  
  Confirm at least 101 blocks are mined after funding address. Use:

  ```bash
  bitcoin-cli -regtest getwalletinfo
  ```
- To inspect Electrs logs in detail, run with:

  ```bash
  RUST_LOG=debug electrs ...
  ```
- You can inspect transactions or balances with:

  ```bash
  bitcoin-cli -regtest  listunspent
  bitcoin-cli -regtest  getrawtransaction <txid> true
  ```

---

## Regenerating Test State

You can restart from a clean state by wiping the `.bitcoin/regtest` directory:

```bash
rm -rf ~/.bitcoin/regtest
```

---

## Cleanup

To shut everything down:

```bash
bitcoin-cli -regtest  stop
```

This will shut down `bitcoind` gracefully. Electrs will exit on its own shortly after.
