test-gc-calculator:
	cargo test --manifest-path tools/gc_calculator/Cargo.toml   # unit tests (no wasm needed)

test-kalign:
	npx tsc -p test/tsconfig.json
	node --test test/kalign.test.js

build-gc-calculator:
	cd tools/gc_calculator && wasm-pack build --target web
	mkdir -p web/tools/gc_calculator
	cp tools/gc_calculator/pkg/* web/tools/gc_calculator/

# kalign: binary downloaded from the biowasm CDN (stand-in for an Emscripten
# compile step).  Aioli loads it from the CDN at runtime; the local copy in
# web/tools/kalign/ mirrors the tools/*/pkg/ convention.
build-kalign:
	cd tools/kalign && bash download.sh
	mkdir -p web/tools/kalign
	cp tools/kalign/pkg/* web/tools/kalign/

build-frontend: build-gc-calculator build-kalign
	npx tsc

run: build-frontend
	npm run serve
