# Collection Creation Error 0x66 - Troubleshooting Guide

## The Problem

**Error:** `Transaction simulation failed: Error processing Instruction 2: custom program error: 0x66`

**When:** Happens during NFT collection creation when user clicks "Deploy" on Step 4 of the collection wizard

**What's happening:** The Frontend successfully builds a transaction to create an NFT collection on Solana. The transaction is submitted to the RPC endpoint for simulation. During simulation, some program in the transaction (either the Nexus Launchpad program or a CPI to another program) executes and explicitly returns error code 102 (0x66 in hex).

**Why it matters:** Collections cannot be created at all. The entire feature is broken on the current RPC endpoint.

---

## Root Cause Analysis

### What We Know (Verified)

✅ **Program ID mismatch identified:**
- Frontend was hardcoding: `CoREENxT6tW1HoK8ypYmtXvZApgjbpa9xcfc1mpRj9DA`
- Official MPL Core ID: `CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`
- These are different and the hardcoded one is incorrect

✅ **Hardcoded IDs are bad practice:**
- Different networks need different program IDs
- Makes the codebase fragile and error-prone
- Fixed by making it configurable

### What We Don't Know Yet (Hypothesis)

❓ **Does the wrong program ID cause error 0x66?**

When a program returns a custom error like 0x66, it means:
- A program actually executed (not an account lookup failure)
- That program called `err()` with error code 102
- This could be our Nexus Launchpad program OR a CPI to another program

We need simulation logs to confirm:
1. Which instruction is actually failing (Instruction 2 could be different things depending on transaction structure)
2. Which program returned the error
3. What the error message was

**Possible scenarios:**
- Our program rejects the transaction because MPL Core program ID doesn't exist in the accounts
- Our program rejects the transaction for a different reason (wrong account structure, missing signature, etc.)
- A CPI to MPL Core fails because the wrong program was passed
- The RPC's Nexus Launchpad program deployment is broken/incomplete

---

## What We've Done

### 1. Made the Program ID Configurable (Backend)

**File:** `Backend/src/solana/constants.ts`

```typescript
export const MPL_CORE_PROGRAM_ID =
  process.env.MPL_CORE_PROGRAM_ID || 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d';
```

**Why:** Instead of hardcoding the program ID, we read it from an environment variable. This allows different RPC networks (localnet, devnet, mainnet) to use different program IDs if needed. The default is the correct mainnet program ID.

### 2. Exposed Program ID via API (Backend)

**File:** `Backend/src/solana/solana.service.ts`, line 317

```typescript
getClientConfig() {
  return {
    // ... other fields
    mplCoreProgramId: MPL_CORE_PROGRAM_ID,
    // ...
  };
}
```

**Why:** The Backend now exposes the program ID via the `/api/solana/config` endpoint. This is served to the Frontend so it doesn't need to hardcode anything.

### 3. Updated Frontend to Use Dynamic Config (Frontend)

**File:** `Frontend/hooks/useCreateCollectionForm.ts`, lines 414-426

```typescript
// 2. Fetch program config from backend
const configRes = await fetch(`${API_BASE_URL}/api/solana/config`)
if (!configRes.ok) throw new Error('Could not fetch Solana config')
const configData = await configRes.json()
const mplCoreProgramId = configData.data?.mplCoreProgramId as string | undefined

if (!mplCoreProgramId) throw new Error('Backend did not return MPL Core program ID')

const mplCoreProgram = new PublicKey(mplCoreProgramId)
```

And used in the transaction at line 527:
```typescript
{ pubkey: mplCoreProgram, isSigner: false, isWritable: false },
```

**Why:** The Frontend now fetches the correct program ID from the Backend instead of hardcoding it. This is flexible and works across all networks.

### 4. Updated Backend .env File

**File:** `Backend/.env`

Added:
```
SOLANA_RPC_URL=https://rpc.nexus-web3.com
MPL_CORE_PROGRAM_ID=CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
```

**Why:** 
- Changed RPC from `93.115.17.115:8899` to the correct custom RPC
- Explicitly set the correct MPL Core program ID

---

## What We're Trying to Do

### Goal

Make NFT collection creation work on the custom RPC endpoint (rpc.nexus-web3.com) with the correct MPL Core program ID.

### The Flow

1. **User creates a collection** → Frontend collects all the data (name, images, mint price, etc.)
2. **User clicks Deploy** → Frontend runs `handleDeploy()`
   - Uploads PFP + banner to IPFS
   - **Fetches Backend config to get `mplCoreProgramId`** ← NEW STEP
   - Generates a mint keypair
   - Builds the create_collection transaction with the correct program ID
   - Signs with wallet
   - Submits to RPC
3. **RPC simulates transaction** → Validates the program ID is correct
4. **Transaction goes through** → Collection is created on-chain
5. **Frontend saves to database** → Collection is now live

### What Changed

**Before:**
```
Frontend hardcodes wrong program ID
    ↓
RPC rejects transaction (error 0x66)
    ↓
Collection creation fails
```

