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
	publicKeyBytes: Module._sidhjs_public_key_bytes(),
	privateKeyBytes: Module._sidhjs_private_key_bytes(),
	bytes: Module._sidhjs_secret_bytes(),

	/* Backwards compatibility */
	publicKeyLength: Module._sidhjs_public_key_bytes(),
	privateKeyLength: Module._sidhjs_private_key_bytes(),
	secretLength: Module._sidhjs_secret_bytes(),

	keyPair: function () {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyBytes);

		try {
			var returnValue	= Module._sidhjs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, sidh.publicKeyBytes),
				privateKey: dataResult(privateKeyBuffer, sidh.privateKeyBytes)
			});
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	secret: function (publicKey, privateKey) {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyBytes);
		var secretBuffer		= Module._malloc(sidh.bytes);

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
				dataResult(secretBuffer, sidh.bytes)
			);
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
			dataFree(secretBuffer);
		}
	},

	base: {
		publicKeyBytes: Module._sidhjs_public_key_bytes_base(),
		privateKeyBytes: Module._sidhjs_private_key_bytes_base(),
		bytes: Module._sidhjs_secret_bytes(),

		keyPair: function (isAlice) {
			var publicKeyBuffer		= Module._malloc(sidh.base.publicKeyBytes);
			var privateKeyBuffer	= Module._malloc(sidh.base.privateKeyBytes);

			try {
				var returnValue	= Module._sidhjs_keypair_base(
					publicKeyBuffer,
					privateKeyBuffer,
					isAlice ? 1 : 0
				);

				return dataReturn(returnValue, {
					publicKey: dataResult(publicKeyBuffer, sidh.base.publicKeyBytes),
					privateKey: dataResult(privateKeyBuffer, sidh.base.privateKeyBytes)
				});
			}
			finally {
				dataFree(publicKeyBuffer);
				dataFree(privateKeyBuffer);
			}
		},

		secret: function (publicKey, privateKey, isAlice, shouldValidate) {
			var publicKeyBuffer		= Module._malloc(sidh.base.publicKeyBytes);
			var privateKeyBuffer	= Module._malloc(sidh.base.privateKeyBytes);
			var secretBuffer		= Module._malloc(sidh.base.bytes);

			Module.writeArrayToMemory(publicKey, publicKeyBuffer);
			Module.writeArrayToMemory(privateKey, privateKeyBuffer);

			try {
				var returnValue	= Module._sidhjs_secret_base(
					publicKeyBuffer,
					privateKeyBuffer,
					secretBuffer,
					isAlice ? 1 : 0,
					shouldValidate ? 1 : 0
				);

				return dataReturn(
					returnValue,
					dataResult(secretBuffer, sidh.base.bytes)
				);
			}
			finally {
				dataFree(publicKeyBuffer);
				dataFree(privateKeyBuffer);
				dataFree(secretBuffer);
			}
		}
	}
};



return sidh;

}());


if (typeof module !== 'undefined' && module.exports) {
	sidh.sidh		= sidh;
	module.exports	= sidh;
}
else {
	self.sidh		= sidh;
}
