# 🚀 WSL2 Production Setup Guide - NeXus Smart Contracts

**The only reliable way to deploy Solana programs from Windows in 2026.**

This guide provides the **battle-tested, production-grade setup** used by professional teams. Native Windows tooling is still unreliable for Solana development — WSL2 is the real solution.

---

## ⚠️ What NOT to Use

**DO NOT use:**
- ❌ Native Windows Rust toolchain
- ❌ PowerShell Solana CLI
- ❌ Git Bash builds
- ❌ Windows-native BPF toolchain

**These will cause:**
- `ld.lld` linker errors
- BPF compilation failures
- Path length errors (NTFS limits)
- Permission denied errors
- Bloated binaries

---

## ✅ Recommended Stack (Battle-tested)

**USE THIS:**
- ✅ WSL2 (Ubuntu 22.04 or newer)
- ✅ Anchor framework
- ✅ Solana CLI inside WSL
- ✅ Linux Rust toolchain

This matches Linux CI/CD pipelines and validator environments used by:
- Solana Labs devs
- Anchor maintainers
- Production validators

---

## Step 1 — Install WSL2 (If Not Already)

Open **PowerShell as Administrator**:

```powershell
wsl --install
```

**Reboot your computer.**

After reboot, open **Ubuntu** from Start Menu.

Verify WSL2 is working:

```bash
uname -a
```

Should show Linux kernel (e.g., `5.15.x` or newer).

**If you see WSL1, upgrade to WSL2:**
```powershell
# In PowerShell (Admin)
wsl --set-default-version 2
wsl --set-version Ubuntu 2
```

---

## Step 2 — Update Ubuntu Environment

Inside WSL terminal:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install build-essential pkg-config libssl-dev curl git -y
```

**Why:** These are required for Rust, Solana, and Anchor builds. Missing them causes cryptic linker errors that waste hours.

---

## Step 3 — Install Rust (Correct Way)

Inside WSL:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Restart shell or reload:**

```bash
source ~/.cargo/env
```

**Verify:**

```bash
rustc --version
cargo --version
```

Should show Rust 1.79.0 or newer (required for Anchor 0.32.1+).

**Add to `~/.bashrc` permanently:**

```bash
echo 'source $HOME/.cargo/env' >> ~/.bashrc
```

---

## Step 4 — Install Solana CLI (Linux Binary)

**DO NOT use Windows Solana installer.** Use the Linux binary inside WSL:

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

**Reload PATH:**

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

**Verify:**

```bash
solana --version
```

Should show Solana 2.1.5 or newer.

**Make PATH permanent:**

```bash
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## Step 5 — Install Anchor (Strongly Recommended)

Anchor handles IDL generation, deployment, upgrades, and avoids CLI bugs. It's what production teams use.

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

**Verify:**

```bash
anchor --version
```

Should show Anchor 0.32.1 or newer (matches your `Anchor.toml`).

**If avm commands aren't found:**

```bash
export PATH="$HOME/.cargo/bin:$PATH"
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
```

---

## Step 6 — Configure Wallet

### Option A — Create New Keypair:

```bash
solana-keygen new
```

**Save the recovery phrase securely!**

### Option B — Import Existing Keypair:

```bash
# If you have a keypair file from Windows
solana-keygen recover prompt://?full-path=/mnt/e/path/to/your/keypair.json
```

**Set as default:**

```bash
solana config set --keypair ~/.config/solana/id.json
```

**Verify:**

```bash
solana config get
```

---

## Step 7 — Select Network

### Devnet (Recommended for Testing):

```bash
solana config set --url https://api.devnet.solana.com
```

### Mainnet (Production):

```bash
solana config set --url https://api.mainnet-beta.solana.com
```

**Verify:**

```bash
solana config get
```

Should show your selected RPC URL.

---

## Step 8 — Fund Wallet (Devnet)

```bash
solana airdrop 2
```

**Check balance:**

```bash
solana balance
```

**If airdrop fails (rate limited):**

```bash
# Try faucet: https://faucet.solana.com/
# Or wait a few minutes and retry
solana airdrop 2
```

---

## Step 9 — Navigate to Your Project

From WSL, access your Windows project:

```bash
cd /mnt/e/programming/Martech/programs
```

**Note:** WSL mounts Windows drives at `/mnt/c/`, `/mnt/d/`, `/mnt/e/`, etc.

**Verify you're in the right place:**

```bash
ls -la
# Should see Anchor.toml, Cargo.toml, programs/, etc.
```

---

## Step 10 — Build Programs (Reliable)

```bash
anchor build
```

**This automatically uses:**
- ✅ Correct BPF toolchain
- ✅ Correct LLVM version
- ✅ Solana SDK
- ✅ Cross compiler

**First build takes 5-10 minutes** (compiling dependencies). Subsequent builds are faster.

