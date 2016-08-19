;

function dataReturn (returnValue, result) {
	if (returnValue === 0) {
		return result;
	}
	else {
		throw new Error('SIDH error: ' + returnValue);
	}
}

function dataResult (buffer, bytes) {
	return new Uint8Array(
		new Uint8Array(Module.HEAPU8.buffer, buffer, bytes)
	);
}

function dataFree (buffer) {
	try {
		Module._free(buffer);
	}
	catch (_) {}
}


Module._sidhjs_init();


var sidh	= {
	publicKeyLength: Module._sidhjs_public_key_bytes(),
	privateKeyLength: Module._sidhjs_private_key_bytes(),
	secretLength: Module._sidhjs_secret_bytes(),

	keyPair: function (isAlice) {
		if (typeof isAlice !== 'boolean') {
			throw 'Must specify whether this key pair is for Alice.';
		}

		var publicKeyBuffer		= Module._malloc(sidh.publicKeyLength);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyLength);

		try {
			var returnValue	= Module._sidhjs_keypair(
				isAlice ? 1 : 0,
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, sidh.publicKeyLength),
				privateKey: dataResult(privateKeyBuffer, sidh.privateKeyLength)
			});
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	secret: function (publicKey, privateKey) {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyLength);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyLength);
		var secretBuffer		= Module._malloc(sidh.secretLength);

		Module.writeArrayToMemory(publicKey, publicKeyBuffer);
		Module.writeArrayToMemory(privateKey, privateKeyBuffer);

		try {
			var returnValue	= Module._sidhjs_secret(
				publicKeyBuffer,
				privateKeyBuffer,
				secretBuffer
			);

			return dataReturn(
				returnValue,
				dataResult(secretBuffer, sidh.secretLength)
			);
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
			dataFree(secretBuffer);
		}
	},

	validate: function (publicKey) {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyLength);

		Module.writeArrayToMemory(publicKey, publicKeyBuffer);

		try {
			return Module._sidhjs_validate(publicKeyBuffer) === 0;
		}
		finally {
			dataFree(publicKeyBuffer);
		}
	}
};



return sidh;

}());

self.sidh	= sidh;