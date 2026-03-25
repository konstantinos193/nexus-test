/**
 * IDL / Program Sync Utilities (Jan 2026)
 *
 * Keeps TypeScript tests and client code in sync with the Anchor program by
 * using the generated IDL as the single source of truth for instruction account
 * names. Anchor may emit account names in snake_case (Rust) or camelCase (JS)
 * depending on version; this helper reads the IDL so your code always uses
 * the same keys the program expects.
 *
 * Usage:
 *   1. Run `anchor build` (or `yarn sync`) before tests so target/idl and
 *      target/types are fresh.
 *   2. Use getInstructionAccountNames(program, "mint") to get the exact
 *      account keys expected by validateAccounts, then build your accounts
 *      object with those keys.
 *   3. Optionally use buildMintAccounts(program, { ... }) to build the mint
 *      accounts object with IDL-correct keys.
 */

import { Program } from "@coral-xyz/anchor";

type Idl = {
  instructions?: Array<{
    name: string;
    accounts?: Array<{ name: string } | { name: string; accounts?: Array<{ name: string }> }>;
  }>;
  [key: string]: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProgramLike = Program<any>;

function isCompositeAccount(
  acc: { name: string; accounts?: Array<{ name: string }> }
): acc is { name: string; accounts: Array<{ name: string }> } {
  return Array.isArray((acc as any).accounts);
}

/**
 * Returns the exact account names required for an instruction, in order.
 * Flattens composite (nested) accounts so you get a single list of top-level
 * keys that must be present in .accountsStrict({ ... }).
 */
export function getInstructionAccountNames(
  program: ProgramLike,
  instructionName: string
): string[] {
  const idl = program.idl as Idl;
  if (!idl?.instructions) return [];
  const ix = idl.instructions.find(
    (i) => i.name === instructionName
  );
  if (!ix?.accounts) return [];
  const names: string[] = [];
  for (const acc of ix.accounts) {
    if (isCompositeAccount(acc)) {
      names.push(acc.name);
      // flatten nested names for reference (Anchor expects the nested object under acc.name)
      acc.accounts?.forEach((n) => names.push(`${acc.name}.${n.name}`));
    } else {
      names.push(acc.name);
    }
  }
  return names;
}

/** Canonical param name -> possible IDL keys (Rust snake_case or JS camelCase). */
const MINT_PARAM_TO_IDL_KEYS: Record<string, string[]> = {
  collection: ["collection"],
  buyer: ["buyer"],
  creatorWallet: ["creator_wallet", "creatorWallet"],
  platformWallet: ["platform_wallet", "platformWallet"],
  walletTracker: ["wallet_tracker", "walletTracker"],
  systemProgram: ["system_program", "systemProgram"],
};

/**
 * Builds the accounts object for the mint instruction using the same keys
 * as the IDL. Pass in your values with canonical names (e.g. creatorWallet);
 * the helper maps them to whatever key the IDL expects (creator_wallet or
 * creatorWallet). Run `anchor build` before tests so the IDL is current.
 *
 * Example:
 *   const accounts = buildMintAccounts(program, {
 *     collection: collectionPda,
 *     buyer: buyer.publicKey,
 *     creatorWallet,
 *     platformWallet,
 *     walletTracker: walletTrackerPda,
 *     systemProgram: SystemProgram.programId,
 *   });
 *   await program.methods.mint(quantity).accountsStrict(accounts).rpc();
 */
export function buildAccountsFromIdl<T extends Record<string, unknown>>(
  program: ProgramLike,
  instructionName: string,
  values: T
): Record<string, unknown> {
  const names = getInstructionAccountNames(program, instructionName);
  const topLevel = names.filter((n) => !n.includes("."));
  const out: Record<string, unknown> = {};
  const isMint = instructionName === "mint";
  const paramToKeys = isMint ? MINT_PARAM_TO_IDL_KEYS : null;

  // If IDL parsing failed or returned empty, convert camelCase to snake_case
  // Anchor expects snake_case account names (matching Rust struct field names)
  if (topLevel.length === 0) {
    // IDL parsing failed - convert camelCase to snake_case and return
    // But first, ensure we have all required accounts for mint instruction
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      // Convert camelCase to snake_case (e.g., creatorWallet -> creator_wallet)
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      normalized[snakeCaseKey] = value;
    }
    // For mint instruction, ensure all required accounts are present
    if (isMint) {
      const requiredAccounts = ['collection', 'buyer', 'creator_wallet', 'platform_wallet', 'wallet_tracker', 'system_program'];
      for (const reqAcc of requiredAccounts) {
        if (!(reqAcc in normalized) || normalized[reqAcc] === undefined || normalized[reqAcc] === null) {
          // Try to find by normalized matching
          const normalizedReqAcc = reqAcc.toLowerCase().replace(/_/g, '');
          const matchingKey = Object.keys(values).find(k => {
            const normalizedKey = k.toLowerCase().replace(/_/g, '');
            return normalizedKey === normalizedReqAcc;
          });
          if (matchingKey && values[matchingKey] !== undefined && values[matchingKey] !== null) {
            normalized[reqAcc] = (values as any)[matchingKey];
          }
        }
      }
    }
    return normalized;
  }
  
  // CRITICAL: Map all values to IDL account names
  // This handles camelCase -> snake_case conversion and ensures all accounts are mapped
  // We use a two-pass approach: first map what we can, then ensure all required accounts are present
  
  // Pass 1: Map all provided values to IDL account names
  for (const [key, value] of Object.entries(values)) {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }
    
    // Priority 1: Exact match (case-sensitive) - highest priority
    if (topLevel.includes(key)) {
      out[key] = value;
      continue;
    }
    
    // Priority 2: Case-insensitive exact match
    const caseInsensitiveMatch = topLevel.find(idlKey => idlKey.toLowerCase() === key.toLowerCase());
    if (caseInsensitiveMatch) {
      out[caseInsensitiveMatch] = value;
      continue;
    }
    
    // Priority 3: Try mapping from canonical param names (for mint instruction)
    if (paramToKeys) {
      let mapped = false;
      for (const [param, keys] of Object.entries(paramToKeys)) {
        if (param === key && keys.length > 0) {
          // Use the first IDL key that matches
          const idlKey = keys.find(k => topLevel.includes(k)) || keys[0];
          if (topLevel.includes(idlKey)) {
            out[idlKey] = value;
            mapped = true;
            break;
          }
        }
      }
      if (mapped) continue;
    }
    
    // Priority 4: Try camelCase -> snake_case conversion (e.g., creatorWallet -> creator_wallet)
    const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (topLevel.includes(snakeCaseKey)) {
      out[snakeCaseKey] = value;
      continue;
    }
    
    // Priority 5: Try snake_case -> camelCase conversion (in case IDL uses camelCase)
    const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (topLevel.includes(camelCaseKey)) {
      out[camelCaseKey] = value;
      continue;
    }
    
    // Priority 6: Try normalized matching (case-insensitive, ignoring underscores)
    // This handles cases like "creatorWallet" matching "creator_wallet"
    const normalizedKey = key.toLowerCase().replace(/_/g, '');
    const matchingIdlKey = topLevel.find(idlKey => {
      const normalizedIdlKey = idlKey.toLowerCase().replace(/_/g, '');
      return normalizedKey === normalizedIdlKey;
    });
    
    if (matchingIdlKey) {
      out[matchingIdlKey] = value;
      continue;
    }
  }
  
  // Pass 2: For any missing IDL accounts, try to find them in the input values using all matching strategies
  // This ensures we don't miss any accounts due to naming mismatches
  for (const idlKey of topLevel) {
    if (idlKey in out && out[idlKey] !== undefined && out[idlKey] !== null) {
      continue; // Already mapped
    }
    
    // Try all possible matching strategies
    for (const [inputKey, inputValue] of Object.entries(values)) {
      if (inputValue === null || inputValue === undefined) continue;
      
      // Strategy 1: Exact match (case-insensitive)
      if (inputKey.toLowerCase() === idlKey.toLowerCase()) {
        out[idlKey] = inputValue;
        break;
      }
      
      // Strategy 2: Normalized match (ignore case and underscores)
      const normalizedInput = inputKey.toLowerCase().replace(/_/g, '');
      const normalizedIdl = idlKey.toLowerCase().replace(/_/g, '');
      if (normalizedInput === normalizedIdl) {
        out[idlKey] = inputValue;
        break;
      }
      
      // Strategy 3: camelCase conversion match
      const inputAsSnake = inputKey.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (inputAsSnake === idlKey) {
        out[idlKey] = inputValue;
        break;
      }
      
      // Strategy 4: snake_case conversion match
      const inputAsCamel = inputKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (inputAsCamel === idlKey || inputAsCamel.toLowerCase() === idlKey.toLowerCase()) {
        out[idlKey] = inputValue;
        break;
      }
    }
  }

  // Now ensure all required IDL accounts are present
  for (const idlKey of topLevel) {
    if (!(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null) {
      // Try to find a matching value by normalized key matching
      const normalizedIdlKey = idlKey.toLowerCase().replace(/_/g, '');
      const matchingValueKey = Object.keys(values).find(k => {
        const normalizedKey = k.toLowerCase().replace(/_/g, '');
        return normalizedKey === normalizedIdlKey;
      });
      
      if (matchingValueKey) {
        out[idlKey] = (values as any)[matchingValueKey];
      }
    }
  }
  
  // Final safety check: if any required account is still missing, 
  // ensure we have at least the basic accounts (for mint instruction)
  if (isMint && topLevel.length > 0) {
    const requiredAccounts = ['collection', 'buyer', 'creator_wallet', 'platform_wallet', 'wallet_tracker', 'system_program'];
    for (const reqAcc of requiredAccounts) {
      if (topLevel.includes(reqAcc) && (!(reqAcc in out) || out[reqAcc] === undefined || out[reqAcc] === null)) {
        // Try to find by normalized matching one more time
        const normalizedReqAcc = reqAcc.toLowerCase().replace(/_/g, '');
        const matchingKey = Object.keys(values).find(k => {
          const normalizedKey = k.toLowerCase().replace(/_/g, '');
          return normalizedKey === normalizedReqAcc;
        });
        if (matchingKey && values[matchingKey] !== undefined && values[matchingKey] !== null) {
          out[reqAcc] = (values as any)[matchingKey];
        } else {
          // Last resort: try direct key matching (case-insensitive)
          const directMatch = Object.keys(values).find(k => 
            k.toLowerCase() === reqAcc.toLowerCase() || 
            k.toLowerCase().replace(/_/g, '') === reqAcc.toLowerCase().replace(/_/g, '')
          );
          if (directMatch && values[directMatch] !== undefined && values[directMatch] !== null) {
            out[reqAcc] = (values as any)[directMatch];
          }
        }
      }
    }
  }
  
  // CRITICAL: Ensure all top-level IDL accounts are present - fail if any are missing
  // This prevents the "Account X not provided" error from Anchor
  for (const idlKey of topLevel) {
    if (!(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null) {
      // Last resort: try to find by any means possible
      const normalizedIdlKey = idlKey.toLowerCase().replace(/_/g, '');
      let matchingKey = Object.keys(values).find(k => {
        const normalizedKey = k.toLowerCase().replace(/_/g, '');
        return normalizedKey === normalizedIdlKey;
      });
      
      // Also try direct case-insensitive match
      if (!matchingKey) {
        matchingKey = Object.keys(values).find(k => 
          k.toLowerCase() === idlKey.toLowerCase()
        );
      }
      
      // Also try camelCase/snake_case conversion
      if (!matchingKey) {
        const camelCaseIdlKey = idlKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        matchingKey = Object.keys(values).find(k => 
          k === camelCaseIdlKey || k.toLowerCase() === camelCaseIdlKey.toLowerCase()
        );
      }
      
      if (matchingKey && values[matchingKey] !== undefined && values[matchingKey] !== null) {
        out[idlKey] = (values as any)[matchingKey];
      } else {
        // If we still can't find it, this is a critical error
        // For mint instruction, provide a helpful error message
        if (instructionName === 'mint') {
          throw new Error(
            `buildAccountsFromIdl: Missing required account "${idlKey}" for mint instruction. ` +
            `Provided keys: ${Object.keys(values).join(', ')}. ` +
            `IDL expects: ${topLevel.join(', ')}. ` +
            `Current output keys: ${Object.keys(out).join(', ')}. ` +
            `Make sure all required accounts are provided in the params object.`
          );
        }
        console.warn(`WARNING: buildAccountsFromIdl could not map account "${idlKey}" for instruction "${instructionName}". ` +
          `Provided keys: ${Object.keys(values).join(', ')}. IDL expects: ${topLevel.join(', ')}`);
      }
    }
  }
  
  // CRITICAL FINAL PASS: For mint instruction, ensure collection is ALWAYS included
  // This is a safety net to catch any edge cases where mapping failed
  if (isMint && topLevel.includes('collection')) {
    if (!('collection' in out) || out.collection === undefined || out.collection === null) {
      // Try to find collection in values using any possible key variation
      for (const [key, value] of Object.entries(values)) {
        if (value === null || value === undefined) continue;
        const normalizedKey = key.toLowerCase().replace(/_/g, '');
        if (normalizedKey === 'collection') {
          out.collection = value;
          break;
        }
      }
    }
  }
  
  // Final validation: ensure we have all required accounts
  let missingAccounts = topLevel.filter(idlKey => !(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null);
  if (missingAccounts.length > 0) {
    // Last attempt: for mint instruction, try direct mapping from known account names
    if (isMint && missingAccounts.length > 0) {
      const knownMappings: Record<string, string[]> = {
        'collection': ['collection', 'Collection'],
        'buyer': ['buyer', 'Buyer'],
        'creator_wallet': ['creator_wallet', 'creatorWallet', 'CreatorWallet'],
        'platform_wallet': ['platform_wallet', 'platformWallet', 'PlatformWallet'],
        'wallet_tracker': ['wallet_tracker', 'walletTracker', 'WalletTracker'],
        'system_program': ['system_program', 'systemProgram', 'SystemProgram'],
      };
      
      for (const missingAcc of missingAccounts) {
        const possibleKeys = knownMappings[missingAcc] || [missingAcc];
        for (const possibleKey of possibleKeys) {
          if (possibleKey in values && values[possibleKey] !== undefined && values[possibleKey] !== null) {
            out[missingAcc] = (values as any)[possibleKey];
            break;
          }
        }
        // Also try normalized matching one more time
        if (!(missingAcc in out) || out[missingAcc] === undefined || out[missingAcc] === null) {
          const normalizedMissing = missingAcc.toLowerCase().replace(/_/g, '');
          for (const [key, value] of Object.entries(values)) {
            if (value === null || value === undefined) continue;
            const normalizedKey = key.toLowerCase().replace(/_/g, '');
            if (normalizedMissing === normalizedKey) {
              out[missingAcc] = value;
              break;
            }
          }
        }
      }
    }
    
    // Check again after the last attempt
    missingAccounts = topLevel.filter(idlKey => !(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null);
    if (missingAccounts.length > 0) {
      // For mint instruction, this is critical - provide detailed error
      if (isMint) {
        console.error(`buildAccountsFromIdl DEBUG for mint:`);
        console.error(`  IDL expects: ${topLevel.join(', ')}`);
        console.error(`  Provided keys: ${Object.keys(values).join(', ')}`);
        console.error(`  Output keys: ${Object.keys(out).join(', ')}`);
        console.error(`  Missing: ${missingAccounts.join(', ')}`);
        throw new Error(
          `buildAccountsFromIdl: Missing required accounts for "${instructionName}": ${missingAccounts.join(', ')}. ` +
          `Provided: ${Object.keys(values).join(', ')}. ` +
          `Expected: ${topLevel.join(', ')}. ` +
          `Output: ${Object.keys(out).join(', ')}`
        );
      }
      throw new Error(
        `buildAccountsFromIdl: Missing required accounts for "${instructionName}": ${missingAccounts.join(', ')}. ` +
        `Provided: ${Object.keys(values).join(', ')}. ` +
        `Expected: ${topLevel.join(', ')}. ` +
        `Output: ${Object.keys(out).join(', ')}`
      );
    }
  }
  
  return out;
}

/**
 * Asserts that the required accounts for an instruction are present in the
 * given object. Use in tests to fail fast with a clear message if the program
 * and client drift (e.g. after adding an account to the Rust struct).
 */
export function assertAccountsForInstruction(
  program: ProgramLike,
  instructionName: string,
  accounts: Record<string, unknown>
): void {
  const required = getInstructionAccountNames(program, instructionName).filter(
    (n) => !n.includes(".")
  );
  const missing = required.filter((name) => accounts[name] === undefined || accounts[name] === null);
  if (missing.length > 0) {
    throw new Error(
      `IDL sync: instruction "${instructionName}" requires accounts: ${required.join(", ")}. ` +
        `Missing: ${missing.join(", ")}. Run 'anchor build' and ensure .accountsStrict() uses these keys.`
    );
  }
}
