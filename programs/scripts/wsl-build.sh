#!/usr/bin/env bash
set -euo pipefail

export RUSTUP_HOME="${RUSTUP_HOME:-/mnt/d/rustup}"
export CARGO_HOME="${CARGO_HOME:-/mnt/d/cargo}"
export PATH="/mnt/d/cargo/bin:/mnt/d/solana/active_release/bin:${PATH}"

cd "$(dirname "$0")/.."

echo "=== WSL build (D-drive toolchain) ==="
echo "RUSTUP_HOME=$RUSTUP_HOME"
echo "CARGO_HOME=$CARGO_HOME"

rustup default stable-x86_64-unknown-linux-gnu
rustup show

# Install Linux Solana CLI into WSL home if cargo-build-sbf missing
if ! command -v cargo-build-sbf >/dev/null 2>&1; then
  echo "Installing Solana v1.18.26 for Linux..."
  sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

cargo-build-sbf --version

# Anchor via avm (D-drive cargo cache)
if [ ! -s /mnt/d/cargo/bin/anchor ] && [ -x /mnt/d/cargo/bin/avm ]; then
  echo "Installing anchor 0.32.1 via avm..."
  /mnt/d/cargo/bin/avm install 0.32.1
  /mnt/d/cargo/bin/avm use 0.32.1
fi
export PATH="/mnt/d/cargo/bin:$PATH"

if [ -s /mnt/d/cargo/bin/anchor ]; then
  echo "Running anchor build (idl-build)..."
  /mnt/d/cargo/bin/anchor build -- --features idl-build
else
  echo "anchor missing — cargo build-sbf only..."
  cd programs/nexus-launchpad
  cargo-build-sbf
  cd ../..
fi

mkdir -p target/deploy
if [ -f target/deploy/nexus_launchpad.so ]; then
  echo "Built: target/deploy/nexus_launchpad.so"
elif [ -f target/sbpf-solana-solana/release/nexus_launchpad.so ]; then
  cp target/sbpf-solana-solana/release/nexus_launchpad.so target/deploy/
  echo "Copied to target/deploy/nexus_launchpad.so"
fi

if [ -f target/idl/nexus_launchpad.json ]; then
  cp target/idl/nexus_launchpad.json ../Backend/src/solana/idl/nexus_launchpad.json
  echo "Synced IDL -> Backend"
fi

echo "=== Build complete ==="