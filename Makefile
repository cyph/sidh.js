all:
	rm -rf dist SIDH libsodium 2> /dev/null
	mkdir dist

	git clone --depth 1 -b stable https://github.com/jedisct1/libsodium
	cd libsodium ; emconfigure ./configure --enable-minimal --disable-shared

	git clone --depth 1 https://github.com/Microsoft/PQCrypto-SIDH
	mv PQCrypto-SIDH SIDH
	cd SIDH ; mv SIDH_setup.c tmp ; echo '#include <stdlib.h>' > SIDH_setup.c ; cat tmp >> SIDH_setup.c ; rm tmp

	bash -c ' \
		args="$$(echo " \
			-s SINGLE_FILE=1 \
			-D_GENERIC_ -D__LINUX__ -D_X86_ \
			-s TOTAL_MEMORY=16777216 -s TOTAL_STACK=8388608 \
			-s NO_DYNAMIC_EXECUTION=1 -s ASSERTIONS=0 \
			-s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s ALIASING_FUNCTION_POINTERS=1 \
			-s FUNCTION_POINTER_ALIGNMENT=1 -s DISABLE_EXCEPTION_CATCHING=1 \
			-s RESERVED_FUNCTION_POINTERS=8 -s NO_FILESYSTEM=1 \
			-Ilibsodium/src/libsodium/include/sodium \
			-ISIDH \
			libsodium/src/libsodium/sodium/utils.c \
			libsodium/src/libsodium/randombytes/randombytes.c \
			$$(ls SIDH/*.c SIDH/generic/*.c) \
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
		" | perl -pe "s/\s+/ /g" | perl -pe "s/\[ /\[/g" | perl -pe "s/ \]/\]/g")"; \
		\
		bash -c "emcc -Oz -s RUNNING_JS_OPTS=1 -s NO_EXIT_RUNTIME=1 $$args -o dist/sidh.asm.js"; \
		bash -c "emcc -O3 -s WASM=1 $$args -o dist/sidh.wasm.js"; \
	'

	cp pre.js dist/sidh.tmp.js
	echo " \
		var moduleReady; \
		if (typeof WebAssembly !== 'undefined') { \
	" >> dist/sidh.tmp.js
	cat dist/sidh.wasm.js >> dist/sidh.tmp.js
	echo " \
			moduleReady = new Promise(function (resolve) { \
				var interval = setInterval(function () { \
					if (!Module.usingWasm) { \
						return; \
					} \
					clearInterval(interval); \
					resolve(); \
				}, 50); \
			});\
		} \
		else { \
	" >> dist/sidh.tmp.js
	cat dist/sidh.asm.js >> dist/sidh.tmp.js
	echo " \
			moduleReady = Promise.resolve(); \
		} \
	" >> dist/sidh.tmp.js
	cat post.js >> dist/sidh.tmp.js

	uglifyjs dist/sidh.tmp.js -cmo dist/sidh.js

	sed -i 's|use asm||g' dist/sidh.js
	sed -i 's|require(|eval("require")(|g' dist/sidh.js

	rm -rf SIDH libsodium dist/sidh.*.js

clean:
	rm -rf dist SIDH libsodium
