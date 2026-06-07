# Nexus Launchpad Migration Guide

## Overview

This guide provides a comprehensive upgrade path from the current monolithic architecture to a full microservice architecture. The migration is designed to be incremental, allowing you to adopt new patterns at your own pace while maintaining system stability.

## Current Architecture Status

### ✅ Completed Enhancements

1. **Optimized Monolithic Design**
   - Compute unit optimizations in minting function
   - Early validation checks to fail fast
   - Optimized Merkle proof verification
   - Memory efficiency improvements

2. **Comprehensive Test Suite**
   - 25+ test files covering all scenarios
   - Edge case testing
   - Security testing
   - Performance testing

3. **Upgrade Safety Features**
   - Emergency pause/unpause controls
   - Time-delayed upgrade mechanism (24h-7d)
   - Two-step authority rotation
   - Upgrade state machine

4. **Enhanced Security Guards**
   - Global emergency pause
   - Quantity limits (max 10 per tx)
   - Upgrade state validation
   - Input validation improvements

5. **Hybrid Architecture - Allowlist Program**
   - Dedicated `nexus-allowlist` program
   - CPI-based verification
   - Independent security audits
   - Reusable across collections

6. **Advanced Payment Splitting**
   - Dedicated `nexus-payment` program
   - Multi-recipient distribution
   - Revenue analytics
   - Dynamic share allocation

7. **Metaplex Core Enhancements**
   - Plugin support (royalties, attributes, freeze)
   - Batch operations
   - Enhanced asset management
   - Rule set integration

## Migration Path Options

### Option 1: Stay Hybrid (Recommended for Most Projects)

**Current State**: You're already here
- Keep main launchpad program for core functionality
- Use specialized programs for complex operations
- Benefits: Reduced complexity, proven architecture

**Next Steps**:
1. Deploy allowlist and payment programs
2. Update frontend to use CPI calls
3. Migrate existing collections gradually

### Option 2: Full Microservice Migration (Advanced)

**Target Architecture**:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ nexus-core      │  │ nexus-allowlist │  │ nexus-payment   │
│                 │  │                 │  │                 │
│ - Collection    │  │ - Merkle proofs │  │ - Splits        │
│   management    │  │ - Whitelist     │  │ - Analytics     │
│ - Basic minting │  │ - Validation    │  │ - Escrow        │
│ - Metadata      │  │ - Updates       │  │ - Treasury      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ nexus-registry  │
                    │                 │
                    │ - Global state  │
                    │ - Authority     │
                    │ - Upgrades      │
                    └─────────────────┘
```

## Migration Timeline

### Phase 1: Preparation (Current - 1 month)
- [x] Optimize current monolithic design
- [x] Add comprehensive tests
- [x] Implement upgrade mechanisms
- [x] Add security guards
- [x] Create allowlist program
- [x] Create payment program
- [x] Enhance Metaplex Core integration
- [ ] Document migration strategy
- [ ] Prepare deployment scripts

### Phase 2: Hybrid Deployment (1-2 months)
- Deploy specialized programs alongside main program
- Update frontend to use new programs
- Test with new collections
- Monitor performance and security
- Gather user feedback

### Phase 3: Gradual Migration (2-4 months)
- Migrate existing collections to hybrid approach
- Update documentation
- Provide migration tools for users
- Phase out old functionality

### Phase 4: Full Microservice (Optional, 4-6 months)
- Extract core functionality to separate program
- Implement cross-program communication
- Full audit of new architecture
- Performance optimization

## Technical Implementation

### Step 1: Deploy New Programs

```bash
# Build all programs
anchor build

# Deploy allowlist program
anchor deploy --program-name nexus-allowlist

# Deploy payment program  
anchor deploy --program-name nexus-payment

# Update main program with new program IDs
anchor deploy --program-name nexus-launchpad
```

### Step 2: Update Configuration

**Anchor.toml**:
```toml
[programs.devnet]
nexus_launchpad = "YOUR_LAUNCHPAD_PROGRAM_ID"
nexus_allowlist = "YOUR_ALLOWLIST_PROGRAM_ID" 
nexus_payment = "YOUR_PAYMENT_PROGRAM_ID"
```

### Step 3: Frontend Integration

```typescript
// Before: Direct minting
await program.methods.mint(quantity, proof, leafIndex)
  .accounts({...})
  .rpc();

