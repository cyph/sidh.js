# sidh.js

## Overview

The [SIDH](https://en.wikipedia.org/wiki/Supersingular_isogeny_key_exchange) post-quantum asymmetric
cipher compiled to pure JavaScript using [Emscripten](https://github.com/kripken/emscripten).
The specific implementation in use is [from Microsoft Research](https://www.microsoft.com/en-us/research/project/sidh-library/).
A simple wrapper is provided to make SIDH easy to use in web applications.

The parameters are configured to 128-bit strength. (More specifically, the security level is
128 quantum bits and 192 classical bits.)

## Example Usage

	const localKeyPair	= sidh.keyPair(true);
	const remoteKeyPair	= sidh.keyPair(false);

	if (!sidh.validate(remoteKeyPair.publicKey)) {
		throw "Bob's public key is invalid.";
	}

	const localSecret	= sidh.secret(remoteKeyPair.publicKey, localKeyPair.privateKey);
	const remoteSecret	= sidh.secret(localKeyPair.publicKey, remoteKeyPair.privateKey);

	// localSecret and remoteSecret are equal

Note: This library only handles generating shared secrets; you'll need to handle key derivation
and symmetric encryption from there.
