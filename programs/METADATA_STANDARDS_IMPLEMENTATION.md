# Metadata Standards Implementation - Complete

## Overview

This document describes the complete implementation of all Solana NFT/digital asset standards in the Nexus Launchpad platform. This is the **complete reality map** of all standards that developers actually encounter on Solana today.

## Implemented Standards

### ✅ Official / Canonical Standards (Production, Widely Used)

1. **Legacy NFT (Token Metadata)** - `Legacy = 0`
   - Program: `mpl-token-metadata`
   - Uses SPL Token (mint = 1, decimals = 0)
   - External JSON metadata, royalties optional
   - High rent cost (~0.021 SOL)
   - Universal support, tooling everywhere

2. **Programmable NFT (pNFT)** - `Programmable = 1`
   - Built on Token Metadata program
   - Adds rule sets for enforced royalties, transfer restrictions, staking locks, gating logic
   - Used by games, royalty-sensitive projects, utility NFTs
   - This is NOT legacy — it's an extension layer

3. **Metaplex Core (Digital Asset Standard)** - `Core = 2`
   - New Metaplex protocol, no SPL token mint required
   - Lower account count, lower rent (~0.008 SOL)
   - Designed to replace legacy NFTs long-term
   - Much cheaper, cleaner account model, better composability
   - Marketplace support still catching up

4. **Compressed NFT (cNFT)** - `Compressed = 3`
   - Stored in Merkle Trees, uses state compression
   - Off-chain proof verification
   - Extremely cheap (~0.005 SOL)
   - Millions of NFTs possible, dirt cheap minting
   - Limited programmability, harder UX, no native token ownership

5. **Semi-Fungible Token (SFT)** - `SemiFungible = 4`
   - TokenStandard::SemiFungible, supply > 1
   - NFT-style metadata with fungible supply
   - Used for game items, tickets, badges, packs
   - Basically NFT metadata + fungible supply

### ⚡ Solana Native Extensions (Not Metaplex)

6. **Token-2022 NFTs** - `Token2022 = 5`
   - NFTs built using `spl-token-2022` instead of legacy SPL Token
   - Features: Transfer hooks, confidential transfers, native royalties (in progress), metadata extensions
   - This is where Solana core devs are pushing long-term

7. **SPL Token Extensions Metadata** - `NativeMetadata = 6`
   - Native SPL token metadata, no Metaplex dependency
   - Stored directly in token account
   - Supports: Name, Symbol, URI, Custom fields
   - Used by people trying to move away from Metaplex monopoly

### 🧪 Ecosystem / Emerging / Non-Canonical

8. **Custom / Private Standards** - `Custom = 7`
   - Custom metadata programs, custom NFT logic, custom asset registries
   - Non-standard private implementations (WNS, spNFT, SPL-404, Nifty, etc.)
   - Think of it as the "escape hatch" for experimental standards

## Implementation Details

### Rust Implementation (`nexus-launchpad/src/lib.rs`)

#### Enum Definition
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum MetadataStandard {
    Legacy = 0,
    Programmable = 1,
    Core = 2,
    Compressed = 3,
    SemiFungible = 4,
    Token2022 = 5,
    NativeMetadata = 6,
    Custom = 7,
}
```

#### Helper Functions
- `from_u8(value: u8) -> Option<Self>` - Convert u8 to MetadataStandard with validation
- `name(&self) -> &'static str` - Get human-readable name
- `program_id(&self) -> Option<&'static str>` - Get program ID (if applicable)
- `requires_spl_token_mint(&self) -> bool` - Check if SPL Token mint is required
- `supports_enforced_royalties(&self) -> bool` - Check if enforced royalties are supported
- `estimated_cost_lamports(&self) -> u64` - Get estimated on-chain cost
- `is_marketplace_supported(&self) -> bool` - Check marketplace support

### TypeScript Implementation

#### Type Definition (`Frontend/types/index.ts`)
```typescript
export type MetadataStandard =
  | 'Legacy'           // 0
  | 'Programmable'     // 1
  | 'Core'             // 2
  | 'Compressed'       // 3
  | 'SemiFungible'     // 4
  | 'Token2022'        // 5
  | 'NativeMetadata'   // 6
  | 'Custom'           // 7
```

