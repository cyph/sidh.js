# sidh.js

## Overview

The [SIDH](https://en.wikipedia.org/wiki/Supersingular_isogeny_key_exchange) post-quantum asymmetric
cipher compiled to WebAssembly using [Emscripten](https://github.com/kripken/emscripten).
The specific implementation in use is [from Microsoft Research](https://www.microsoft.com/en-us/research/project/sidh-library/).
A simple JavaScript wrapper is provided to make SIDH easy to use in web applications.

The parameters are configured to 128-bit strength. (More specifically, the security level is
128 quantum bits and 192 classical bits.)

SECURITY NOTE: the scheme is NOT secure when using static keys. See _Remark 1_ of
[this paper](https://eprint.iacr.org/2016/963.pdf).

## Example Usage

	(async () => {
		const localKeyPair /*: {privateKey: Uint8Array; publicKey: Uint8Array} */ =
			await sidh.keyPair()
		;

		const remoteKeyPair /*: {privateKey: Uint8Array; publicKey: Uint8Array} */ =
			await sidh.keyPair()
		;

		const localSecret /*: Uint8Array */ =
			await sidh.secret(remoteKeyPair.publicKey, localKeyPair.privateKey)
		;

		const remoteSecret /*: Uint8Array */ =
			await sidh.secret(localKeyPair.publicKey, remoteKeyPair.privateKey)
		;

		// localSecret and remoteSecret are equal

		console.log(localKeyPair);
		console.log(remoteKeyPair);
		console.log(localSecret);
		console.log(remoteSecret);
	})();

Note: This library only handles generating shared secrets; you'll need to handle key derivation
and symmetric encryption from there.
