/**
 * @typedef {Object} BtcWalletConfig
 * @property {string} [host] - The electrum server's hostname (default: "electrum.blockstream.info").
 * @property {number} [port] - The electrum server's port (default: 50001).
 * @property {string} [network] - The name of the network to use; available values: "bitcoin", "regtest", "testnet" (default: "bitcoin").
 */
export default class WalletManagerBtc {
    /**
     * Returns a random [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     *
     * @returns {string} The seed phrase.
     */
    static getRandomSeedPhrase(): string;
    /**
     * Checks if a seed phrase is valid.
     *
     * @param {string} seedPhrase - The seed phrase.
     * @returns {boolean} True if the seed phrase is valid.
     */
    static isValidSeedPhrase(seedPhrase: string): boolean;
    /**
     * Creates a new wallet manager for the bitcoin blockchain.
     *
     * @param {string} seedPhrase - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - Derivation path
     * @param {Object} [config] - The configuration object.
     * @param {string} [config.host] - The electrum server's hostname (default: "electrum.blockstream.info").
     * @param {number} [config.port] - The electrum server's port (default: 50001).
     * @param {string} [config.network] - The name of the network to use; available values: "bitcoin", "regtest", "testnet" (default: "bitcoin").
     * @param {BtcWalletConfig} [config] - The configuration object.
     */
    constructor(seedPhrase: string, path: string, config?: {
        host?: string;
        port?: number;
        network?: string;
    });
    /**
     * The seed phrase of the wallet.
     *
     * @type {string}
     */
    get seedPhrase(): string;
    /**
     * Returns the wallet account at a specific index (see [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki)).
     *
     * @example
     * // Returns the account with derivation path m/84'/0'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @param {number} [index] - The index of the account to get (default: 0).
     * @returns {Promise<WalletAccountBtc>} The account.
    */
    getAccount(index?: number): Promise<WalletAccountBtc>;
    /**
   * Fetches recommended Bitcoin fee rates from the Mempool.space API.
   *
   * @returns {Promise<{ slow: number, fast: number }>}
   *   A promise that resolves to an object containing:
   *   - slow: fee rate in sat/vB targeting confirmation within ~60 minutes
   *   - fast: fee rate in sat/vB targeting confirmation in the next block
   * @throws {Error} If the response cannot be parsed as JSON or the request fails
   */
    getFeeRate(): Promise<{
        slow: number;
        fast: number;
    }>;
    /**
     * Returns the wallet account at a specific BIP-84/BIP-44 derivation path.
     *
     * @param {string} path - The full derivation path (e.g. "m/84'/0'/0'/0/1" or "/0'/1/2").
     *   If it starts with "/", it will be appended to the base BIP-84 path.
     * @returns {Promise<WalletAccountBtc>} The account for that path.
     */
    getAccountByPath(path: string): Promise<WalletAccountBtc>;
    #private;
}
export type BtcWalletConfig = {
    /**
     * - The electrum server's hostname (default: "electrum.blockstream.info").
     */
    host?: string;
    /**
     * - The electrum server's port (default: 50001).
     */
    port?: number;
    /**
     * - The name of the network to use; available values: "bitcoin", "regtest", "testnet" (default: "bitcoin").
     */
    network?: string;
};
import WalletAccountBtc from './wallet-account-btc.js';