#### Utility Functions (`Frontend/lib/metadata-standards.ts`)
- `metadataStandardFromNumber(value: number)` - Convert number to MetadataStandard
- `metadataStandardToNumber(standard: MetadataStandard)` - Convert MetadataStandard to number
- `getMetadataStandardInfo(standard: MetadataStandard)` - Get detailed information
- `getAllMetadataStandards()` - Get all available standards
- `getMetadataStandardsByCategory()` - Get standards grouped by category
- `getRecommendedStandard(useCase)` - Get recommended standard based on use case
- `formatCostInSol(lamports: number)` - Format cost in SOL for display

## Migration Path

The ecosystem is currently migrating:
```
Legacy NFTs
   ↓
pNFTs
   ↓
Core Assets
   ↓
Token-2022 Native Assets
```

**You're literally coding during a transition era.**

## Cost Estimates

| Standard | Estimated Cost | Notes |
|----------|---------------|-------|
| Legacy | ~0.021 SOL | Universal support |
| Programmable | ~0.021 SOL + rule set | Enforced royalties |
| Core | ~0.008 SOL | Future-proof |
| Compressed | ~0.005 SOL | Dirt cheap |
| SemiFungible | ~0.021 SOL | Similar to Legacy |
| Token2022 | ~0.015 SOL | Variable |
| NativeMetadata | ~0.010 SOL | Variable |
| Custom | ~0.025 SOL | Unknown, assume higher |

## Which Standard to Use?

### Cheapest
👉 **Compressed NFT** - For mass minting (millions of NFTs)

### Most Future-Proof
👉 **Metaplex Core + Token-2022** - Where the ecosystem is heading

### Most Supported
👉 **Legacy + pNFT** - Universal marketplace support

### Most Flexible
👉 **Programmable NFT** - Rule sets, enforced royalties, transfer restrictions

## Testing

All standards are tested in `programs/tests/nexus-launchpad.ts`:
- Individual initialization tests for each standard
- Free collection test covering all standards
- Helper functions updated to support all standards

## Important Notes

⚠️ **Reality Check**: There is no single perfect NFT standard yet on Solana. The ecosystem is in transition.

✅ **Future-Proof**: This implementation supports all current and emerging standards, making it ready for the future.

🔧 **Extensible**: The `Custom` standard provides an escape hatch for experimental implementations.

## Files Modified

1. `programs/programs/nexus-launchpad/src/lib.rs` - Rust enum and helpers
2. `Frontend/types/index.ts` - TypeScript type definitions
3. `Frontend/lib/metadata-standards.ts` - TypeScript utility functions (new)
4. `programs/tests/nexus-launchpad.ts` - Test updates for all standards

## Usage Examples

### Rust
```rust
// Initialize collection with Core standard
let config = CollectionConfig {
    metadata_standard: MetadataStandard::Core,
    // ... other fields
};

// Check if standard requires SPL Token mint
if standard.requires_spl_token_mint() {
    // Create SPL Token mint
}

// Get estimated cost
let cost = standard.estimated_cost_lamports();
```

### TypeScript
```typescript
import { getMetadataStandardInfo, getRecommendedStandard } from '@/lib/metadata-standards'

// Get standard info
const info = getMetadataStandardInfo('Core')
console.log(info.name) // "Metaplex Core (DAS)"
console.log(info.estimatedCostLamports) // 8000000

// Get recommended standard
const standard = getRecommendedStandard({
  marketplaceSupport: true,
  enforcedRoyalties: true,
  cheapest: false
})
// Returns: 'Programmable'
```

## Next Steps

1. ✅ All standards implemented
2. ✅ Helper functions created
3. ✅ TypeScript utilities added
4. ✅ Tests updated
5. 🔄 Integration with minting logic (when implementing actual NFT minting)
6. 🔄 Marketplace compatibility checks (when integrating with marketplaces)

---

**Coded with care, dark humor, and probably too much coffee** ☕
**Because we're coding during a transition era, and we're ready for it** 🚀
