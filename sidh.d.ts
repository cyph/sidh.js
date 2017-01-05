export interface ISIDH {
	/** Length of shared secret. */
	bytes: number;

	/** Private key length. */
	privateKeyBytes: number;

	/** Public key length. */
	publicKeyBytes: number;

	/** Generates key pair. */
	keyPair () : {privateKey: Uint8Array; publicKey: Uint8Array};

	/** Establishes shared secret. */
	secret (publicKey: Uint8Array, privateKey: Uint8Array) : Uint8Array;
};

export const sidh: ISIDH;
