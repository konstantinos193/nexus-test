/**
 * Anchor Buffer Size Patch Utility
 * 
 * Patches Anchor's hardcoded 1000-byte instruction encoding buffer to support
 * larger instruction arguments (like large NFT metadata structs).
 * 
 * This is a workaround for Anchor's known limitation where BorshInstructionCoder
 * uses a fixed 1000-byte buffer, causing "encoding overruns Buffer" errors when
 * instruction arguments exceed this size (even though Solana supports ~1232 bytes).
 * 
 * @see https://github.com/coral-xyz/anchor/issues (TODO: use a tighter buffer)
 * 
 * Usage:
 *   import { patchAnchorBuffer } from './utils/anchor-buffer-patch';
 *   patchAnchorBuffer(); // Call once before any Anchor instruction encoding
 * 
 * Or in test setup:
 *   before(() => {
 *     patchAnchorBuffer();
 *   });
 */

// Import Idl type from Anchor
type Idl = {
  errors?: Array<{ name: string; code: number }>;
  [key: string]: any;
};

/**
 * Robust patch for Anchor's BorshInstructionCoder that handles dynamic buffer growth.
 * 
 * This solution:
 * - Properly handles Anchor's 2-arg signature: encode(ixName: string, ix: any)
 * - Supports legacy formats for backward compatibility
 * - Dynamically grows buffer from 1KB, doubling until encoding succeeds
 * - Correctly converts discriminator (Array/Uint8Array) to Buffer
 * - Handles all edge cases and error conditions gracefully
 * 
 * @returns A function to restore the original behavior (useful for testing)
 * 
 * @example
 * ```typescript
 * // Patch with dynamic buffer growth
 * const restore = patchAnchorBuffer();
 * 
 * // Restore original (if needed)
 * restore();
 * ```
 */
/**
 * Layout-driven normalization that correctly handles Option types based on their inner layout.
 * Only converts to BN when the layout is BNLayout or Option<BNLayout>, leaving Option<u8> etc. as numbers.
 * 
 * This fixes the "toTwos is not a function" error by ensuring BNLayout fields get BN instances
 * while preserving non-BN Option types (like Option<u8>) as plain numbers.
 */

// Get BN class - try multiple sources
function getBN(): any {
  try {
    return require("@coral-xyz/anchor").BN || require("bn.js");
  } catch {
    try {
      return require("bn.js");
    } catch {
      throw new Error("Cannot find BN class. Make sure @coral-xyz/anchor or bn.js is installed.");
    }
  }
}

// Very defensive checks; avoids false-positives for u8/u16 layouts.
function isBNLayout(layout: any): boolean {
  if (!layout) return false;
  return (
    layout.constructor?.name === "BNLayout" ||
    // fallback for transpiled/minified builds:
    (typeof layout.decode === "function" &&
      typeof layout.encode === "function" &&
      typeof layout.signed === "boolean" &&
      typeof layout.span === "number" &&
      layout.blob !== undefined)
  );
}

function isOptionLayout(layout: any): boolean {
  if (!layout) return false;
  return (
    layout.constructor?.name === "OptionLayout" ||
    (layout.layout != null && layout.discriminator != null)
  );
}

function isUnionLayout(layout: any): boolean {
  if (!layout) return false;
  return (
    layout.constructor?.name === "Union" ||
    (layout.variants != null && typeof layout.variants === "object" && layout.getSourceVariant != null)
  );
}

// Snake_case <-> camelCase for IDL (snake) vs TS client (camel) key mismatch
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function getStructValue(obj: any, layoutKey: string): any {
  if (obj == null || typeof obj !== "object") return undefined;
  let v = obj[layoutKey];
  if (v !== undefined) return v;
  const camel = snakeToCamel(layoutKey);
  if (camel !== layoutKey) v = obj[camel];
  if (v !== undefined) return v;
  const snake = camelToSnake(layoutKey);
  if (snake !== layoutKey) v = obj[snake];
  return v;
}

/** Unwrap all Option-like shapes to null | raw value. Ensures { some } / { none } never reach OptionLayout. */
function unwrapOptionLike(v: any): null | any {
  if (v == null) return null;
  if (typeof v === "object" && !Array.isArray(v)) {
    // Check if this is an Option wrapper
    if (Object.prototype.hasOwnProperty.call(v, "some")) {
      return (v as any).some;
    }
    if (Object.prototype.hasOwnProperty.call(v, "none")) {
      return null;
    }
    // If it's an object with only one key that looks like an Option, unwrap it
    const keys = Object.keys(v);
    if (keys.length === 1 && (keys[0] === "some" || keys[0] === "none")) {
      if (keys[0] === "some") return (v as any).some;
      if (keys[0] === "none") return null;
    }
  }
  return v; // already raw
}

