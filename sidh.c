#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "SIDH_internal.h"
#include "SIDH.h"
#include "randombytes.h"
#include "utils.h"


PCurveIsogenyStruct isogeny;

long public_key_bytes		= 768;
long full_public_key_bytes	= 1536;
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

long sidhjs_public_key_bytes () {
	return full_public_key_bytes;
}

long sidhjs_private_key_bytes () {
	return full_public_key_bytes + full_private_key_bytes;
}

long sidhjs_secret_bytes () {
	return 192;
}

CRYPTO_STATUS sidhjs_keypair (
	uint8_t* public_key,
	uint8_t* private_key
) {
	CRYPTO_STATUS status	= KeyGeneration_A(private_key, public_key, isogeny);

	if (status != CRYPTO_SUCCESS) {
		return status;
	}

	status	= KeyGeneration_B(
		private_key + private_key_bytes,
		public_key + public_key_bytes,
		isogeny
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

CRYPTO_STATUS sidhjs_secret (
	uint8_t* public_key,
	uint8_t* private_key,
	uint8_t* secret
) {
	bool valid;
	CRYPTO_STATUS (*validate)(unsigned char* pk, bool* v, PCurveIsogenyStruct iso);
	CRYPTO_STATUS (*secret_agreement)(unsigned char* sk, unsigned char* pk, unsigned char* s, PCurveIsogenyStruct iso);

	int is_alice	= sodium_compare(
		public_key,
		private_key + full_private_key_bytes,
		full_public_key_bytes
	);

	if (is_alice == 1) {
		validate			= Validate_PKB;
		secret_agreement	= SecretAgreement_A;

		public_key += public_key_bytes;
	}
	else if (is_alice == -1) {
		validate			= Validate_PKA;
		secret_agreement	= SecretAgreement_B;

		private_key += private_key_bytes;
	}
	else {
		return CRYPTO_ERROR_INVALID_PARAMETER;
	}

	CRYPTO_STATUS validate_status	= validate(public_key, &valid, isogeny);

	if (validate_status != CRYPTO_SUCCESS) {
		return validate_status;
	}
	if (!valid) {
		return CRYPTO_ERROR_PUBLIC_KEY_VALIDATION;
	}

	return secret_agreement(private_key, public_key, secret, isogeny);
}
