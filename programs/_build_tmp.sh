#!/usr/bin/env bash
set -e
echo "===INSTALL AGAVE (latest stable)==="
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)" > /tmp/install.log 2>&1 || { echo "INSTALL FAILED"; tail -30 /tmp/install.log; exit 1; }
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"
echo "===VERSIONS==="
solana --version
cargo-build-sbf --version
echo "===BUILD (default matched tools)==="
cd /workspace
if cargo-build-sbf -- --locked; then
  echo "BUILD_OK_DEFAULT"
else
  echo "DEFAULT TOOLS FAILED — retrying with --tools-version v1.54"
  cargo-build-sbf --tools-version v1.54 -- --locked
fi
echo "EXIT=$?"
ls -la target/deploy/nexus_launchpad.so 2>&1