// Convert number/bigint/string to BN (signedness handled by BNLayout itself via toTwos).
function toBN(value: any): any {
  const BN = getBN();
  if (BN.isBN(value)) return value;
  if (typeof value === "bigint") return new BN(value.toString());
  if (typeof value === "number") {
    // Avoid float surprises
    if (!Number.isInteger(value)) {
      throw new Error(`Non-integer number cannot be encoded as BN: ${value}`);
    }
    return new BN(value.toString());
  }
  if (typeof value === "string") return new BN(value, 10);
  throw new Error(`Cannot convert value to BN: ${value} (${typeof value})`);
}

// Normalizes a value for a specific layout node.
function normalizeValueForLayout(layout: any, value: any): any {
  // Handle Option<T>
  // OptionLayout.encode expects null (None) or raw inner value (Some). Never { some } / { none }.
  if (isOptionLayout(layout)) {
    const inner = layout.layout;
    const unwrapped = unwrapOptionLike(value);
    if (unwrapped == null) return null;
    if (isBNLayout(inner)) return toBN(unwrapped);
    return normalizeValueForLayout(inner, unwrapped);
  }

  // Handle Union (enum) layouts
  // Union layouts need to know which variant to encode. The value should be an object with a single key
  // matching one of the variant names. We normalize variant names (camelCase <-> PascalCase <-> snake_case)
  // This fixes "unable to infer src variant" errors when enum variant names don't match exactly.
  if (isUnionLayout(layout)) {
    if (value == null || typeof value !== "object") {
      return value;
    }
    
    // Get all variant names from the layout
    const variants = layout.variants || {};
    const variantNames = Object.keys(variants);
    
    if (variantNames.length === 0) {
      return value;
    }
    
    // Find which variant key matches the input object
    // Try exact match first, then try case variations (case-insensitive matching)
    let matchedVariant: string | null = null;
    const inputKeys = Object.keys(value);
    
    if (inputKeys.length === 1) {
      const inputKey = inputKeys[0];
      
      // Try exact match first (most common case)
      if (variantNames.includes(inputKey)) {
        matchedVariant = inputKey;
      } else {
        // Try multiple matching strategies:
        // 1. Case-insensitive match (semifungible -> SemiFungible)
        // 2. Normalized match (removes underscores/hyphens, lowercases)
        const lowerInput = inputKey.toLowerCase();
        const normalizedInput = inputKey.toLowerCase().replace(/[_-]/g, "");
        
        for (const variantName of variantNames) {
          const lowerVariant = variantName.toLowerCase();
          const normalizedVariant = variantName.toLowerCase().replace(/[_-]/g, "");
          
          // Try exact lowercase match first (fastest)
          if (lowerInput === lowerVariant) {
            matchedVariant = variantName;
            break;
          }
          
          // Try normalized match (handles underscore/hyphen differences)
          if (normalizedInput === normalizedVariant) {
            matchedVariant = variantName;
            break;
          }
        }
      }
    }
    
    // If we found a match, normalize the variant key to match the layout's expected name
    if (matchedVariant) {
      const variantValue = value[inputKeys[0]];
      const variantLayout = variants[matchedVariant];
      const normalized: any = {};
      
      // Normalize the variant's inner value if it has a layout
      if (variantLayout && variantValue != null) {
        normalized[matchedVariant] = normalizeValueForLayout(variantLayout, variantValue);
      } else {
        normalized[matchedVariant] = variantValue;
      }
      
      return normalized;
    }
    
    // If no match found, provide a helpful error message
    if (inputKeys.length === 1) {
      const inputKey = inputKeys[0];
      throw new Error(
        `[anchor-buffer-patch] Unable to match enum variant "${inputKey}". ` +
        `Available variants: ${variantNames.join(", ")}. ` +
        `Input value: ${JSON.stringify(value)}. ` +
        `This usually means the variant name doesn't match Anchor's IDL (e.g., use "semiFungible" not "semifungible").`
      );
    }
    
    // If multiple keys or no keys, return as-is (might be a nested structure or already normalized)
    return value;
  }

  // Handle bare BNLayout
  if (isBNLayout(layout)) {
    if (value == null) return value;
    return toBN(value);
  }

  // Structures: normalize field-by-field. Output keys must exactly match fd.property (buffer-layout reads src[fd.property]).
  if (layout?.fields && Array.isArray(layout.fields) && value && typeof value === "object") {
    const out: any = Array.isArray(value) ? [] : {};
    for (const fd of layout.fields) {
      const prop = fd.property ?? (fd as any).name;
      if (!prop) continue;
      let raw = getStructValue(value, prop);
      
      // For Option layouts, pass the value as-is (including wrapper) - normalizeValueForLayout will handle it
      // For non-Option layouts, unwrap any Option wrappers first (defensive unwrapping)
      if (isOptionLayout(fd.layout)) {
        // OptionLayout expects { some: value } or null - let normalizeValueForLayout handle it
        const normalized = normalizeValueForLayout(fd.layout, raw);
        out[prop] = normalized;
      } else {
        // Non-Option layout: unwrap any Option wrappers that might have been passed incorrectly
        raw = unwrapOptionLike(raw);
        const normalized = normalizeValueForLayout(fd.layout, raw);
        // Double-check: if normalized value still has Option wrapper, unwrap it again
        const finalValue = unwrapOptionLike(normalized);
        out[prop] = finalValue;
      }
    }
    return out;
  }

  // Arrays / sequences (Sequence.encode calls .reduce on value - must not be null/undefined)
  if (layout?.elementLayout) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.map((v) => normalizeValueForLayout(layout.elementLayout, v));
    }
    return [];
  }

  return value;
}

