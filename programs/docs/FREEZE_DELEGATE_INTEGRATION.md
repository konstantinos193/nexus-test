# Metaplex Freeze Delegate Integration Guide

## Current Implementation Status

✅ **What's Working:**
- Freeze state tracking in `CollectionConfig` (freeze_trading_until_date, freeze_trading_until_sold_out)
- Freeze validation functions (`is_trading_frozen`, `should_freeze_nft`, `get_collection_freeze_state`)
- Transfer blocking logic in `transfer_nft()` function
- Automatic freeze state updates based on date/sold-out conditions

⚠️ **What Needs Integration:**
- Actual Metaplex Freeze Delegate plugin application during NFT minting
- CPI calls to Metaplex Core to add/update FreezeDelegate plugin

## How It Works

### 1. Freeze State Management
The collection tracks freeze settings:
- `freeze_trading_until_date: Option<i64>` - Freeze until specific timestamp
- `freeze_trading_until_sold_out: bool` - Freeze until all NFTs are minted

### 2. During NFT Minting
When minting an NFT, check if trading is frozen:
```rust
// In your minting process (nexus-collection or Metaplex):
let should_freeze = program.should_freeze_nft(...)?;

if should_freeze {
    // Apply Metaplex FreezeDelegate plugin with frozen=true
    // This ACTUALLY freezes the NFT at token level
}
```

### 3. Metaplex Freeze Delegate Integration

To complete the integration, you need to:

#### Step 1: Add mpl-core dependency
```toml
# In Cargo.toml
[dependencies]
mpl-core = { version = "0.11.1", features = ["anchor"] }
```

#### Step 2: Apply FreezeDelegate during mint
In your NFT minting code (wherever you create the NFT):
```rust
use mpl_core::instructions::AddPluginV1CpiBuilder;
use mpl_core::types::Plugin;
use mpl_core::types::FreezeDelegate;

// After creating the NFT asset:
if should_freeze {
    let freeze_plugin = Plugin::FreezeDelegate(FreezeDelegate { frozen: true });
    
    AddPluginV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
        .asset(&ctx.accounts.asset)
        .collection(Some(&ctx.accounts.collection))
        .plugin(freeze_plugin)
        .payer(&ctx.accounts.payer)
        .system_program(&ctx.accounts.system_program)
        .invoke()?;
}
```

#### Step 3: Thaw when trading unfreezes
When the freeze period ends (date passes or collection sells out):
```rust
use mpl_core::instructions::UpdatePluginV1CpiBuilder;

let freeze_plugin = Plugin::FreezeDelegate(FreezeDelegate { frozen: false });

UpdatePluginV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
    .asset(&ctx.accounts.asset)
    .plugin(freeze_plugin)
    .payer(&ctx.accounts.payer)
    .system_program(&ctx.accounts.system_program)
    .invoke()?;
```

## Current Functions Available

### `is_trading_frozen()`
Check if trading is currently frozen (read-only, anyone can call)

### `should_freeze_nft()`
Returns true if NFT should be frozen based on collection settings
Use this during mint to determine if FreezeDelegate should be applied

### `get_collection_freeze_state()`
Returns current freeze state for the entire collection
Use this for batch freeze/thaw operations

### `transfer_nft()`
Blocks transfers if trading is frozen (additional validation layer)

## Important Notes

1. **Metaplex Freeze Delegate blocks ALL transfers** - Once frozen via Metaplex, the NFT cannot be transferred through any standard Metaplex/SPL Token instruction until thawed.

2. **Freeze must be applied during mint or separately** - The launchpad program validates freeze state, but the actual freeze is applied via Metaplex Core CPI.

3. **Automatic thawing** - When freeze conditions are met (date passes or sold out), you can batch thaw all NFTs using `get_collection_freeze_state()` to check if thawing is needed.

4. **Integration point** - The freeze should be applied in:
   - `nexus-collection` program during NFT creation, OR
   - A separate freeze management program, OR
   - Frontend/backend service that calls Metaplex directly

## Next Steps

1. ✅ Freeze state tracking - DONE
2. ✅ Validation functions - DONE  
3. ⏳ Metaplex Core CPI integration - TODO (add to nexus-collection or separate service)
4. ⏳ Batch freeze/thaw functions - TODO (for existing collections)

## Example Workflow

```
1. Initialize collection with freeze_trading_until_sold_out: true
2. User mints NFT
3. During mint: Check should_freeze_nft() → returns true
4. Apply Metaplex FreezeDelegate with frozen=true → NFT is FROZEN
5. User tries to transfer → Metaplex blocks it (frozen=true)
6. Collection sells out (minted_count >= max_supply)
7. Check get_collection_freeze_state() → returns false (should thaw)
8. Batch thaw all NFTs → Update FreezeDelegate to frozen=false
9. User can now transfer → Metaplex allows it (frozen=false)
```
