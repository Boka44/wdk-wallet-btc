/**
 * @typedef {Object} KeyPair
 * @property {string} publicKey - The public key.
 * @property {string} privateKey - The private key.
 */
/**
 * @typedef {Object} BtcTransaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of bitcoins to send to the recipient (in satoshis).
 */
/**
 * @typedef {Object} BtcTransfer
 * @property {string} txid - The transaction ID.
 * @property {number} vout - The index of the output in the transaction.
 * @property {"incoming"|"outgoing"} direction - Direction of the transfer.
 * @property {number} value - The value of the transfer in BTC.
 * @property {?number} fee - The fee paid for the full transaction (in BTC).
 * @property {?string} recipient - The receiving address for outgoing transfers.
 * @property {number} height - The block height (0 if unconfirmed).
 * @property {string} address - The user's own address.
 */
export default class WalletAccountBtc {
    constructor(config: any);
    /**
     * The derivation path of this account (see [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki)).
     *
     * @type {number}
     */
    get path(): number;
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
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
     * Quote transactions
     *
     * @param {BtcTransaction} tx - The transaction to send.
     * @returns {Promise<number>} The fee in satoshis
     */
    quoteTransaction({ to, value }: BtcTransaction): Promise<number>;
    /**
     * Sends a transaction with arbitrary data.
     *
     * @param {BtcTransaction} tx - The transaction to send.
     * @returns {Promise<string>} The transaction's hash.
     */
    sendTransaction({ to, value }: BtcTransaction): Promise<string>;
    /**
     * Returns the account's native token balance.
     *
     * @returns {Promise<number>} The native token balance.
     */
    getBalance(): Promise<number>;
    getBalance(): Promise<number>;
    /**
     * Returns the balance of the account for a specific token.
     *
     * @param {string} tokenAddress - The smart contract address of the token.
     * @returns {Promise<number>} The token balance.
     */
    getTokenBalance(tokenAddress: string): Promise<number>;
    /**
    * Returns per-output transfer records (one per vout) for this wallet.
    * @param {Object} [options] - Optional filters and pagination.
    * @param {"incoming"|"outgoing"|"all"} [options.direction="all"] - Direction filter.
    * @param {number} [options.limit=10] - Max number of transfers to return.
    * @param {number} [options.skip=0] - Number of transactions to skip.
    * @returns {Promise<BtcTransfers>} A list of transfers (one per vout).
    */
    getTransfers(options?: {
        direction?: "incoming" | "outgoing" | "all";
        limit?: number;
        skip?: number;
    }): Promise<BtcTransfers>;
    #private;
}
export type KeyPair = {
    /**
     * - The public key.
     */
    publicKey: string;
    /**
     * - The private key.
     */
    privateKey: string;
};
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
export type BtcTransfer = {
    /**
     * - The transaction ID.
     */
    txid: string;
    /**
     * - The index of the output in the transaction.
     */
    vout: number;
    /**
     * - Direction of the transfer.
     */
    direction: "incoming" | "outgoing";
    /**
     * - The value of the transfer in BTC.
     */
    value: number;
    /**
     * - The fee paid for the full transaction (in BTC).
     */
    fee: number | null;
    /**
     * - The receiving address for outgoing transfers.
     */
    recipient: string | null;
    /**
     * - The block height (0 if unconfirmed).
     */
    height: number;
    /**
     * - The user's own address.
     */
    address: string;
};
