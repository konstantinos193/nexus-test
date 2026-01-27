# Docker Setup for Solana/Anchor Development

Use Docker to build and deploy Solana programs without installing Rust, Solana CLI, or Anchor locally.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

### Build Programs

**Windows PowerShell:**
```powershell
.\scripts\docker-build.ps1
```

**Linux/macOS:**
```bash
./scripts/docker-build.sh
```

**Or manually:**
```bash
docker-compose -f docker-compose.build.yml up --build
```

### Interactive Development Shell

**Windows PowerShell:**
```powershell
.\scripts\docker-shell.ps1
```

**Linux/macOS:**
```bash
./scripts/docker-shell.sh
```

**Or manually:**
```bash
docker-compose up -d
docker-compose exec anchor-dev /bin/bash
```

Once inside the container, you can run:
```bash
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

## Available Commands

### Build Programs
```bash
docker-compose -f docker-compose.build.yml up --build
```

### Run Tests
```bash
docker-compose run --rm anchor-dev anchor test
```

### Deploy to Devnet
```bash
docker-compose run --rm anchor-dev anchor deploy --provider.cluster devnet
```

### Interactive Shell
```bash
docker-compose up -d
docker-compose exec anchor-dev /bin/bash
```

### Clean Up
```bash
docker-compose down
docker volume rm programs_cargo-cache programs_solana-cache programs_target
```

## Docker Services

### `anchor-dev`
Interactive development container with:
- Rust toolchain
- Solana CLI
- Anchor 0.30.0
- Node.js & Yarn (for tests)

### Volumes
- `cargo-cache` - Cached Rust dependencies
- `solana-cache` - Cached Solana tools
- `target` - Build artifacts (shared with host)

## Development Workflow

1. **Start container:**
   ```bash
   docker-compose up -d
   ```

2. **Enter container:**
   ```bash
   docker-compose exec anchor-dev /bin/bash
   ```

3. **Build programs:**
   ```bash
   anchor build
   ```

4. **Run tests:**
   ```bash
   anchor test
   ```

5. **Deploy:**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

## Troubleshooting

### Permission Errors
If you get permission errors, ensure Docker Desktop is running and you have proper permissions.

### Build Cache Issues
Clear Docker volumes:
```bash
docker-compose down -v
```

### Container Not Starting
Check Docker Desktop is running and has enough resources allocated (4GB+ RAM recommended).

### Keypair Files
Keypair files in `target/deploy/` are shared between host and container, so they persist.

## Benefits

✅ No local installation needed  
✅ Consistent environment across team  
✅ No permission issues  
✅ Easy to clean and reset  
✅ Works on Windows, macOS, and Linux  

## Next Steps

After building with Docker:
1. Programs are built in `target/` directory
2. Deploy using Docker or copy keypairs to deploy manually
3. Update program IDs in config files

---

**Note:** First build will take longer as it downloads and installs all dependencies. Subsequent builds are much faster thanks to Docker caching.
