/**
 * Error thrown when a method or operation isn't supported
 * @extends Error
 */
export class UnsupportedOperationError extends Error {
    /**
     * @param {string} methodName  - Name of the method invoked.
     */
    constructor(methodName: string);
}
/** @implements {IWalletAccount} */
export default class WalletAccountBtc implements IWalletAccount {
    /**
     * Creates a new bitcoin wallet account.
     *
     * @param {Uint8Array} seedBuffer - Uint8Array seed buffer.
     * @param {string} path - The BIP-84 derivation path (e.g. "0'/0/0").
     * @param {BtcWalletConfig} [config] - The configuration object.
     */
    constructor(seedBuffer: Uint8Array, path: string, config?: BtcWalletConfig);
    /** @private @type {ElectrumClient} */
    private _electrumClient;
    /** @private @type {Uint8Array} */
    private _masterKeyAndChainCodeBuffer;
    /** @private @type {Uint8Array} */
    private _privateKeyBuffer;
    /** @private @type {Uint8Array} */
    private _chainCodeBuffer;
    /** @private @type {import('bip32').BIP32Interface} */
    private _bip32;
    /** @private */
    private _path;
    /** @private */
    private _address;
    /** @private */
    private _keyPair;
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @type {string}
     */
    get path(): string;
    /**
     * The account's key pair.
     *
     * @type {KeyPair}
     */
    get keyPair(): KeyPair;
    /**
     * Returns the account's address.
     *
     * @returns {Promise<string>} The account's address.
     */
    getAddress(): Promise<string>;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     */
    sign(message: string): Promise<string>;
    /**
     * Verifies a message's signature.
     *
     * @param {string} message - The original message.
     * @param {string} signature - The signature to verify.
     * @returns {Promise<boolean>} True if the signature is valid.
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Returns the account's bitcoin balance.
     *
     * @returns {Promise<number>} The bitcoin balance (in satoshis).
     */
    getBalance(): Promise<number>;
    /** @private */
    private getTokenBalance;
    /**
     * Sends a transaction.
     *
     * @param {BtcTransaction} tx - The transaction.
     * @returns {Promise<TransactionResult>} The transaction's result.
     */
    sendTransaction({ to, value }: BtcTransaction): Promise<TransactionResult>;
    /**
     * Quotes the costs of a send transaction operation.
     * @see {sendTransaction}
     * @param {BtcTransaction} tx - The transaction.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction({ to, value }: BtcTransaction): Promise<Omit<TransactionResult, "hash">>;
    /** @private */
    private transfer;
    /** @private */
    private quoteTransfer;
    /**
     * Disposes the wallet account, erasing the private key from the memory.
     */
    dispose(): void;
    /**
     * Prepares a transaction object for the given recipient and amount ready.
     *
     * @protected
     * @param {Object} params - The transaction parameters.
     * @param {string} params.recipient - The recipient's address.
     * @param {number} params.amount - The amount to send.
     * @returns {Promise<{txid: string, hex: string, fee: string}>} The prepared transaction object.
     */
    protected _getTransaction({ recipient, amount }: {
        recipient: string;
        amount: number;
    }): Promise<{
        txid: string;
        hex: string;
        fee: string;
    }>;
    /**
     * Gathers Unspent Transaction Outputs (UTXOs) for a transaction.
     *
     * @protected
     * @param {number} amount - The amount the UTXOs should cover.
     * @param {string} address - The address to fetch the UTXOs from.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of UTXOs.
     * @throws {Error} If no unspent outputs are available.
     */
    protected _getUtxos(amount: number, address: string): Promise<Array<any>>;
    /**
     * Creates a raw transaction.
     *
     * @protected
     * @param {Array<Object>} utxoSet - The set of UTXOs to be used as inputs.
     * @param {number} amount - The amount to be sent.
     * @param {string} recipient - The recipient's address.
     * @param {BigNumber} feeRate - The fee rate for the transaction.
     * @returns {Promise<{txid: string, hex: string, fee: BigNumber}>} A promise that resolves to an object containing the transaction ID, the transaction hex, and the fee.
     * @throws {Error} If the amount is less than or equal to the dust limit.
     * @throws {Error} If there is an insufficient balance to send the transaction.
     */
    protected _getRawTransaction(utxoSet: Array<any>, amount: number, recipient: string, feeRate: BigNumber): Promise<{
        txid: string;
        hex: string;
        fee: BigNumber;
    }>;
    /**
     * Broadcast a transaction to the network.
     *
     * @protected
     * @param {string} txHex - The hexadecimal representation of the transaction.
     * @returns {Promise<string>} A promise that resolves to the transaction ID upon successful broadcast.
     */
    protected _broadcastTransaction(txHex: string): Promise<string>;
}
export type IWalletAccount = any;
export type KeyPair = import("@wdk/wallet").KeyPair;
export type TransactionResult = import("@wdk/wallet").TransactionResult;
export type BtcTransaction = {
    /**
     * - The transaction's recipient.
     */
    to: string;
    /**
     * - The amount of bitcoins to send to the recipient (in satoshis).
     */
    value: number;
};
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
     * The name of the network to use (default: "bitcoin").
     */
    network?: "bitcoin" | "regtest" | "testnet";
    /**
     * - The bip standard to use for derivation paths; available values: 44, 84 (default: 84).
     */
    bip?: 44 | 84;
};
