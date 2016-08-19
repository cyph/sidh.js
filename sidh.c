#include <stdlib.h>
#include <time.h>
#include "SIDH_internal.h"
#include "SIDH.h"
#include "randombytes.h"


PCurveIsogenyStruct isogeny;

long public_key_bytes	= 768;
long private_key_bytes	= 48;


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
	return public_key_bytes + 1;
}

long sidhjs_private_key_bytes () {
	return private_key_bytes + 1;
}

long sidhjs_secret_bytes () {
	return 192;
}

CRYPTO_STATUS sidhjs_keypair (
	int is_alice,
	uint8_t public_key[],
	uint8_t private_key[]
) {
	CRYPTO_STATUS status;

	if (is_alice) {
		status	= KeyGeneration_A(private_key, public_key, isogeny);

		public_key[public_key_bytes]	= 1;
		private_key[private_key_bytes]	= 1;
	}
	else {
		status	= KeyGeneration_B(private_key, public_key, isogeny);

		public_key[public_key_bytes]	= 0;
		private_key[private_key_bytes]	= 0;
	}

	return status;
}

CRYPTO_STATUS sidhjs_secret (
	uint8_t public_key[],
	uint8_t private_key[],
	uint8_t* secret
) {
	bool valid;
	CRYPTO_STATUS (*validate)(unsigned char* pk, bool* v, PCurveIsogenyStruct iso);
	CRYPTO_STATUS (*secret_agreement)(unsigned char* sk, unsigned char* pk, unsigned char* s, PCurveIsogenyStruct iso);

	int is_public_alice		= public_key[public_key_bytes];
	int is_private_alice	= private_key[private_key_bytes];

	if (
		(is_public_alice && is_private_alice) ||
		(!is_public_alice && !is_private_alice)
	) {
		return CRYPTO_ERROR_INVALID_PARAMETER;
	}

	if (is_private_alice) {
		validate			= Validate_PKB;
		secret_agreement	= SecretAgreement_A;
	}
	else {
		validate			= Validate_PKA;
		secret_agreement	= SecretAgreement_B;
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
