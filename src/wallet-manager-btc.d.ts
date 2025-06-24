/**
 * @typedef {import('./abstract-wallet-manager.js').FeeRates} FeeRates
 * @typedef {import('./wallet-account-btc.js').default} WalletAccountBtc
 * @typedef {import('./wallet-account-btc.js').BtcWalletConfig} BtcWalletConfig
 */
export default class WalletManagerBtc {
    /**
     * Creates a new wallet manager for the bitcoin blockchain.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {BtcWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, config?: BtcWalletConfig);
    /**
     * The btc wallet configuration.
     *
     * @protected
     * @type {BtcWalletConfig}
     */
    protected _config: BtcWalletConfig;
    /**
     * A map between derivation paths and wallet accounts. It contains all the wallet accounts that have been accessed through the {@link getAccount} and {@link getAccountByPath} methods.
     *
     * @protected
     * @type {{ [path: string]: WalletAccountBtc }}
     */
    protected _accounts: {
        [path: string]: WalletAccountBtc;
    };
    /**
     * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @example
     * // Returns the account with derivation path m/44'/0'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @param {number} [index] - The index of the account to get (default: 0).
     * @returns {Promise<WalletAccountBtc>} The account.
     */
    getAccount(index?: number): Promise<WalletAccountBtc>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/0'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0").
     * @returns {Promise<WalletAccountBtc>} The account.
     */
    getAccountByPath(path: string): Promise<WalletAccountBtc>;
    /**
     * Returns the current fee rates.
     *
     * @returns {Promise<FeeRates>} The fee rates (in satoshis).
     */
    getFeeRates(): Promise<FeeRates>;
    /**
     * Disposes all the wallet accounts, erasing their private keys from the memory.
     */
    dispose(): void;
}
export type FeeRates = any;
export type WalletAccountBtc = import("./wallet-account-btc.js").default;
export type BtcWalletConfig = import("./wallet-account-btc.js").BtcWalletConfig;
import WalletAccountBtc from './wallet-account-btc.js';