**After:**
```
Frontend fetches correct program ID from Backend
    ↓
Backend reads from environment variable
    ↓
RPC accepts transaction
    ↓
Collection creation succeeds
```

---

## What We're Testing

### Test Goal

Verify that the full collection creation flow works end-to-end:
1. Backend exposes the correct MPL Core program ID
2. Frontend fetches it successfully
3. Frontend uses it in the transaction
4. RPC accepts the transaction (no error 0x66)
5. Collection is created on-chain

### How to Test Locally

#### Prerequisites
- Backend running on localhost:8000
- Frontend running on localhost:3000
- PostgreSQL running (for Backend database)
- Connection to https://rpc.nexus-web3.com (for Solana RPC)

#### Test Steps

1. **Verify Backend is running:**
   ```bash
   curl http://localhost:8000/api/solana/config
   ```
   Should return:
   ```json
   {
     "data": {
       "network": "localnet",
       "rpcUrl": "https://rpc.nexus-web3.com",
       "mplCoreProgramId": "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
       "programId": "CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm",
       "platformWallet": "3AzX51N4sqmT46hgeQqhr9t1x2DsauWRcVvHUHqc78bt",
       "platformFeeBps": 100,
       "feeModel": "additive"
     }
   }
   ```

2. **Open Frontend dev console (F12):**
   - Go to Network tab
   - Go to Console tab

3. **Create a collection:**
   - Fill in Step 1 (name, symbol, description)
   - Upload images in Step 2
   - Set mint phases in Step 3
   - Click Deploy on Step 4

4. **Watch the logs:**
   - In Console, look for: `[Deploy] Backend config: { programId, platformWalletAddr, mplCoreProgramId }`
   - Should show: `mplCoreProgramId: "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"`

5. **Watch the Network tab:**
   - Should see a request to `/api/solana/config` that returns the config
   - Should see the wallet signature request (Phantom will pop up)

6. **Expected outcome:**
   - NO error 0x66
   - Transaction signature returned
   - Success page shown
   - Collection appears in database

### Test Cases to Verify

| Test Case | What to Check | Expected Result |
|-----------|---------------|-----------------|
| Backend config endpoint | Fetch /api/solana/config | Returns mplCoreProgramId correctly |
| Frontend fetches config | Console logs show mplCoreProgramId | Correct ID displayed in logs |
| Transaction builds | Check transaction structure | Uses correct program ID in accounts list |
| RPC accepts transaction | No error 0x66 | Transaction simulation succeeds |
| Collection is created | Check database or blockchain | Collection exists on-chain |

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| `Backend/src/solana/constants.ts` | Added MPL_CORE_PROGRAM_ID export | Make program ID configurable |
| `Backend/src/solana/solana.service.ts` | Added mplCoreProgramId to getClientConfig() | Expose to Frontend via API |
| `Frontend/hooks/useCreateCollectionForm.ts` | Fetch mplCoreProgramId from Backend config | Use correct program ID in transaction |
| `Backend/.env` | Added MPL_CORE_PROGRAM_ID and updated RPC URL | Configure correct values |

---

## Diagnostic Steps (To Verify the Root Cause)

### Step 1: Verify Backend Configuration is Correct

```bash
curl http://localhost:8000/api/solana/config
```

Expected response should include:
```json
{
  "data": {
    "mplCoreProgramId": "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
    "rpcUrl": "https://rpc.nexus-web3.com"
  }
}
```

**If this is wrong, the fix isn't working at all.**

### Step 2: Verify MPL Core Account Exists on RPC

```typescript
// In Frontend console or in a test script
import { Connection, PublicKey } from "@solana/web3.js"

const connection = new Connection("https://rpc.nexus-web3.com")
const mplCoreId = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d")
const account = await connection.getAccountInfo(mplCoreId)

console.log("MPL Core account info:", account)
```

**Expected:** An object with `executable: true` and owner pointing to BPF Loader
**If null:** The RPC doesn't have MPL Core deployed

### Step 3: Add Console Logging to Frontend (Capture Transaction Structure)

Add this to `Frontend/hooks/useCreateCollectionForm.ts` around line 530 (before sending):

```typescript
// Log all instructions and their programs
console.log('[Deploy] Transaction instructions:')
tx.instructions.forEach((ix, i) => {
  console.log(`  [IX ${i}] Program: ${ix.programId.toBase58()}`)
  console.log(`         Keys: ${ix.keys.length} accounts`)
})

// Specifically log the MPL Core program
console.log('[Deploy] Using MPL Core Program:', mplCoreProgram.toBase58())
```

**Expected output:**
```
[Deploy] Transaction instructions:
  [IX 0] Program: ComputeBudgetProgram111111111111111111111111
         Keys: 0 accounts
  [IX 1] Program: 11111111111111111111111111111111
         Keys: 2 accounts
  [IX 2] Program: CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm
         Keys: 9 accounts
[Deploy] Using MPL Core Program: CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
```

**This confirms Instruction 2 is your Nexus Launchpad program, so error 0x66 is coming from your program.**

### Step 4: Capture Simulation Logs (Most Important)

