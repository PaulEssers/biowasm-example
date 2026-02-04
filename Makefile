test-gc-calculator:
	cargo test --manifest-path tools/gc_calculator/Cargo.toml   # unit tests (no wasm needed)

test-kalign:
	npx tsc -p test/tsconfig.json
	node --test test/kalign.test.js

build-gc-calculator:
	cd tools/gc_calculator && wasm-pack build --target web
	mkdir -p web/binaries/gc_calculator
	cp tools/gc_calculator/pkg/* web/binaries/gc_calculator/

# kalign: binary downloaded from the biowasm CDN (stand-in for an Emscripten
# compile step).  Aioli resolves <urlCDN>/<name>/<version>/<name>.{js,wasm},
# so the version subdirectory is required.
build-kalign:
	cd tools/kalign && bash download.sh
	mkdir -p web/binaries/kalign/3.3.1
	cp tools/kalign/pkg/* web/binaries/kalign/3.3.1/

build-frontend: build-gc-calculator build-kalign
	npx tsc

run: build-frontend
	npm run serve
