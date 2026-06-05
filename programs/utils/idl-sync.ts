/**
 * IDL / Program Sync Utilities (Jan 2026)
 *
 * Keeps TypeScript tests and client code in sync with the Anchor program by
 * using the generated IDL as the single source of truth for instruction account
 * names. Anchor may emit account names in snake_case (Rust) or camelCase (JS)
 * depending on version; this helper reads the IDL so your code always uses
 * the same keys the program expects.
 *
 * Translation: the Rust program and the TypeScript tests have been in a naming
 * convention argument for years. This file is the peace treaty.
 * Neither side fully wins. But at least things compile.
 *
 * Usage:
 *   1. Run `anchor build` (or `yarn sync`) before tests so target/idl and
 *      target/types are fresh. (Old IDL = stale keys = mysterious account errors.
 *      "mysterious" meaning "completely explicable once you rebuild." Run the build.)
 *   2. Use getInstructionAccountNames(program, "mint") to get the exact
 *      account keys expected by validateAccounts, then build your accounts
 *      object with those keys.
 *   3. Optionally use buildMintAccounts(program, { ... }) to build the mint
 *      accounts object with IDL-correct keys. (The "I refuse to guess at case" option.)
 */

// Program from @coral-xyz/anchor — the Anchor client class that wraps the IDL
// and provides typed methods for calling the program.
// Without this, we're just sending raw bytes to the chain and praying.
// (That is also a valid strategy. This is not that strategy.)
import { Program } from "@coral-xyz/anchor";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/**
 * Minimal IDL type. We only care about the `instructions` array.
 * Each instruction has a name and an accounts list. That's all we need.
 * The rest of the IDL can fend for itself.
 */