// After: Hybrid approach with CPI
await program.methods.mint(quantity, proof, leafIndex)
  .accounts({
    allowlistProgram: ALLOWLIST_PROGRAM_ID,
    allowlistAccount: allowlistPDA,
    paymentProgram: PAYMENT_PROGRAM_ID,
    paymentSplitter: paymentSplitterPDA,
    // ... other accounts
  })
  .remainingAccounts([
    // Payment recipients
    // Asset mints
  ])
  .rpc();
```

## Data Migration Strategies

### Strategy 1: Create-Only Migration
- New collections use hybrid architecture
- Existing collections remain on old system
- Gradual transition as collections launch

### Strategy 2: Full Migration
- Migrate all existing collections
- Requires data migration tools
- Potential downtime during migration

### Strategy 3: Parallel Operation
- Both systems run simultaneously
- Frontend detects collection type
- Uses appropriate program automatically

## Security Considerations

### During Migration
1. **Test thoroughly** on devnet first
2. **Gradual rollout** with limited collections
3. **Monitor for anomalies** in real-time
4. **Have rollback plan** ready
5. **Security audit** of new architecture

### Post-Migration
1. **Retire old programs** after verification
2. **Update documentation** and guides
3. **Community communication** about changes
4. **Ongoing monitoring** and optimization

## Rollback Plan

### If Migration Fails
1. **Pause new deployments** using emergency controls
2. **Revert frontend** to use old program IDs
3. **Analyze failure** and fix issues
4. **Retry migration** when ready

### Emergency Procedures
```bash
# Emergency pause all operations
anchor run emergency-pause-all

# Cancel pending upgrade
anchor run cancel-upgrade

# Resume operations
anchor run emergency-unpause-all
```

## Performance Metrics

### Before Migration
- Compute units per mint: ~150,000 CU
- Program size: ~12KB
- Single program deployment

### After Hybrid Migration
- Compute units per mint: ~120,000 CU (optimized)
- Program sizes: 8KB + 4KB + 6KB = 18KB total
- Multiple program deployments
- Better modularity and security

### After Full Microservice
- Compute units per mint: ~100,000 CU
- Program sizes: 6KB × 4 = 24KB total
- Maximum modularity
- Independent upgrades

## Cost Analysis

### Development Costs
- **Hybrid**: Low (minimal changes)
- **Full Migration**: High (significant refactoring)

### Deployment Costs
- **Hybrid**: Medium (3 programs vs 1)
- **Full Migration**: High (4+ programs)

### Maintenance Costs
- **Hybrid**: Medium (multiple programs)
- **Full Migration**: Low (independent programs)

## Decision Matrix

| Factor | Stay Monolithic | Hybrid | Full Microservice |
|--------|------------------|---------|-------------------|
| Complexity | Low | Medium | High |
| Security | Good | Better | Best |
| Performance | Good | Better | Best |
| Upgrade Flexibility | Limited | Good | Excellent |
| Development Cost | Low | Medium | High |
| Maintenance Cost | Low | Medium | Medium |

## Recommendation

**For most projects**: Stay with the **Hybrid Architecture** you've already built. It provides the best balance of:

- ✅ **Security improvements** (separate programs)
- ✅ **Performance optimizations** (CPI efficiency)
- ✅ **Manageable complexity** (still mostly single program)
- ✅ **Upgrade flexibility** (independent program updates)
- ✅ **Reasonable costs** (3 programs vs 4+)

**For large-scale projects**: Consider **Full Microservice** if you need:
- Maximum security isolation
- Independent upgrade schedules
- Specialized teams per program
- Extreme performance requirements

## Next Steps

1. **Deploy hybrid programs** to devnet for testing
2. **Update frontend** to use new program IDs
3. **Test thoroughly** with sample collections
4. **Monitor performance** and security
5. **Make decision** on full microservice migration based on results

---

*This migration guide is designed to be flexible. Choose the path that best fits your project's needs, timeline, and resources.*
