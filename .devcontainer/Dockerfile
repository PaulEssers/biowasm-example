FROM mcr.microsoft.com/devcontainers/rust:latest

# wasm32 target for wasm-pack builds
RUN rustup target add wasm32-unknown-unknown

# wasm-pack: the Rust -> WebAssembly build tool
RUN cargo install wasm-pack

# All of the above RUN as root, so /usr/local/cargo and /usr/local/rustup are
# owned by root.  The container runs as "vscode" at runtime (remoteUser), so
# hand the whole tree over now — otherwise crate downloads into the registry
# cache get Permission denied.
RUN chown -R vscode:vscode /usr/local/cargo /usr/local/rustup
