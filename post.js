;

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
	privateKeyLength: Module._sidhjs_secret_key_bytes(),
	encryptedDataLength: Module._sidhjs_encrypted_bytes(),
	decryptedDataLength: Module._sidhjs_decrypted_bytes(),

	keyPair: function () {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyLength);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyLength);

		try {
			Module._sidhjs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return {
				publicKey: dataResult(publicKeyBuffer, sidh.publicKeyLength),
				privateKey: dataResult(privateKeyBuffer, sidh.privateKeyLength)
			};
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	encrypt: function (message, publicKey) {
		var messageBuffer	= Module._malloc(message.length + 4);
		var publicKeyBuffer	= Module._malloc(sidh.publicKeyLength);
		var encryptedBuffer	= Module._malloc(sidh.encryptedDataLength);

		Module.writeArrayToMemory(message, messageBuffer + 4);
		Module.writeArrayToMemory(publicKey, publicKeyBuffer);

		Module.writeArrayToMemory(
			new Uint8Array(
				new Uint32Array([message.length]).buffer
			),
			messageBuffer
		);

		try {
			Module._sidhjs_encrypt(
				messageBuffer,
				publicKeyBuffer,
				encryptedBuffer
			);

			return dataResult(encryptedBuffer, sidh.encryptedDataLength);
		}
		finally {
			dataFree(messageBuffer);
			dataFree(publicKeyBuffer);
			dataFree(encryptedBuffer);
		}
	},

	decrypt: function (encrypted, privateKey) {
		var encryptedBuffer		= Module._malloc(sidh.encryptedDataLength);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyLength);
		var decryptedBuffer		= Module._malloc(sidh.decryptedDataLength);

		Module.writeArrayToMemory(encrypted, encryptedBuffer);
		Module.writeArrayToMemory(privateKey, privateKeyBuffer);

		try {
			Module._sidhjs_decrypt(
				encryptedBuffer,
				privateKeyBuffer,
				decryptedBuffer
			);

			return dataResult(
				decryptedBuffer + 4,
				new Uint32Array(
					Module.HEAPU8.buffer,
					decryptedBuffer,
					1
				)[0]
			);
		}
		finally {
			dataFree(encryptedBuffer);
			dataFree(privateKeyBuffer);
			dataFree(decryptedBuffer);
		}
	}
};



return sidh;

}());

self.sidh	= sidh;