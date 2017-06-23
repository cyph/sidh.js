declare module 'sidh' {
	interface ISIDH {
		/** Length of shared secret. */
		bytes: Promise<number>;

		/** Private key length. */
		privateKeyBytes: Promise<number>;

		/** Public key length. */
		publicKeyBytes: Promise<number>;

		/** Generates key pair. */
		keyPair () : Promise<{privateKey: Uint8Array; publicKey: Uint8Array}>;

		/** Establishes shared secret. */
		secret (publicKey: Uint8Array, privateKey: Uint8Array) : Promise<Uint8Array>;
	}

	const sidh: ISIDH;
}