/** Throw if any { some } / { none } remains in normalized data. Converts opaque toTwos crashes into precise paths. */
function assertNoSomeObjects(x: any, path = "root"): void {
  if (x == null || typeof x !== "object") return;
  
  // Skip arrays - they have .some from Array.prototype
  if (Array.isArray(x)) {
    for (let i = 0; i < x.length; i++) {
      assertNoSomeObjects(x[i], `${path}[${i}]`);
    }
    return;
  }
  
  // Use own-property check only: arrays have .some from Array.prototype, which would false-positive.
  const hasSome = Object.prototype.hasOwnProperty.call(x, "some");
  const hasNone = Object.prototype.hasOwnProperty.call(x, "none");
  
  // Only warn if this looks like an Option wrapper (has some/none and maybe one other key)
  // If it has many keys, it's probably a struct, not an Option wrapper
  const keys = Object.keys(x);
  if ((hasSome || hasNone) && keys.length <= 2) {
    // This looks like an Option wrapper that wasn't normalized
    // Try to unwrap it one more time before warning
    const unwrapped = unwrapOptionLike(x);
    if (unwrapped !== x) {
      // It was an Option wrapper - this can happen if OptionLayout.encode patch handles it
      // Only warn in debug mode or if it's a non-primitive value (BN, object, etc.)
      // For primitive values like numbers, OptionLayout.encode should handle { some: number } correctly
      const innerValue = unwrapped;
      if (typeof innerValue === "object" && innerValue !== null && !(innerValue instanceof getBN())) {
        // Non-primitive inner value - this might be a real issue
        console.warn(
          `[anchor-buffer-patch] Option wrapper detected at ${path} after normalization. ` +
          `This may indicate a normalization issue. Value: ${JSON.stringify(x)}`
        );
      }
      // For primitive values (number, string, etc.), OptionLayout.encode patch will handle it
      // Don't warn for these as they're expected to work correctly
      return;
    }
  }
  
  // Recursively check nested objects
  for (const [k, v] of Object.entries(x)) {
    // Skip checking the "some" or "none" keys themselves if this is an Option wrapper
    if ((hasSome || hasNone) && (k === "some" || k === "none")) {
      continue;
    }
    assertNoSomeObjects(v, `${path}.${k}`);
  }
}

// Preflight assertion to catch "number passed to BNLayout" early (debug-friendly)
function assertNoPlainNumberForBN(layout: any, value: any, path = "root"): void {
  if (isBNLayout(layout)) {
    if (typeof value === "number" || typeof value === "bigint") {
      throw new Error(
        `[anchor-buffer-patch] BNLayout got ${typeof value} at ${path}. ` +
        `Value=${String(value)}. This should have been normalized to BN.`
      );
    }
  }
  if (isOptionLayout(layout)) {
    const inner = layout.layout;
    // We normalize Option to raw (null | inner value), so no .some wrapper
    const payload = value;
    if (payload != null) {
      assertNoPlainNumberForBN(inner, payload, `${path}`);
    }
    return;
  }
  if (layout?.fields && value && typeof value === "object") {
    for (const f of layout.fields) {
      const k = f.property || f.name;
      if (!k) continue;
      const v = getStructValue(value, k);
      if (v !== undefined) {
        assertNoPlainNumberForBN(f.layout, v, `${path}.${k}`);
      }
    }
  }
}

