# sidh.js

## Overview

The [SIDH](https://en.wikipedia.org/wiki/Supersingular_isogeny_key_exchange) post-quantum asymmetric
cipher compiled to pure JavaScript using [Emscripten](https://github.com/kripken/emscripten).
The specific implementation in use is [from Microsoft Research](https://www.microsoft.com/en-us/research/project/sidh-library/).
A simple wrapper is provided to make SIDH easy to use in web applications.

The parameters are configured to 128-bit strength. (More specifically, the security level is
128 quantum bits and 192 classical bits.)

## Example Usage

	const localKeyPair /*: {privateKey: Uint8Array; publicKey: Uint8Array} */ =
		sidh.keyPair()
	;

	const remoteKeyPair /*: {privateKey: Uint8Array; publicKey: Uint8Array} */ =
		sidh.keyPair()
	;

	const localSecret /*: Uint8Array */ =
		sidh.secret(remoteKeyPair.publicKey, localKeyPair.privateKey)
	;

	const remoteSecret /*: Uint8Array */ =
		sidh.secret(localKeyPair.publicKey, remoteKeyPair.privateKey)
	;

	// localSecret and remoteSecret are equal

Note: This library only handles generating shared secrets; you'll need to handle key derivation
and symmetric encryption from there.
