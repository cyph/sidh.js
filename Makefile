all:
	rm -rf dist SIDH_v1.0 libsodium 2> /dev/null
	mkdir dist

	git clone -b stable https://github.com/jedisct1/libsodium.git
	cd libsodium ; emconfigure ./configure --enable-minimal --disable-shared

	wget https://download.microsoft.com/download/7/B/9/7B962BAC-18F9-4151-A57E-2D3499B6AD25/SIDH_v1.0.zip
	unzip SIDH_v1.0.zip
	rm SIDH_v1.0.zip
	cd SIDH_v1.0 ; mv SIDH_setup.c tmp ; echo '#include <stdlib.h>' > SIDH_setup.c ; cat tmp >> SIDH_setup.c ; rm tmp

	bash -c ' \
		args="$$(echo " \
			--memory-init-file 0 \
			-D _GENERIC_ -D __LINUX__ -D _X86_ \
			-s TOTAL_MEMORY=65536 -s TOTAL_STACK=32768 \
			-s NO_DYNAMIC_EXECUTION=1 -s RUNNING_JS_OPTS=1 -s ASSERTIONS=0 \
			-s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s ALIASING_FUNCTION_POINTERS=1 \
			-s FUNCTION_POINTER_ALIGNMENT=1 -s DISABLE_EXCEPTION_CATCHING=1 \
			-s RESERVED_FUNCTION_POINTERS=8 -s NO_FILESYSTEM=1 \
			-Ilibsodium/src/libsodium/include/sodium \
			-ISIDH_v1.0 \
			libsodium/src/libsodium/sodium/utils.c \
			libsodium/src/libsodium/randombytes/randombytes.c \
			$$(ls SIDH_v1.0/*.c SIDH_v1.0/generic/*.c) \
			sidh.c \
			-s EXPORTED_FUNCTIONS=\"[ \
				'"'"'_sidhjs_init'"'"', \
				'"'"'_sidhjs_keypair_base'"'"', \
				'"'"'_sidhjs_keypair'"'"', \
				'"'"'_sidhjs_secret_base'"'"', \
				'"'"'_sidhjs_secret'"'"', \
				'"'"'_sidhjs_public_key_bytes_base'"'"', \
				'"'"'_sidhjs_public_key_bytes'"'"', \
				'"'"'_sidhjs_private_key_bytes_base'"'"', \
				'"'"'_sidhjs_private_key_bytes'"'"', \
				'"'"'_sidhjs_secret_bytes'"'"' \
			]\" \
			--pre-js pre.js --post-js post.js \
		" | perl -pe "s/\s+/ /g" | perl -pe "s/\[ /\[/g" | perl -pe "s/ \]/\]/g")"; \
		\
		bash -c "emcc -O3 $$args -o dist/sidh.js"; \
		bash -c "emcc -O0 -g4 $$args -s DISABLE_EXCEPTION_CATCHING=0 -s ASSERTIONS=2 -o dist/sidh.debug.js"; \
	'

	rm -rf SIDH_v1.0 libsodium

clean:
	rm -rf dist SIDH_v1.0 libsodium
