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


var publicKeyBytes, privateKeyBytes, bytes;

var initiated	= moduleReady.then(function () {
	Module._sidhjs_init();

	publicKeyBytes	= Module._sidhjs_public_key_bytes();
	privateKeyBytes	= Module._sidhjs_private_key_bytes();
	bytes			= Module._sidhjs_secret_bytes();
});


var sidh	= {
	publicKeyBytes: initiated.then(function () { return publicKeyBytes; }),
	privateKeyBytes: initiated.then(function () { return privateKeyBytes; }),
	bytes: initiated.then(function () { return bytes; }),

	keyPair: function () { return initiated.then(function () {
		var publicKeyBuffer		= Module._malloc(publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(privateKeyBytes);

		try {
			var returnValue	= Module._sidhjs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, publicKeyBytes),
				privateKey: dataResult(privateKeyBuffer, privateKeyBytes)
			});
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	}); },

	secret: function (publicKey, privateKey) { return initiated.then(function () {
		var publicKeyBuffer		= Module._malloc(publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(privateKeyBytes);
		var secretBuffer		= Module._malloc(bytes);

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
				dataResult(secretBuffer, bytes)
			);
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
			dataFree(secretBuffer);
		}
	}); },

	base: {
		publicKeyBytes: initiated.then(function () { return publicKeyBytes; }),
		privateKeyBytes: initiated.then(function () { return privateKeyBytes; }),
		bytes: initiated.then(function () { return bytes; }),

		keyPair: function (isAlice) { return initiated.then(function () {
			var publicKeyBuffer		= Module._malloc(publicKeyBytes);
			var privateKeyBuffer	= Module._malloc(privateKeyBytes);

			try {
				var returnValue	= Module._sidhjs_keypair_base(
					publicKeyBuffer,
					privateKeyBuffer,
					isAlice ? 1 : 0
				);

				return dataReturn(returnValue, {
					publicKey: dataResult(publicKeyBuffer, publicKeyBytes),
					privateKey: dataResult(privateKeyBuffer, privateKeyBytes)
				});
			}
			finally {
				dataFree(publicKeyBuffer);
				dataFree(privateKeyBuffer);
			}
		}); },

		secret: function (publicKey, privateKey, isAlice) { return initiated.then(function () {
			var publicKeyBuffer		= Module._malloc(publicKeyBytes);
			var privateKeyBuffer	= Module._malloc(privateKeyBytes);
			var secretBuffer		= Module._malloc(bytes);

			Module.writeArrayToMemory(publicKey, publicKeyBuffer);
			Module.writeArrayToMemory(privateKey, privateKeyBuffer);

			try {
				var returnValue	= Module._sidhjs_secret_base(
					publicKeyBuffer,
					privateKeyBuffer,
					secretBuffer,
					isAlice ? 1 : 0
				);

				return dataReturn(
					returnValue,
					dataResult(secretBuffer, bytes)
				);
			}
			finally {
				dataFree(publicKeyBuffer);
				dataFree(privateKeyBuffer);
				dataFree(secretBuffer);
			}
		}); }
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
