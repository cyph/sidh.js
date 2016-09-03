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
		return KeyGeneration_A(private_key, public_key, isogeny);
	}
	else {
		return KeyGeneration_B(private_key, public_key, isogeny);
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
	int is_alice,
	int should_validate
) {
	CRYPTO_STATUS (*validate)(unsigned char* pk, bool* v, PCurveIsogenyStruct iso);
	CRYPTO_STATUS (*secret_agreement)(unsigned char* sk, unsigned char* pk, unsigned char* s, PCurveIsogenyStruct iso);

	if (is_alice) {
		validate			= Validate_PKB;
		secret_agreement	= SecretAgreement_A;
	}
	else {
		validate			= Validate_PKA;
		secret_agreement	= SecretAgreement_B;
	}

	if (should_validate) {
		bool valid;
		CRYPTO_STATUS validate_status	= validate(public_key, &valid, isogeny);

		if (validate_status != CRYPTO_SUCCESS) {
			return validate_status;
		}
		if (!valid) {
			return CRYPTO_ERROR_PUBLIC_KEY_VALIDATION;
		}
	}

	return secret_agreement(private_key, public_key, secret, isogeny);
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
		is_alice,
		1
	);
}
