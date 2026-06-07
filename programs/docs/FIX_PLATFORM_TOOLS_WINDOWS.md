# Fix Platform Tools "Access Denied" Error on Windows

## The Problem
`cargo-build-sbf` is trying to install platform-tools but getting "Access is denied (os error 5)" on Windows.

## Solutions (Try in Order)

### Solution 1: Run PowerShell as Administrator ⚡ (Quickest Fix)

1. **Close your current PowerShell**
2. **Right-click PowerShell** → **Run as Administrator**
3. Navigate to your project:
   ```powershell
   cd E:\programming\Martech\programs
   ```
4. Set environment variable:
   ```powershell
   $env:SOLANA_PLATFORM_TOOLS_DIR = "$env:USERPROFILE\.cache\solana\v1.52\platform-tools"
   ```
5. Try building:
   ```powershell
   anchor build
   ```

### Solution 2: Use WSL2 (Recommended for Production) 🐧

WSL2 is the recommended setup for Solana development on Windows (as mentioned in your README).

1. **Open WSL2 Ubuntu**:
   ```powershell
   wsl
   ```

2. **Navigate to your project**:
   ```bash
   cd /mnt/e/programming/Martech/programs
   ```

3. **Build in WSL2**:
   ```bash
   anchor build
   ```

This avoids all Windows permission issues and matches Linux CI/CD environments.

### Solution 3: Manually Download Platform Tools 📥

If automatic download keeps failing:

1. **Download platform-tools manually**:
   - Go to: https://github.com/solana-labs/platform-tools/releases
   - Download the latest release for your platform
   - Extract to: `C:\Users\konst\.cache\solana\v1.52\platform-tools\`

2. **Set environment variable**:
   ```powershell
   [System.Environment]::SetEnvironmentVariable('SOLANA_PLATFORM_TOOLS_DIR', 'C:\Users\konst\.cache\solana\v1.52\platform-tools', 'User')
   ```

3. **Restart terminal and try again**

### Solution 4: Check Antivirus/Windows Defender 🛡️

Sometimes Windows Defender or antivirus blocks the installation:

1. **Temporarily disable Windows Defender** (for testing only)
2. **Add exception** for `C:\Users\konst\.cache\solana\` in Windows Defender
3. **Try building again**

### Solution 5: Use Different Directory Location 📁

Try using a directory outside your user profile:

```powershell
# Create directory in a location you definitely have access to
$toolsDir = "E:\solana-platform-tools"
New-Item -ItemType Directory -Path $toolsDir -Force

# Set environment variable
$env:SOLANA_PLATFORM_TOOLS_DIR = $toolsDir
[System.Environment]::SetEnvironmentVariable('SOLANA_PLATFORM_TOOLS_DIR', $toolsDir, 'User')

# Try building
anchor build
```

## Quick Test Script

Run this to test if the directory is writable:

```powershell
$testDir = "$env:USERPROFILE\.cache\solana\v1.52\platform-tools"
New-Item -ItemType Directory -Path $testDir -Force
$testFile = Join-Path $testDir "test.tmp"
"test" | Out-File -FilePath $testFile
if (Test-Path $testFile) {
    Write-Host "✓ Directory is writable" -ForegroundColor Green
    Remove-Item $testFile
} else {
    Write-Host "✗ Directory is NOT writable - need admin or different location" -ForegroundColor Red
}
```

## Recommended Approach

**For development**: Use **WSL2** (Solution 2) - it's the most reliable and matches production environments.

**For quick fix**: Run PowerShell as **Administrator** (Solution 1).

## Why This Happens

- Windows UAC (User Account Control) restrictions
- Antivirus/Windows Defender blocking file operations
- Directory permissions not set correctly
- cargo-build-sbf trying to write to protected system directories

The environment variable approach should work, but sometimes Windows still blocks the operation if it's not run with elevated privileges.
