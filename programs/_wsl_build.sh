#!/usr/bin/env bash
set -e
# Reclaim WSL-VHD (C:) space from the previous build target, then build on D: so C: is never touched.
rm -rf "$HOME/nexustarget" 2>/dev/null || true
export RUSTUP_HOME=/mnt/d/rustup
export CARGO_HOME=/mnt/d/cargo
export CARGO_TARGET_DIR=/mnt/d/nexustarget
mkdir -p "$CARGO_TARGET_DIR"
export PATH="$HOME/.local/share/solana/install/active_release/bin:/mnt/d/cargo/bin:$PATH"
OUT=/mnt/d/nexusbuild
mkdir -p "$OUT"

df -h /mnt/c /mnt/d 2>/dev/null | sed 's/^/DF: /'
cd /mnt/e/programming/Martech/programs
echo "===BUILD (v1.54 tools, target on D:, deps re-resolved without anchor feature)==="
cargo-build-sbf --tools-version v1.54 --sbf-out-dir "$OUT"
echo "===RESULT==="
ls -la "$OUT/nexus_launchpad.so"
sha256sum "$OUT/nexus_launchpad.so" || true