type Idl = {
  instructions?: Array<{
    name: string;
    accounts?: Array<{ name: string } | { name: string; accounts?: Array<{ name: string }> }>;
  }>;
  [key: string]: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// ProgramLike: any Anchor Program<T>. We're generic because the specific IDL type
// is generated per-program and we don't want to hardcode it here.
// "any" is a compromise. We've made peace with it.
type ProgramLike = Program<any>;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Type guard for composite (nested) account groups in an IDL.
 * Some Anchor instructions use account groups (e.g., `#[derive(Accounts)]` nested structs).
 * These appear in the IDL as accounts with a nested `accounts` array.
 *
 * This guard lets us safely flatten them into a single list of top-level keys.
 * Because "accounts within accounts" sounds like inception, but it's just Anchor being thorough.
 *
 * @param acc - An account entry from the IDL
 * @returns true if this account group has nested accounts
 */
function isCompositeAccount(
  acc: { name: string; accounts?: Array<{ name: string }> }
): acc is { name: string; accounts: Array<{ name: string }> } {
  return Array.isArray((acc as any).accounts);
}

// ─── IDL INSPECTION ───────────────────────────────────────────────────────────

/**
 * Get the exact account names required for an instruction, in IDL order.
 * Flattens composite (nested) accounts so you get a single list of top-level
 * keys that must be present in .accountsStrict({ ... }).
 *
 * This is the "read the IDL so you don't have to guess" function.
 * Run `anchor build` first. The IDL is the truth. The IDL is always right.
 * (The IDL is right after `anchor build`. Before that, it might be lying about its age.)
 *
 * @param program - The Anchor program instance (must have .idl populated)
 * @param instructionName - The instruction name as it appears in the IDL (e.g., "mint")
 * @returns Array of account key strings in IDL order, flattened from any nested groups
 */
export function getInstructionAccountNames(
  program: ProgramLike,
  instructionName: string
): string[] {
  const idl = program.idl as Idl;

  // No instructions in the IDL? Unusual. Return empty and let the caller deal with it.
  // (If the IDL has no instructions, someone built the wrong thing.)
  if (!idl?.instructions) return [];

  // Find the instruction by name. Exact match — the IDL is case-sensitive.
  const ix = idl.instructions.find(
    (i) => i.name === instructionName
  );

  // Instruction not found in IDL. Either it doesn't exist, or `anchor build` is stale.
  // (It's the stale build. It's always the stale build.)
  if (!ix?.accounts) return [];

  const names: string[] = [];

  for (const acc of ix.accounts) {
    if (isCompositeAccount(acc)) {
      // Include the composite group's top-level name.
      // Anchor expects you to pass the group as an object under this key.
      names.push(acc.name);

      // Also include flattened nested names for reference.
      // Note: you pass these as nested keys inside the group object,
      // not as top-level keys. But it's useful to know what's inside.
      acc.accounts?.forEach((n) => names.push(`${acc.name}.${n.name}`));
    } else {
      // Standard account: just the name. Clean. Simple. How it should be.
      names.push(acc.name);
    }
  }

  return names;
}

// ─── CANONICAL PARAM MAP ──────────────────────────────────────────────────────

/**
 * Maps canonical TypeScript param names to possible IDL account keys.
 * Handles the Rust snake_case ↔ JS camelCase problem for mint instruction accounts.
 *
 * The program was written in Rust. Rust uses snake_case.
 * The client is TypeScript. TypeScript prefers camelCase.
 * This map is the handshake between two philosophies that will never fully agree.
 *
 * Extend this if you add new accounts to the mint instruction.
 * (Run `anchor build` after you extend the Rust struct, obviously.)
 */
const MINT_PARAM_TO_IDL_KEYS: Record<string, string[]> = {
  collection: ["collection"],                                    // No ambiguity here. Refreshing.
  buyer: ["buyer"],                                              // The wallet paying for an NFT. The hero of the story.
  creatorWallet: ["creator_wallet", "creatorWallet"],           // Gets the royalty. The other hero.
  platformWallet: ["platform_wallet", "platformWallet"],        // Gets the fee. Nexus's cut.
  walletTracker: ["wallet_tracker", "walletTracker"],           // The PDA that counts how many each buyer has minted.
  systemProgram: ["system_program", "systemProgram"],           // Solana's system program. Always present. Never appreciated.
};

// ─── ACCOUNT OBJECT BUILDER ───────────────────────────────────────────────────

/**
 * Build the accounts object for any instruction using IDL-correct key names.
 * Takes values with canonical TypeScript names, maps them to whatever case
 * the IDL expects (snake_case or camelCase), and returns the correctly-keyed object.
 *
 * The "I don't care about naming, I just want my transaction to work" function.
 *
 * This is a multi-pass algorithm:
 *   Pass 1: Map all provided values to IDL account names (6 matching strategies).
 *   Pass 2: For unmapped IDL accounts, try all strategies again bottom-up.
 *   Pass 3: Final required-account validation with one more exhaustive attempt.
 *   Pass 4: For mint instruction, extra safety net for known required accounts.
 *   Pass 5: Final validation — throw if anything is still missing. We tried.
 *
 * Yes, this is 5 passes over the same data. Yes, it's necessary.
 * Account key mismatches are the #1 source of "anchor transaction failed" grief.
 * We are not taking chances.
 *
 * @param program - The Anchor program instance
 * @param instructionName - The instruction name (e.g., "mint", "initialize")
 * @param values - Your account values, keyed by whatever name you feel like using
 * @returns An accounts object with IDL-exact key names, ready for .accountsStrict()
 */
export function buildAccountsFromIdl<T extends Record<string, unknown>>(
  program: ProgramLike,
  instructionName: string,
  values: T
): Record<string, unknown> {
  // Get the IDL account names for this instruction. These are the authoritative keys.
  const names = getInstructionAccountNames(program, instructionName);

  // Filter to only top-level accounts (not "group.nested" flattened names).
  // Anchor expects top-level keys; nested ones are just FYI from our flattening.
  const topLevel = names.filter((n) => !n.includes("."));

  const out: Record<string, unknown> = {};
  const isMint = instructionName === "mint";
  const paramToKeys = isMint ? MINT_PARAM_TO_IDL_KEYS : null;

  // ── Fallback: IDL parsing failed ─────────────────────────────────────────────
  // If the IDL gave us no account names, convert camelCase input to snake_case
  // and hope that matches what the program expects. (It usually does. Usually.)
  if (topLevel.length === 0) {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      // camelCase → snake_case. The Rust instinct.
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      normalized[snakeCaseKey] = value;
    }

    // For mint, double-check that all required accounts landed in the normalized object.
    // Try normalized matching for anything that didn't convert cleanly.
    if (isMint) {
      const requiredAccounts = ['collection', 'buyer', 'creator_wallet', 'platform_wallet', 'wallet_tracker', 'system_program'];
      for (const reqAcc of requiredAccounts) {
        if (!(reqAcc in normalized) || normalized[reqAcc] === undefined || normalized[reqAcc] === null) {
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

  // ── Pass 1: Map provided values to IDL keys ───────────────────────────────────
  // Six strategies, applied in priority order.
  // We stop as soon as we find a match for each input key.
  for (const [key, value] of Object.entries(values)) {
    // Skip null/undefined input values — can't map nothing to something.
    if (value === null || value === undefined) {
      continue;
    }

    // Strategy 1: Exact case-sensitive match. The happy path.
    if (topLevel.includes(key)) {
      out[key] = value;
      continue;
    }

    // Strategy 2: Case-insensitive exact match.
    // "Buyer" matches "buyer". "COLLECTION" matches "collection".
    const caseInsensitiveMatch = topLevel.find(idlKey => idlKey.toLowerCase() === key.toLowerCase());
    if (caseInsensitiveMatch) {
      out[caseInsensitiveMatch] = value;
      continue;
    }

    // Strategy 3: Canonical param name mapping (for mint instruction).
    // "creatorWallet" → look up MINT_PARAM_TO_IDL_KEYS["creatorWallet"] → try ["creator_wallet", "creatorWallet"]
    if (paramToKeys) {
      let mapped = false;
      for (const [param, keys] of Object.entries(paramToKeys)) {
        if (param === key && keys.length > 0) {
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

    // Strategy 4: camelCase → snake_case conversion.
    // "creatorWallet" → "creator_wallet" — the Rust naming convention strikes back.
    const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (topLevel.includes(snakeCaseKey)) {
      out[snakeCaseKey] = value;
      continue;
    }

    // Strategy 5: snake_case → camelCase conversion.
    // "creator_wallet" → "creatorWallet" — the JavaScript counterattack.
    const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (topLevel.includes(camelCaseKey)) {
      out[camelCaseKey] = value;
      continue;
    }

    // Strategy 6: Normalized matching (strip underscores, compare lowercase).
    // "creatorWallet" normalized → "creatorwallet"
    // "creator_wallet" normalized → "creatorwallet"
    // They match. We're done. This is why we have Strategy 6.
    const normalizedKey = key.toLowerCase().replace(/_/g, '');
    const matchingIdlKey = topLevel.find(idlKey => {
      const normalizedIdlKey = idlKey.toLowerCase().replace(/_/g, '');
      return normalizedKey === normalizedIdlKey;
    });

    if (matchingIdlKey) {
      out[matchingIdlKey] = value;
      continue;
    }

    // No match found for this input key. It won't appear in the output.
    // This is either fine (unknown extra key) or a problem (a required account was spelled wrong).
    // Pass 2 will clean this up from the IDL's perspective.
  }

  // ── Pass 2: Fill in any unmapped IDL accounts ─────────────────────────────────
  // For each IDL account that wasn't mapped in Pass 1, try all strategies again.
  // This ensures we don't miss accounts because the input key differed from the IDL key.
  for (const idlKey of topLevel) {
    // Already mapped in Pass 1. Skip.
    if (idlKey in out && out[idlKey] !== undefined && out[idlKey] !== null) {
      continue;
    }

    // Try all input keys against this IDL key using 4 strategies.
    for (const [inputKey, inputValue] of Object.entries(values)) {
      if (inputValue === null || inputValue === undefined) continue;

      // Strategy 1: Case-insensitive exact match.
      if (inputKey.toLowerCase() === idlKey.toLowerCase()) {
        out[idlKey] = inputValue;
        break;
      }

      // Strategy 2: Normalized match (no case, no underscores).
      const normalizedInput = inputKey.toLowerCase().replace(/_/g, '');
      const normalizedIdl = idlKey.toLowerCase().replace(/_/g, '');
      if (normalizedInput === normalizedIdl) {
        out[idlKey] = inputValue;
        break;
      }

      // Strategy 3: camelCase input as snake_case matches IDL snake_case key.
      const inputAsSnake = inputKey.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (inputAsSnake === idlKey) {
        out[idlKey] = inputValue;
        break;
      }

      // Strategy 4: snake_case input as camelCase matches IDL camelCase key.
      const inputAsCamel = inputKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (inputAsCamel === idlKey || inputAsCamel.toLowerCase() === idlKey.toLowerCase()) {
        out[idlKey] = inputValue;
        break;
      }
    }
  }

  // ── Pass 3: One more sweep for missing accounts ───────────────────────────────
  // Belt AND suspenders. If anything is still unmapped, try normalized matching
  // one final time using a fresh scan of all input values.
  for (const idlKey of topLevel) {
    if (!(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null) {
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

  // ── Pass 4: Critical mint accounts safety net ─────────────────────────────────
  // For the mint instruction, explicitly ensure each required account is present.
  // This is the last line of defense before we start throwing errors.
  // The blockchain doesn't accept "I thought I included it."
  if (isMint && topLevel.length > 0) {
    const requiredAccounts = ['collection', 'buyer', 'creator_wallet', 'platform_wallet', 'wallet_tracker', 'system_program'];
    for (const reqAcc of requiredAccounts) {
      if (topLevel.includes(reqAcc) && (!(reqAcc in out) || out[reqAcc] === undefined || out[reqAcc] === null)) {
        // Normalized match attempt.
        const normalizedReqAcc = reqAcc.toLowerCase().replace(/_/g, '');
        const matchingKey = Object.keys(values).find(k => {
          const normalizedKey = k.toLowerCase().replace(/_/g, '');
          return normalizedKey === normalizedReqAcc;
        });
        if (matchingKey && values[matchingKey] !== undefined && values[matchingKey] !== null) {
          out[reqAcc] = (values as any)[matchingKey];
        } else {
          // Last resort: case-insensitive or normalized direct lookup.
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

  // ── Pass 5: Comprehensive final validation ────────────────────────────────────
  // If any IDL-required account is still missing after all 4 passes above,
  // make one final desperate attempt before throwing.
  for (const idlKey of topLevel) {
    if (!(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null) {
      const normalizedIdlKey = idlKey.toLowerCase().replace(/_/g, '');

      // Try normalized match one last time.
      let matchingKey = Object.keys(values).find(k => {
        const normalizedKey = k.toLowerCase().replace(/_/g, '');
        return normalizedKey === normalizedIdlKey;
      });

      // Try direct case-insensitive match.
      if (!matchingKey) {
        matchingKey = Object.keys(values).find(k =>
          k.toLowerCase() === idlKey.toLowerCase()
        );
      }

      // Try camelCase version of the IDL key.
      if (!matchingKey) {
        const camelCaseIdlKey = idlKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        matchingKey = Object.keys(values).find(k =>
          k === camelCaseIdlKey || k.toLowerCase() === camelCaseIdlKey.toLowerCase()
        );
      }

      if (matchingKey && values[matchingKey] !== undefined && values[matchingKey] !== null) {
        out[idlKey] = (values as any)[matchingKey];
      } else {
        // We truly couldn't find this account. Throw with as much helpful context as possible.
        // The error message is long because debugging missing accounts is miserable.
        // We make it less miserable.
        if (instructionName === 'mint') {
          throw new Error(
            `buildAccountsFromIdl: Missing required account "${idlKey}" for mint instruction. ` +
            `Provided keys: ${Object.keys(values).join(', ')}. ` +
            `IDL expects: ${topLevel.join(', ')}. ` +
            `Current output keys: ${Object.keys(out).join(', ')}. ` +
            `Make sure all required accounts are provided in the params object.`
          );
        }
        // For non-mint instructions: warn instead of throw. More lenient for flexibility.
        console.warn(`WARNING: buildAccountsFromIdl could not map account "${idlKey}" for instruction "${instructionName}". ` +
          `Provided keys: ${Object.keys(values).join(', ')}. IDL expects: ${topLevel.join(', ')}`);
      }
    }
  }

  // ── Final mint safety net: collection can never be missing ───────────────────
  // An NFT mint instruction without a collection account is not a mint instruction.
  // This is non-negotiable. The program will reject it. The blockchain will reject it.
  // We reject it here first, with kindness.
  if (isMint && topLevel.includes('collection')) {
    if (!('collection' in out) || out.collection === undefined || out.collection === null) {
      // Exhaustive search for the collection account across all input keys.
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

  // ── Final missing account check ───────────────────────────────────────────────
  // Last validation pass. If anything is STILL missing after all the above,
  // try the known mint account mappings as absolute last resort.
  let missingAccounts = topLevel.filter(idlKey => !(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null);
  if (missingAccounts.length > 0) {
    if (isMint && missingAccounts.length > 0) {
      // Known mint account name variations. The most explicit possible fallback.
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

        // Try each known key variation.
        for (const possibleKey of possibleKeys) {
          if (possibleKey in values && values[possibleKey] !== undefined && values[possibleKey] !== null) {
            out[missingAcc] = (values as any)[possibleKey];
            break;
          }
        }

        // Still missing? Try normalized matching one absolute final time.
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

    // Final check after last-resort mapping.
    missingAccounts = topLevel.filter(idlKey => !(idlKey in out) || out[idlKey] === undefined || out[idlKey] === null);
    if (missingAccounts.length > 0) {
      if (isMint) {
        // Debug dump before throwing. Maximum context for minimum suffering.
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
      // Non-mint instructions get the standard error.
      throw new Error(
        `buildAccountsFromIdl: Missing required accounts for "${instructionName}": ${missingAccounts.join(', ')}. ` +
        `Provided: ${Object.keys(values).join(', ')}. ` +
        `Expected: ${topLevel.join(', ')}. ` +
        `Output: ${Object.keys(out).join(', ')}`
      );
    }
  }

  // All accounts mapped. All validations passed.
  // The object is ready for .accountsStrict(). Go mint some (fake) NFTs.
  return out;
}

// ─── ASSERTION HELPER ─────────────────────────────────────────────────────────

/**
 * Assert that all required accounts for an instruction are present in the
 * given accounts object. Use in tests to fail fast if the program and client
 * drift (e.g., after adding a new account to the Rust struct without updating
 * the TypeScript client).
 *
 * This is the "CI safety net" function. Wire it up in your tests.
 * It turns "mysterious account not provided error on-chain" into
 * "loud immediate test failure with a helpful message." Much better.
 *
 * @param program - The Anchor program instance
 * @param instructionName - The instruction name to validate against
 * @param accounts - The accounts object you're about to pass to Anchor
 */
export function assertAccountsForInstruction(
  program: ProgramLike,
  instructionName: string,
  accounts: Record<string, unknown>
): void {
  // Get the required top-level account names from the IDL.
  // (This is why you run `anchor build` before tests. Fresh IDL. Fresh keys. Fresh sanity.)
  const required = getInstructionAccountNames(program, instructionName).filter(
    (n) => !n.includes(".") // Top-level only. Not group.nested keys.
  );

  // Check for any required account that's null, undefined, or simply absent.
  const missing = required.filter((name) => accounts[name] === undefined || accounts[name] === null);

  if (missing.length > 0) {
    // Throw with the full picture: what's required, what's missing, how to fix it.
    // "Run 'anchor build'" is always step one. It's always been step one.
    throw new Error(
      `IDL sync: instruction "${instructionName}" requires accounts: ${required.join(", ")}. ` +
        `Missing: ${missing.join(", ")}. Run 'anchor build' and ensure .accountsStrict() uses these keys.`
    );
  }

  // All accounts present. The instruction will proceed to the blockchain.
  // May your transaction confirm on the first try.
  // (It probably won't. But we hope for you.)
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This file exists because Rust and TypeScript have a naming convention feud
// that has no end in sight. snake_case vs camelCase. An eternal war.
// We don't solve the war. We just build bridges across it.
//
// 5-pass account mapping. Normalized matching. Known fallback tables.
// If your accounts object still doesn't work after all this, the IDL is stale.
// Run `anchor build`. Run it again. Run it one more time.
// The IDL is the ground truth. Everything else is a guess.
//
// — Juan
//   "The IDL is the truth. The IDL is always right. Run anchor build."
//   nexus-launchpad, somewhere between snake_case and camelCase purgatory
// ─────────────────────────────────────────────────────────────────────────────
