test-gc-calculator:
	cargo test --manifest-path tools/gc_calculator/Cargo.toml   # unit tests (no wasm needed)

build-gc-calculator:
	cd tools/gc_calculator && wasm-pack build --target web
	mkdir -p web/tools/gc_calculator
	cp tools/gc_calculator/pkg/* web/tools/gc_calculator/

build-frontend: build-gc-calculator
	npx tsc

run: build-frontend
	npm run serve
