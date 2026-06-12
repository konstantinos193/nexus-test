#!/usr/bin/env bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
DEPLOYER=/mnt/e/programming/Martech/programs/deployer-keypair.json
NEXUSKP=/mnt/e/tmp/nexus_launchpad-keypair.json
SO=/mnt/d/nexusbuild/nexus_launchpad.so
RPC=https://rpc.nexus-web3.com
echo "=== program keypair pubkey ==="; solana-keygen pubkey "$NEXUSKP"
echo "=== fresh deploy nexus at CzpjY2 ==="
solana program deploy --use-rpc --keypair "$DEPLOYER" --program-id "$NEXUSKP" --url "$RPC" "$SO"
echo "DEPLOY_EXIT=$?"