**If build fails:**
```bash
# Clean and retry
cargo clean
anchor build
```

---

## Step 11 — Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

**Or use the deployment script:**

```bash
./scripts/deploy.sh
```

**Anchor handles:**
- ✅ Program buffer account creation
- ✅ Upgrade authority setup
- ✅ Account reallocation
- ✅ Compute budget issues

**After deployment, update program IDs in:**
1. `Anchor.toml` (already configured for your programs)
2. Frontend `.env.local`
3. Backend `.env`

---

## Step 12 — Test Locally (Optional)

**Start local validator (in one terminal):**

```bash
solana-test-validator
```

**In another terminal:**

```bash
cd /mnt/e/programming/Martech/programs
solana config set --url localhost
solana airdrop 10
anchor deploy
anchor test
```

---

## Quick Reference Commands

```bash
# Build programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy specific program
anchor deploy --program-name nexus-launchpad --provider.cluster devnet

# Run tests
anchor test

# Check Solana config
solana config get

# Check balance
solana balance

# Get devnet SOL
solana airdrop 2

# View program logs
solana logs

# Check program account
solana account YOUR_PROGRAM_ID
```

---

## Troubleshooting

### PATH Issues

If commands aren't found:

```bash
# Add to ~/.bashrc
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
source ~/.bashrc
```

### Permission Issues

WSL should handle Windows file permissions automatically. If you get errors:

```bash
# Usually not needed, but if required:
sudo chown -R $USER:$USER /mnt/e/programming/Martech
```

### SSL/TLS Errors

If Solana/Anchor installation fails with SSL errors:

```bash
sudo apt update
sudo apt install -y ca-certificates
sudo update-ca-certificates
```

Then retry installation.

### Port Already in Use

If validator won't start:

```bash
# Find and kill the process
lsof -ti:8899 | xargs kill -9
# Or
pkill solana-test-validator
```

### Build Errors

**"cannot find crate":**
```bash
cargo clean
anchor build
```

**"program too large":**
- Check `Cargo.toml` optimization settings
- Reduce program size

### Deployment Errors

**"insufficient funds":**
```bash
solana airdrop 2
solana balance
```

**"program already deployed":**
- Update program ID in `Anchor.toml`
- Or use `--program-id` flag

---

## Why This Works (The Technical Truth)

| Problem on Windows            | Why It Happens                          | WSL2 Solution                    |
| ------------------------------ | --------------------------------------- | -------------------------------- |
| `ld.lld` errors                | Windows linker incompatible             | Linux linker (native)            |
| BPF compile fails              | Wrong LLVM on Windows                   | Correct LLVM in Solana toolchain  |
| Path length errors             | NTFS 260-char limit                     | Linux ext4 (no limit)            |
| Permission denied              | Windows file ACL conflicts              | Linux permissions (simple)       |
| Program too large              | Windows build produces bloated binaries | Linux build (optimized)          |
| Cross-compilation issues       | Windows → BPF is complex                | Linux → BPF is native            |

**WSL2 avoids ALL of these because it's real Linux.**

---

## Alternative: Docker (Not Recommended)

If you absolutely refuse WSL2, Docker is your only stable alternative:

```bash
docker run -it solanalabs/solana:v1.18.0 bash
```

**But:**
- ❌ Volume mounts are slower
- ❌ Debugging is harder
- ❌ More complex setup
- ❌ Doesn't match production environments

**WSL2 is faster and simpler.**

---

## Production Checklist

Before deploying to mainnet:

- [ ] ✅ WSL2 + Ubuntu installed
- [ ] ✅ Rust 1.79.0+ installed
- [ ] ✅ Solana CLI 2.1.5+ installed
- [ ] ✅ Anchor 0.32.1+ installed
- [ ] ✅ Wallet configured and funded
- [ ] ✅ Programs build successfully
- [ ] ✅ Tests pass locally
- [ ] ✅ Deployed to devnet
- [ ] ✅ Tested on devnet
- [ ] ✅ Program IDs updated in configs
- [ ] ✅ Security audit completed
- [ ] ✅ Ready for mainnet deployment

---

## Next Steps

1. ✅ Complete WSL2 setup
2. ✅ Build your programs: `anchor build`
3. ✅ Deploy to devnet: `anchor deploy --provider.cluster devnet`
4. ✅ Update program IDs in `Anchor.toml`
5. ✅ Test with frontend/backend
6. ✅ Get security audit
7. 🚀 Deploy to mainnet

---

## Resources

- [Anchor Book](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Docs](https://docs.solana.com/)
- [WSL2 Documentation](https://docs.microsoft.com/en-us/windows/wsl/)

---

**You're not crazy — native Windows Solana tooling is still unreliable. WSL2 is the real solution. 💪**
