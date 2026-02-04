#!/bin/bash
# Downloads the pre-built Kalign binary from the biowasm CDN into pkg/.
# In a real Emscripten workflow this would be replaced by a compile step.
# Idempotent: skips the download if pkg/kalign.wasm already exists.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG="$SCRIPT_DIR/pkg"
VERSION="3.3.1"
CDN="https://biowasm.com/cdn/v3/kalign/$VERSION"

mkdir -p "$PKG"

if [ -f "$PKG/kalign.wasm" ]; then
    echo "kalign $VERSION already present in pkg/ — skipping download"
    exit 0
fi

echo "Downloading kalign $VERSION from biowasm CDN…"
curl -sf "$CDN/kalign.wasm" -o "$PKG/kalign.wasm"
curl -sf "$CDN/kalign.js"   -o "$PKG/kalign.js"
echo "Done."