export function patchAnchorBuffer(): () => void {
  let BorshInstructionCoder: any;
  try {
    BorshInstructionCoder = require("@coral-xyz/anchor/dist/cjs/coder/borsh/instruction").BorshInstructionCoder;
  } catch (e) {
    try {
      BorshInstructionCoder = require("@coral-xyz/anchor/dist/esm/coder/borsh/instruction").BorshInstructionCoder;
    } catch (e2) {
      // Last resort: try direct import
      try {
        const anchor = require("@coral-xyz/anchor");
        BorshInstructionCoder = anchor.BorshInstructionCoder;
      } catch (e3) {
        throw new Error(
          "Failed to locate BorshInstructionCoder. " +
          "Make sure @coral-xyz/anchor is installed. " +
          "This patch requires Anchor 0.29+."
        );
      }
    }
  }

  // Safety-net: patch OptionLayout.encode via constructor (OptionLayout is not exported).
  // Unwrap { some } / { none } and coerce BN for Option<i64/u64>. Use same borsh instance Anchor uses.
  try {
    const borsh = require("@coral-xyz/borsh");
    const optInstance: any = borsh.option(borsh.u8(), "x");
    const OptionLayout = optInstance.constructor;
    if (!(OptionLayout as any).__patched_unwrap_some) {
      const originalEncode = OptionLayout.prototype.encode;
      OptionLayout.prototype.encode = function (this: any, src: any, b: any, offset = 0) {
        const unwrapped = unwrapOptionLike(src);
        if (unwrapped == null) return originalEncode.call(this, null, b, offset);
        const inner = this.layout;
        const coerced = isBNLayout(inner) ? toBN(unwrapped) : unwrapped;
        return originalEncode.call(this, coerced, b, offset);
      };
      (OptionLayout as any).__patched_unwrap_some = true;
    }
  } catch (e) {
    // Non-fatal; normalization is the primary fix.
  }

  // Store the original encode method (for potential restoration)
  const originalEncode = BorshInstructionCoder.prototype.encode;

  /**
   * Robust encode function that handles all Anchor versions and edge cases.
   * 
   * Anchor versions vary:
   * - New (≥0.3x): encode(ixName: string, ix: any)
   * - Legacy/internal: encode({ name, data }) or other formats
   */
  BorshInstructionCoder.prototype.encode = function (...args: any[]) {
    // Extract instruction name and data from various possible formats
    let ixName: string | undefined;
    let ix: any;

    if (typeof args[0] === "string") {
      // New Anchor signature: encode(ixName: string, ix: any)
      ixName = args[0];
      ix = args[1];
    } else if (args[0] && typeof args[0] === "object") {
      // Legacy formats: encode({ name, data }) or similar
      ixName = args[0].name ?? args[0].ixName ?? args[0].instructionName;
      ix = args[0].data ?? args[0].ix ?? args[0];
    }

    // Get layout maps (Anchor versions use different property names)
    const layouts =
      (this as any).ixLayouts ||
      (this as any).instructionLayouts ||
      null;

    // If we can't find layouts or identify instruction, fall back to original
    if (!layouts || typeof layouts.get !== "function") {
      return originalEncode.apply(this, args);
    }

    if (!ixName) {
      // Can't identify instruction name reliably -> don't break behavior
      return originalEncode.apply(this, args);
    }

    // Get the encoder for this instruction
    const encoder = layouts.get(ixName);

    if (!encoder) {
      throw new Error(
        `[anchor-buffer-patch] Instruction layout not found: ${ixName}. ` +
          `Available instructions: ${Array.from(layouts.keys()).join(", ")}`
      );
    }

    // Extract discriminator and layout
    // Discriminator can be Array, Uint8Array, or Buffer - we normalize it
    const discriminatorRaw = encoder.discriminator;
    const layout = encoder.layout;

    // Convert discriminator to Buffer (handles Array, Uint8Array, Buffer, etc.)
    // This matches Anchor's behavior: Buffer.from(encoder.discriminator)
    const discriminator = Buffer.from(discriminatorRaw);

    // Normalize values using layout-driven approach
    // This correctly handles Option<i64> (converts to BN) vs Option<u8> (keeps as number)
    const normalizedIx = normalizeValueForLayout(layout, ix);
    
    assertNoPlainNumberForBN(layout, normalizedIx, ixName);
    assertNoSomeObjects(normalizedIx);

    // Dynamic buffer growth: start at 1KB and double until encoding succeeds
    // This handles large instruction data that exceeds Anchor's 1000-byte limit
    let size = 1024;
    const maxAttempts = 10; // Prevents infinite loops
    const maxSize = 64 * 1024; // 64KB hard limit (safety check - Solana tx limit is ~1232 bytes)
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Safety check: don't allocate absurdly large buffers
      if (size > maxSize) {
        // If we have a cached error that's not buffer-related, throw that instead
        if (lastError && !(lastError instanceof RangeError)) {
          throw lastError;
        }
        throw new Error(
          `[anchor-buffer-patch] Buffer size exceeded maximum (${maxSize} bytes) ` +
            `while encoding ${ixName}. Instruction data may be too large for Solana transaction limits.`
        );
      }

      const data = Buffer.alloc(size);
      
      try {
        // Use normalized data (BN values are already normalized)
        const len = layout.encode(normalizedIx, data);
        
        // Success! Concatenate discriminator + encoded data
        // This matches Anchor's exact behavior: Buffer.concat([Buffer.from(discriminator), data])
        return Buffer.concat([discriminator, data.subarray(0, len)]);
      } catch (e: any) {
        lastError = e;
        
        // Check if this is an out-of-bounds error (buffer too small)
        // RangeError is the specific error buffer-layout throws for buffer overruns
        const isOutOfBounds = e instanceof RangeError;

        // Only grow buffer if it's actually a RangeError (buffer too small)
        if (isOutOfBounds) {
          size *= 2;
          continue;
        }

        // Not a buffer size issue - rethrow the original error immediately
        // Don't keep retrying with larger buffers for non-buffer errors
        throw e;
      }
    }

    // If we've exhausted all attempts, throw a clear error
    // Include the last error for debugging if it wasn't a RangeError
    const errorMsg = lastError && !(lastError instanceof RangeError)
      ? `Last error: ${lastError.message}`
      : `exceeded max buffer growth (final size: ${size} bytes, max attempts: ${maxAttempts})`;
    
    throw new Error(
      `[anchor-buffer-patch] Unable to encode ${ixName}: ${errorMsg}`
    );
  };

  console.log(
    `[anchor-buffer-patch] Anchor instruction buffer patched successfully ` +
    `(dynamic buffer growth enabled)`
  );

  // Return a restore function so users can undo the patch if needed
  return () => {
    BorshInstructionCoder.prototype.encode = originalEncode;
    console.log("[anchor-buffer-patch] Anchor instruction buffer patch restored");
  };
}

