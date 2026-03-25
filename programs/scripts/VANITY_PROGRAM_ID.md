# Generating Vanity Program IDs

This guide explains how to generate custom program IDs with specific suffixes, similar to how Pump.fun creates program IDs ending with "pump".

## What is a Vanity Program ID?

A vanity program ID is a Solana program address that ends with a specific string (like "nexus", "martech", etc.). This is achieved through brute-force keypair generation until a matching address is found.

**⚠️ Important**: Use your own unique suffix! Don't copy "pump" - that's already taken by pump.fun. Use your brand name or project identifier instead.

## Usage

### PowerShell (Windows)

```powershell
# Generate a vanity program ID ending with "nexus" (use your own unique suffix!)
.\scripts\generate-vanity-program-id.ps1 nexus

# Generate and auto-update configuration for a specific program
.\scripts\generate-vanity-program-id.ps1 nexus nexus_collection
```

### Bash (Linux/WSL/Mac)

```bash
# Make script executable (first time only)
chmod +x scripts/generate-vanity-program-id.sh

# Generate a vanity program ID ending with "nexus" (use your own unique suffix!)
./scripts/generate-vanity-program-id.sh nexus

# Generate and auto-update configuration for a specific program
./scripts/generate-vanity-program-id.sh nexus nexus_collection
```

## How It Works

1. **Grinding**: The script uses `solana-keygen grind` to generate thousands (or millions) of keypairs until it finds one whose base58-encoded address ends with your desired suffix.

2. **Time Considerations**:
   - **1-3 characters**: Seconds to minutes
   - **4 characters** (like "nexus"): Minutes to hours
   - **5+ characters**: Hours to days (or longer)

3. **Keypair Storage**: Generated keypairs are saved in the `keypairs/` directory (which is gitignored for security).

## Examples

### Generate a "nexus" suffix for nexus_collection

```powershell
.\scripts\generate-vanity-program-id.ps1 nexus nexus_collection
```

This will:
- Generate a program ID ending with "nexus"
- Update `Anchor.toml` with the new program ID
- Update `programs/nexus-collection/src/lib.rs` with the new `declare_id!` value
- Save the keypair to `keypairs/nexus_collection_nexus.json`

### Generate a "nexus" suffix for nexus_launchpad

```powershell
.\scripts\generate-vanity-program-id.ps1 nexus nexus_launchpad
```

### Other suffix ideas for your project:
- `nexus` - Your brand name
- `martech` - Project identifier
- `nft` - If focused on NFTs
- `launch` - For launchpad programs
- Any 3-4 character unique identifier for your brand

## After Generation

1. **Rebuild your program**:
   ```bash
   anchor build
   ```

2. **Deploy with the new keypair**:
   ```bash
   anchor deploy --program-keypair keypairs/<program-name>_<suffix>.json
   ```

## Important Notes

- ⚠️ **Keep keypairs secure**: Never commit keypair files to git (they're already in `.gitignore`)
- ⚠️ **Suffix length matters**: Longer suffixes take exponentially more time
- 💡 **Pre-generate**: For production, consider pre-generating vanity addresses well in advance
- 🚀 **GPU acceleration**: For faster generation, consider using GPU-based vanity address generators like [solanity](https://github.com/mcf-rocks/solanity)

## Troubleshooting

### "solana-keygen: command not found"
Make sure Solana CLI is installed and in your PATH:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### Generation is too slow
- Use a shorter suffix (3-4 characters max for reasonable times)
- Consider using GPU-based tools for faster generation
- Run on a machine with more CPU cores (grinding is parallelized)

### Program ID already exists
If you get an error that the program ID is already in use, you'll need to generate a new one. The script will create a unique keypair each time.
