# CLAUDE.md — wasm-example

## What this project is

A sandbox for running bioinformatics CLI tools in the browser via WebAssembly.
It currently has two working tools: `gc_calculator` (a Rust toy, compiled with
wasm-pack) and `kalign` (a C multiple-sequence aligner, compiled with Emscripten
and loaded via aioli).  The eventual goal is a phylogenetics pipeline: align
sequences, then build a tree.

## Key architectural decision: wasm-pack vs aioli

- **Rust tools** use `wasm-pack` (`wasm-bindgen`, target `wasm32-unknown-unknown`). They export typed JS functions via ES modules. The browser calls them directly.
- **C/C++ tools** use [aioli from biowasm](https://biowasm.com/documentation/).
  Aioli wraps Emscripten-compiled CLI binaries in a WebWorker with a shared
  virtual filesystem.  Input is provided via `mount()`; output is captured from
  stdout via `exec()`.  See `README.md` for a detailed walkthrough.  Aioli is
  *not* compatible with wasm-pack output.

Do not try to load a wasm-pack tool through aioli, or vice versa.

## Project structure

```
tools/                  # one directory per tool, each self-contained
  gc_calculator/        #   Rust / wasm-pack tool
    Cargo.toml
    src/lib.rs          #   source + unit tests
    pkg/                #   wasm-pack output (gitignored)
  kalign/               #   C tool via aioli (binary fetched from biowasm CDN)
    download.sh         #   downloads pre-built .wasm + .js into pkg/
    pkg/                #   downloaded binary (gitignored)
web/                    # single frontend
  index.html            #   shell only: sidebar nav + tool-area container
  aioli.d.ts            #   ambient type declarations for the Aioli CDN global
  main.ts               #   tool registry, sidebar logic, lazy init/swap
  favicon.svg           #   hand-drawn DNA helix icon
  tools/                #   one .ts file per tool (frontend modules)
    gc_calculator.ts    #     wasm-pack tool module
    kalign.ts           #     aioli tool module
  binaries/             #   built wasm copied here by make (gitignored)
test/                   # TypeScript unit tests (node:test, zero extra deps)
  tsconfig.json         #   scoped config: includes only the files each test needs
  kalign.test.ts        #   mock-based tests for align() (no browser needed)
test-data/              # shared test fixtures
tsconfig.json           # TypeScript config (ES2020 modules, bundler resolution)
package.json            # npm dev server + typescript  ("type": "module")
Makefile                # make test-gc-calculator | make test-kalign | make run
README.md               # user-facing docs; detailed Aioli walkthrough
```

### Adding a new tool

Every tool, regardless of backend, follows the same three steps:

1. **`tools/<name>/`** — owns the binary.  Rust tools have `Cargo.toml` +
   `src/lib.rs`; C/C++ tools have a `download.sh` (placeholder for a future
   Emscripten compile step).  Build output lands in `pkg/` (gitignored).

2. **`Makefile` target `build-<name>`** — produces `pkg/` then copies it into
   `web/binaries/<name>/`.  For Rust that means `wasm-pack build`; for C/C++ it
   means running `download.sh`.

3. **`web/tools/<name>.ts`** — the tool module.  Exports an object with `id`, `name`,
   `description`, `init()`, and `render(container)`.  Register it in the
   `TOOLS` array in `web/main.ts`.  That's the only change outside the new
   files.

   - Aioli tools also declare `aioliTools: ["name/version"]` so the shared
     instance knows which binaries to download.
   - Export the core logic as a named async function (e.g. `export async
     function align()`).  This lets unit tests call it directly with a mock
     Aioli instance — no browser needed.

4. **`test/<name>.test.ts`** (recommended for aioli tools) — mock Aioli, call
   the exported function, assert on the mount/exec calls.  Add a corresponding
   `test-<name>` target to the Makefile.

`init()` is called lazily on first sidebar click.  `render()` is called once
immediately after; the container persists (show/hide on tool switch).

## Build & run

```sh
make test-gc-calculator   # cargo test, no wasm build required
make test-kalign          # tsc (test tsconfig) + node --test — no browser needed
make run                  # wasm-pack build + download kalign + tsc + dev server (port 8080)
```

The dev server (`serve`) must run from the **project root** so that both `web/` and `tools/*/pkg/` are reachable. The page is at `http://localhost:8080/web/`.

## Devcontainer

Image: `mcr.microsoft.com/devcontainers/rust:stable` + `wasm-pack` + Node 20 (via devcontainer feature). `postCreateCommand` runs `npm install`. Everything needed is in the container; nothing needs to be installed on the host.

## Conventions

- Tools serialize results to JSON from Rust (`serde_json`), JS parses with `JSON.parse()`. This keeps the Rust side language-agnostic and avoids the complexity of custom JsValue types.
- `Deserialize` is derived on result structs so unit tests can round-trip through JSON without a second struct.
- `pkg/` and `target/` inside each tool are gitignored via the root `.gitignore` globs (`tools/*/pkg/`, `tools/*/target/`).
- Escape all user-facing strings in the HTML via DOM text-node insertion (see `escapeHtml` in `main.ts`).
- The frontend is TypeScript. `wasm-pack` emits `.d.ts` declarations alongside the `.js` glue; `tsc` picks them up automatically via `bundler` module resolution. All `web/**/*.js` files are generated output (gitignored).
- `package.json` sets `"type": "module"` so Node treats `.js` files as ES modules.  Required for `node --test` to load tsc output.
- Aioli tools use `mount([{ name, data }])` to provide input and `exec(cmd)` to run and capture stdout.  Do **not** use `fs.writeFile` / `fs.readFile` — those bypass aioli's abstraction layer.
- Unit tests for aioli tools live in `test/` and use a mock Aioli that records calls.  `test/tsconfig.json` scopes its `include` to only the files each test needs, so it never pulls in wasm-pack dependencies.