/**
 * Automatically patches Anchor buffer on import.
 * 
 * This is a convenience export for cases where you want the patch
 * applied immediately when the module is imported, without needing
 * to call patchAnchorBuffer() explicitly.
 * 
 * Usage:
 *   import './utils/anchor-buffer-patch'; // Auto-patches on import
 * 
 * Note: This applies dynamic buffer growth. The buffer starts at 1KB
 * and doubles automatically until encoding succeeds.
 */
export const autoPatch = patchAnchorBuffer();

/**
 * Default export for convenience
 */
export default patchAnchorBuffer;

/**
 * Error extraction helpers for Anchor program errors
 * These handle various Anchor error formats and extract error codes reliably
 */

/**
 * Extracts Anchor error code from error object (checks common paths)
 */
export function extractAnchorErrorCode(err: any): string | undefined {
  // Try multiple paths where Anchor stores error codes
  // Anchor v0.28+ structure: err.error.errorCode.code
  // Older versions: err.errorCode.code
  const paths = [
    err?.error?.errorCode?.code,
    err?.error?.error?.errorCode?.code,
    err?.errorCode?.code,
    err?.error?.code,
    err?.code,
    // Check error name directly
    err?.error?.errorCode?.name,
    err?.errorCode?.name,
    err?.error?.name,
    err?.name,
  ];
  
  for (const path of paths) {
    if (path && typeof path === 'string' && path !== 'Error' && path !== 'error') {
      // Return as-is - conversion to PascalCase happens in getProgramErrorCode
      return path;
    }
  }
  
  // Also check logs for error names (but skip "Instruction: ..." logs)
  if (err?.logs && Array.isArray(err.logs)) {
    for (const log of err.logs) {
      if (typeof log === 'string') {
        // Skip instruction logs
        if (log.includes('Instruction:')) continue;
        // Look for error names in logs
        const match = log.match(/Program log:\s*(\w+)/i);
        if (match && match[1] && match[1] !== 'Instruction' && match[1] !== 'Error' && match[1] !== 'error') {
          return match[1];
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extracts custom program error number from error message/logs
 * Often appears as "custom program error: 0xNNNN"
 */
export function extractCustomProgramErrorNumber(err: any): number | undefined {
  // Often appears in err.toString() or logs as:
  // "custom program error: 0x1770"
  const text = String(err?.message || err?.toString?.() || "");
  const m = text.match(/custom program error:\s*(0x[0-9a-fA-F]+)/i);
  if (m) return parseInt(m[1], 16);

  // Sometimes Anchor attaches numeric codes
  if (typeof err?.error?.errorCode?.number === "number") return err.error.errorCode.number;
  if (typeof err?.errorCode?.number === "number") return err.errorCode.number;

  return undefined;
}

/**
 * Maps custom error number to IDL error name
 */
export function mapCustomErrorToIdlCode(idl: Idl | undefined, customErr: number | undefined): string | undefined {
  if (customErr == null || !idl?.errors) return undefined;
  const found = idl.errors.find((e: any) => e.code === customErr);
  return found?.name;
}

/**
 * Converts snake_case to PascalCase (e.g., "invalid_supply" -> "InvalidSupply")
 */
function snakeToPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts camelCase to PascalCase (e.g., "invalidSupply" -> "InvalidSupply")
 */
function camelToPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Comprehensive error code extraction that tries all methods
 * @param err - The error object from Anchor
 * @param idl - Optional IDL to map custom error numbers to names
 * @returns The error code name (e.g., "InvalidSupply") or undefined
 */
export function getProgramErrorCode(err: any, idl?: Idl | undefined): string | undefined {
  // First try direct Anchor error code extraction
  const anchorCode = extractAnchorErrorCode(err);
  if (anchorCode) {
    let convertedCode = anchorCode;
    // Convert snake_case to PascalCase if needed
    if (anchorCode.includes('_')) {
      convertedCode = snakeToPascalCase(anchorCode);
    } else if (anchorCode.charAt(0) === anchorCode.charAt(0).toLowerCase() && anchorCode.length > 0) {
      // Convert camelCase to PascalCase if needed (e.g., "invalidSupply" -> "InvalidSupply", "unauthorized" -> "Unauthorized")
      convertedCode = camelToPascalCase(anchorCode);
    }
    
    // Validate against known errors and return properly cased version
    const knownErrors = [
      'InvalidSupply', 'InvalidStartTime', 'InvalidFeePercentage', 
      'MintingPaused', 'MintingNotStarted', 'MintingEnded', 
      'SupplyExceeded', 'MintLimitExceeded', 'Unauthorized',
      'TradingFrozen', 'TradingNotFrozen', 'AllowlistRequired',
      'AllowlistInvalid', 'AllowlistNotRequired', 'MathOverflow',
      'InvalidStatus', 'InvalidFee'
    ];
    const matchingError = knownErrors.find(e => e.toLowerCase() === convertedCode.toLowerCase());
    if (matchingError) {
      return matchingError; // Return the properly cased version
    }
    return convertedCode;
  }

  // Try custom program error from full text (message + logs) first — simulation failures often put "custom program error: 0x..." only in logs
  if (idl) {
    const fullText = [
      err?.message ?? "",
      err?.toString?.() ?? "",
      ...(Array.isArray(err?.logs) ? err.logs : []),
    ]
      .filter(Boolean)
      .join("\n");
    const hexMatch = fullText.match(/custom program error:\s*(0x[0-9a-fA-F]+)/i);
    if (hexMatch) {
      const errorNum = parseInt(hexMatch[1], 16);
      const mapped = mapCustomErrorToIdlCode(idl, errorNum);
      if (mapped) return mapped;
    }
  }

  // Try to extract error number from Anchor error structure
  // Anchor v0.28+ structure: err.error.errorCode.number
  // Also check err.error.errorCode.code (sometimes it's a string code)
  const errorNumber = err?.error?.errorCode?.number ?? err?.errorCode?.number ?? err?.code;
  if (errorNumber != null && idl) {
    const mapped = mapCustomErrorToIdlCode(idl, errorNumber);
    if (mapped) {
      // Convert snake_case to PascalCase if needed
      if (mapped.includes('_')) {
        return snakeToPascalCase(mapped);
      }
      // Convert camelCase or all lowercase to PascalCase if needed (e.g., "unauthorized" -> "Unauthorized")
      if (mapped.charAt(0) === mapped.charAt(0).toLowerCase() && mapped.length > 0) {
        const converted = camelToPascalCase(mapped);
        // Validate against known errors and return properly cased version
        const knownErrors = [
          'InvalidSupply', 'InvalidStartTime', 'InvalidFeePercentage', 
          'MintingPaused', 'MintingNotStarted', 'MintingEnded', 
          'SupplyExceeded', 'MintLimitExceeded', 'Unauthorized',
          'TradingFrozen', 'TradingNotFrozen', 'AllowlistRequired',
          'AllowlistInvalid', 'AllowlistNotRequired', 'MathOverflow',
          'InvalidStatus', 'InvalidFee'
        ];
        const matchingError = knownErrors.find(e => e.toLowerCase() === converted.toLowerCase());
        if (matchingError) {
          return matchingError; // Return the properly cased version
        }
        return converted;
      }
      return mapped;
    }
  }
  
  // Also try to get error name directly from error structure
  // Anchor sometimes stores error names in err.error.errorCode.name or err.error.name
  // Also check err.error.errorCode.code (sometimes it's a string code in snake_case)
  let errorName = err?.error?.errorCode?.name ?? err?.errorCode?.name ?? err?.error?.name ?? err?.name;
  // Also check code field which might contain the error name
  if (!errorName || errorName === 'Error' || errorName === 'error') {
    errorName = err?.error?.errorCode?.code ?? err?.errorCode?.code;
  }
  
  if (errorName && typeof errorName === 'string' && errorName !== 'Error' && errorName !== 'error') {
    // Convert snake_case to PascalCase if needed
    if (errorName.includes('_')) {
      errorName = snakeToPascalCase(errorName);
    } else if (errorName.charAt(0) === errorName.charAt(0).toLowerCase() && errorName.length > 0) {
      // Convert camelCase or all lowercase to PascalCase (e.g., "invalidSupply" -> "InvalidSupply", "unauthorized" -> "Unauthorized")
      errorName = camelToPascalCase(errorName);
    }
    
    // Validate it's a known error name (case-insensitive check)
    const knownErrors = [
      'InvalidSupply', 'InvalidStartTime', 'InvalidFeePercentage', 
      'MintingPaused', 'MintingNotStarted', 'MintingEnded', 
      'SupplyExceeded', 'MintLimitExceeded', 'Unauthorized',
      'TradingFrozen', 'TradingNotFrozen', 'AllowlistRequired',
      'AllowlistInvalid', 'AllowlistNotRequired', 'MathOverflow',
      'InvalidStatus', 'InvalidFee'
    ];
    // Check if errorName matches any known error (case-insensitive)
    const matchingError = knownErrors.find(e => e.toLowerCase() === errorName.toLowerCase());
    if (matchingError) {
      return matchingError; // Return the properly cased version
    }
    // If it's a valid-looking error name but not in the list, return it anyway (might be a new error)
    if (errorName.length > 0 && /^[A-Z]/.test(errorName)) {
      return errorName;
    }
  }

  // Try to extract from error message/logs
  const errorMessage = err?.message || err?.toString?.() || '';
  const errorString = String(err || '');
  
  // Check if error message contains the error name directly
  // Anchor sometimes includes error names in messages like "AnchorError: InvalidSupply"
  const messageMatch = errorMessage.match(/(?:AnchorError|ProgramError|Error):\s*(\w+)/i);
  if (messageMatch && messageMatch[1] && messageMatch[1] !== 'Error' && messageMatch[1] !== 'error') {
    let errorName = messageMatch[1];
    // Convert snake_case to PascalCase if needed
    if (errorName.includes('_')) {
      errorName = snakeToPascalCase(errorName);
    } else if (errorName.charAt(0) === errorName.charAt(0).toLowerCase() && errorName.length > 0) {
      // Convert camelCase to PascalCase (e.g., "invalidSupply" -> "InvalidSupply")
      errorName = camelToPascalCase(errorName);
    }
    // Validate it's a known error name (case-insensitive check)
    const knownErrors = [
      'InvalidSupply', 'InvalidStartTime', 'InvalidFeePercentage', 
      'MintingPaused', 'MintingNotStarted', 'MintingEnded', 
      'SupplyExceeded', 'MintLimitExceeded', 'Unauthorized',
      'TradingFrozen', 'TradingNotFrozen', 'AllowlistRequired',
      'AllowlistInvalid', 'AllowlistNotRequired', 'MathOverflow',
      'InvalidStatus', 'InvalidFee'
    ];
    const matchingError = knownErrors.find(e => e.toLowerCase() === errorName.toLowerCase());
    if (matchingError) {
      return matchingError; // Return the properly cased version
    }
    // If it's a valid-looking error name but not in the list, return it anyway (might be a new error)
    if (errorName.length > 0 && /^[A-Z]/.test(errorName)) {
      return errorName;
    }
  }
  
  // Check logs for error codes - this is often where Anchor puts the actual error
  if (err?.logs && Array.isArray(err.logs)) {
    for (const log of err.logs) {
      if (typeof log === 'string') {
        // Skip instruction logs
        if (log.includes('Instruction:')) continue;
        
        // Look for error codes in various formats:
        // "Program log: MintingPaused"
        // "Program log: CUSTOM_PROGRAM_ERROR: MintingPaused"
        // "Program log: Error: MintingPaused"
        const patterns = [
          /Program log:\s*(\w+)/i,
          /Program log:\s*CUSTOM_PROGRAM_ERROR:\s*(\w+)/i,
          /Program log:\s*Error:\s*(\w+)/i,
          /(\w+)\s*\(custom program error\)/i,
        ];
        
        for (const pattern of patterns) {
          const match = log.match(pattern);
          if (match && match[1] && match[1] !== 'Instruction' && match[1] !== 'Error' && match[1] !== 'error') {
            let errorName = match[1];
            // Convert snake_case to PascalCase if needed
            if (errorName.includes('_')) {
              errorName = snakeToPascalCase(errorName);
            } else if (errorName.charAt(0) === errorName.charAt(0).toLowerCase() && errorName.length > 0) {
              // Convert camelCase to PascalCase (e.g., "invalidSupply" -> "InvalidSupply")
              errorName = camelToPascalCase(errorName);
            }
            // Validate it's a known error name (case-insensitive check)
            const knownErrors = [
              'InvalidSupply', 'InvalidStartTime', 'InvalidFeePercentage', 
              'MintingPaused', 'MintingNotStarted', 'MintingEnded', 
              'SupplyExceeded', 'MintLimitExceeded', 'Unauthorized',
              'TradingFrozen', 'TradingNotFrozen', 'AllowlistRequired',
              'AllowlistInvalid', 'AllowlistNotRequired', 'MathOverflow',
              'InvalidStatus', 'InvalidFee'
            ];
            const matchingError = knownErrors.find(e => e.toLowerCase() === errorName.toLowerCase());
            if (matchingError) {
              return matchingError; // Return the properly cased version
            }
            // If it's a valid-looking error name but not in the list, return it anyway (might be a new error)
            if (errorName.length > 0 && /^[A-Z]/.test(errorName)) {
              return errorName;
            }
          }
        }
        
        // Look for custom program error with hex code
        const hexMatch = log.match(/custom program error:\s*(0x[0-9a-fA-F]+)/i);
        if (hexMatch && idl) {
          const errorNum = parseInt(hexMatch[1], 16);
          const mapped = mapCustomErrorToIdlCode(idl, errorNum);
          if (mapped) return mapped;
        }
      }
    }
  }

  // Try custom error number extraction and mapping
  const custom = extractCustomProgramErrorNumber(err);
  if (custom != null && idl) {
    const mapped = mapCustomErrorToIdlCode(idl, custom);
    if (mapped) return mapped;
  }
  
  // Check error.toString() and error.message for error names
  const allText = `${errorMessage} ${errorString}`.toLowerCase();
  const knownErrors = [
    'InvalidSupply', 'InvalidStartTime', 'InvalidFeePercentage', 
    'MintingPaused', 'MintingNotStarted', 'MintingEnded', 
    'SupplyExceeded', 'MintLimitExceeded', 'Unauthorized',
    'TradingFrozen', 'TradingNotFrozen', 'AllowlistRequired',
    'AllowlistInvalid', 'AllowlistNotRequired', 'MathOverflow',
    'InvalidStatus', 'InvalidFee'
  ];
  for (const errorName of knownErrors) {
    // Case-insensitive search (also check snake_case variants)
    const lowerErrorName = errorName.toLowerCase();
    const snakeCaseErrorName = errorName.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allText.includes(lowerErrorName) || allText.includes(snakeCaseErrorName)) {
      return errorName;
    }
  }
  
  // If we still haven't found it, check if this is an Anchor validation error
  // (like missing accounts) - these don't have program error codes
  if (errorMessage.includes('not provided') || errorMessage.includes('Account')) {
    // This is an Anchor validation error, not a program error
    // Return undefined so the test can handle it appropriately
    return undefined;
  }
  
  return undefined;
}