Add this to `Frontend/hooks/useCreateCollectionForm.ts` right before `sendTransaction()`:

```typescript
// Simulate transaction to get logs
console.log('[Deploy] Simulating transaction...')
try {
  const sim = await connection.simulateTransaction(tx, [mintKeypair])
  console.log('[Deploy] Simulation succeeded!')
  console.log('[Deploy] Simulation logs:')
  console.log(JSON.stringify(sim.value.logs, null, 2))
  console.log('[Deploy] Simulation error:', sim.value.err)
} catch (simError) {
  console.error('[Deploy] Simulation error:', simError)
  throw simError
}
```

**Expected output will look like:**
```
[Deploy] Simulation logs:
[
  "Program ComputeBudgetProgram111111111111111111111111 invoke [1]",
  "Program ComputeBudgetProgram111111111111111111111111 success",
  "Program 11111111111111111111111111111111 invoke [1]",
  "Program 11111111111111111111111111111111 success",
  "Program CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm invoke [1]",
  "Program log: Creating collection...",
  "Program log: Validating MPL Core program...",
  "Program returned error: custom program error: 0x66",
  ...
]
```

**This tells you:**
- Which program returned the error
- What it was doing when it failed
- Whether it's a Core/MPL-related error or something else

### Step 5: Check Backend Logs

When the Frontend fetches `/api/solana/config`:

```bash
# Terminal where Backend is running
pnpm start:dev

# You should see something like:
[Solana] SolanaService initialized on localnet
[Solana] RPC URL: https://rpc.nexus-web3.com
```

If the RPC URL is wrong, the Backend isn't using the updated .env file.

---

## Debugging Tips (If Error Still Occurs)

### Configuration Issues

1. **Backend not updated:**
   - Check `Backend/.env` has `MPL_CORE_PROGRAM_ID=CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`
   - Restart Backend: `pnpm start:dev`
   - Verify `/api/solana/config` returns correct ID

2. **Frontend not fetching config:**
   - Look for console log: `[Deploy] Backend config: { ... }`
   - If missing, the fetch is failing silently
   - Check Network tab for `/api/solana/config` request
   - Check if there's a CORS error

3. **Frontend using wrong ID:**
   - Add the console logging from Step 3 above
   - Verify `[Deploy] Using MPL Core Program:` shows the correct ID
   - If not, Frontend is still using hardcoded/old value

### Program Issues

1. **If simulation logs show error from Nexus Launchpad program (CzpjY2Bn...):**
   - The error is in YOUR program logic, not account lookup
   - Error 0x66 means your program explicitly returned that code
   - Check your program's Rust code for `error!(CustomError::*)`

2. **If MPL Core account doesn't exist on RPC:**
   - The RPC doesn't have the program deployed
   - Either deploy it or use a different RPC
   - Or verify the RPC endpoint is correct in Backend `.env`

3. **If simulation shows instruction not matching what you expect:**
   - Transaction structure is wrong
   - Wrong accounts being passed
   - Wrong discriminator or data encoding

---

## Confidence Assessment

| Aspect | Confidence | Notes |
|--------|-----------|-------|
| Configuration improvements are correct | 95% | Making program ID configurable and network-agnostic is universally good |
| Wrong hardcoded ID contributes to the problem | 85% | It's definitely wrong, likely causes issues, but need logs to confirm |
| This fix alone will solve error 0x66 | 60% | The wrong ID is a problem, but error 0x66 might have other causes |

**Before marking as "fixed," you MUST capture simulation logs to see which program returns error 0x66.**

---

## Investigation Roadmap

### Phase 1: Verify Configuration
1. ✅ Backend .env file updated
2. ⏳ Backend running with new config
3. ⏳ `/api/solana/config` returns correct mplCoreProgramId
4. ⏳ Frontend console logs show correct ID being fetched

### Phase 2: Verify Transaction Structure
5. ⏳ Console logs show all instructions and their program IDs
6. ⏳ Instruction 2 is the Nexus Launchpad program
7. ⏳ MPL Core program is correctly referenced in accounts list

### Phase 3: Identify Actual Error Source
8. ⏳ **Capture simulation logs (CRITICAL)**
9. ⏳ Identify which program returns error 0x66
10. ⏳ Identify the exact error message/context

### Phase 4: Fix the Real Issue
11. ⏳ If it's your program: debug the Rust code
12. ⏳ If it's MPL Core: verify the program exists/is correctly called
13. ⏳ If it's missing accounts: check account list against IDL

### Phase 5: Verify Fix Works
14. ⏳ Retry collection creation
15. ⏳ Collection created successfully
16. ⏳ Collection appears in database

---

## Next Steps

**Immediate:**
1. Run the diagnostic steps above (especially Step 4: capture simulation logs)
2. Share the simulation logs output
3. Identify which program is returning error 0x66

**After identifying the source:**
- If it's configuration-related: the current fix may resolve it
- If it's program logic-related: we need to debug the Rust program
- If it's missing infrastructure on RPC: we may need to update the RPC endpoint
