#!/usr/bin/env bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
KP=/mnt/e/programming/Martech/programs/deployer-keypair.json
SO=/mnt/d/nexusbuild/nexus_launchpad.so
PID=CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm
RPC=https://rpc.nexus-web3.com
echo "=== solana version ==="; solana --version
echo "=== extend program account by 90000 bytes ==="
solana program extend "$PID" 90000 --keypair "$KP" --url "$RPC" && echo "EXTEND_OK" || echo "EXTEND_FAILED=$?"
echo "=== deploy (upgrade) via RPC ==="
solana program deploy --use-rpc --keypair "$KP" --upgrade-authority "$KP" --url "$RPC" --program-id "$PID" "$SO"
echo "DEPLOY_EXIT=$?"
