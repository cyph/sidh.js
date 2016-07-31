#include <stdlib.h>
#include <time.h>
#include "SIDH_internal.h"
#include "SIDH.h"
#include "randombytes.h"


void sidhjs_init () {
	/*
	size_t randomstate_len	= 256;
	char* randomstate		= (char*) malloc(randomstate_len);

	randombytes_stir();
	randombytes_buf(randomstate, randomstate_len);
	initstate(time(NULL), randomstate, randomstate_len);
	*/
}

long sidhjs_public_key_bytes () {
	return 0; // PUBLICKEY_BYTES;
}

long sidhjs_secret_key_bytes () {
	return 0; // SECRETKEY_BYTES;
}

long sidhjs_encrypted_bytes () {
	return 0; // CIPHERTEXT_BYTES;
}

long sidhjs_decrypted_bytes () {
	return 0; // CLEARTEXT_BYTES;
}

void sidhjs_keypair (
	uint8_t* public_key,
	uint8_t* private_key
) {
	// keypair(private_key, public_key);
}

void sidhjs_encrypt (
	uint8_t* message,
	uint8_t* public_key,
	uint8_t* cyphertext
) {
	// encrypt_block(cyphertext, message, public_key);
}

void sidhjs_decrypt (
	uint8_t* cyphertext,
	uint8_t* private_key,
	uint8_t* decrypted
) {
	// decrypt_block(decrypted, cyphertext, private_key);
}
