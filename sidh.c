#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "SIDH_api.h"
#include "SIDH.h"
#include "randombytes.h"
#include "utils.h"


PCurveIsogenyStruct isogeny;

long public_key_bytes		= 576;
long full_public_key_bytes	= 1152;
long private_key_bytes		= 48;
long full_private_key_bytes	= 96;


CRYPTO_STATUS sidhjs_randombytes (unsigned int nbytes, unsigned char* random_array) {
	randombytes_buf(random_array, nbytes);
	return CRYPTO_SUCCESS;
}

CRYPTO_STATUS sidhjs_init () {
	randombytes_stir();

	isogeny	= SIDH_curve_allocate(&CurveIsogeny_SIDHp751);

	return SIDH_curve_initialize(
		isogeny,
		sidhjs_randombytes,
		&CurveIsogeny_SIDHp751
	);
}

long sidhjs_public_key_bytes_base () {
	return public_key_bytes;
}

long sidhjs_public_key_bytes () {
	return full_public_key_bytes;
}

long sidhjs_private_key_bytes_base () {
	return private_key_bytes;
}

long sidhjs_private_key_bytes () {
	return full_public_key_bytes + full_private_key_bytes;
}

long sidhjs_secret_bytes () {
	return 192;
}


CRYPTO_STATUS sidhjs_keypair_base (
	uint8_t* public_key,
	uint8_t* private_key,
	int is_alice
) {
	if (is_alice) {
		return EphemeralKeyGeneration_A(private_key, public_key, isogeny);
	}
	else {
		return EphemeralKeyGeneration_B(private_key, public_key, isogeny);
	}
}

CRYPTO_STATUS sidhjs_keypair (
	uint8_t* public_key,
	uint8_t* private_key
) {
	CRYPTO_STATUS status	= sidhjs_keypair_base(public_key, private_key, 1);

	if (status != CRYPTO_SUCCESS) {
		return status;
	}

	status	= sidhjs_keypair_base(
		public_key + public_key_bytes,
		private_key + private_key_bytes,
		0
	);

	if (status != CRYPTO_SUCCESS) {
		return status;
	}

	memcpy(
		private_key + full_private_key_bytes,
		public_key,
		full_public_key_bytes
	);

	return CRYPTO_SUCCESS;
}


CRYPTO_STATUS sidhjs_secret_base (
	uint8_t* public_key,
	uint8_t* private_key,
	uint8_t* secret,
	int is_alice
) {
	if (is_alice) {
		return EphemeralSecretAgreement_A(private_key, public_key, secret, isogeny);
	}
	else {
		return EphemeralSecretAgreement_B(private_key, public_key, secret, isogeny);
	}
}

CRYPTO_STATUS sidhjs_secret (
	uint8_t* public_key,
	uint8_t* private_key,
	uint8_t* secret
) {
	int is_alice	= sodium_compare(
		public_key,
		private_key + full_private_key_bytes,
		full_public_key_bytes
	);

	if (is_alice == 1) {
		public_key += public_key_bytes;
	}
	else if (is_alice == -1) {
		is_alice = 0;
		private_key += private_key_bytes;
	}
	else {
		return CRYPTO_ERROR_INVALID_PARAMETER;
	}

	return sidhjs_secret_base(
		public_key,
		private_key,
		secret,
		is_alice
	);
}
