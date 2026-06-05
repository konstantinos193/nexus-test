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
 * In other words: Anchor assumed your instruction data would be small.
 * You showed up with an NFT metadata struct. Anchor panicked.
 * This file calms Anchor down. You're welcome.
 *
 * @see https://github.com/coral-xyz/anchor/issues (TODO: use a tighter buffer)
 *
 * Usage:
 *   import { patchAnchorBuffer } from './utils/anchor-buffer-patch';
 *   patchAnchorBuffer(); // Call once before any Anchor instruction encoding
 *
 * Or in test setup:
 *   before(() => {
 *     patchAnchorBuffer(); // Patch the void before poking the blockchain.
 *   });
 */

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/**
 * Minimal IDL type — just enough to find error codes.
 * We don't need the whole thing. We just need the errors array.
 * (Foreshadowing: there will be errors.)
 */
type Idl = {
  errors?: Array<{ name: string; code: number }>;
  [key: string]: any;
};

// ─── BN ACQUISITION ───────────────────────────────────────────────────────────

/**
 * Get the BN (big number) class from wherever it hides.
 * Tries @coral-xyz/anchor first, falls back to bn.js directly.
 * If neither exists, throws an error and questions your node_modules.
 *
 * BN is the reason you can represent u64 in JavaScript without losing your mind.
 * JavaScript numbers top out around 2^53. Solana laughs at this. BN handles it.
 */
function getBN(): any {
  try {
    // First choice: grab BN from Anchor's own dependency tree.
    // Ensures we use the same BN instance Anchor uses. Consistency is key.
    return require("@coral-xyz/anchor").BN || require("bn.js");
  } catch {
    try {
      // Second choice: raw bn.js. Same logic, different import path.
      return require("bn.js");
    } catch {
      // If we get here, neither exists. The project is in a broken state.
      // File a ticket. Or install dependencies. Probably install dependencies.
      throw new Error("Cannot find BN class. Make sure @coral-xyz/anchor or bn.js is installed.");
    }
  }
}

// ─── LAYOUT DETECTION ─────────────────────────────────────────────────────────

/**
 * Detect if a buffer-layout node is a BNLayout (i.e., expects a BN instance).
 * We need to know this because BNLayout.encode calls `.toTwos()` on its input,
 * which crashes spectacularly if you pass it a plain JS number.
 * (The error is "toTwos is not a function." The fix is this check.)
 *
 * Very defensive checks; avoids false-positives for u8/u16 layouts.
 * Those are just numbers. BNLayout is a whole different creature.
 *
 * @param layout - A buffer-layout node (or anything, really — we check carefully)
 * @returns true if this layout expects a BN instance
 */
function isBNLayout(layout: any): boolean {
  if (!layout) return false;
  return (
    layout.constructor?.name === "BNLayout" ||
    // Fallback detection for transpiled/minified builds where constructor.name is mangled.
    // We identify BNLayout by its unique combination of properties: decode, encode, signed, span, blob.
    // It's like identifying a suspect by their fingerprints. Except the fingerprints are TypeScript duck typing.
    (typeof layout.decode === "function" &&
      typeof layout.encode === "function" &&
      typeof layout.signed === "boolean" &&
      typeof layout.span === "number" &&
      layout.blob !== undefined)
  );
}

/**
 * Detect if a layout node is an OptionLayout (Rust's Option<T>).
 * OptionLayout.encode expects either null (None) or a raw inner value (Some).
 * Never expects { some: value } — that wrapper form must be stripped before encoding.
 *
 * @param layout - A buffer-layout node
 * @returns true if this is an OptionLayout (i.e., wraps an inner Some/None type)
 */
function isOptionLayout(layout: any): boolean {
  if (!layout) return false;
  return (
    layout.constructor?.name === "OptionLayout" ||
    // Fallback: OptionLayout always has a .layout (the inner type) and a .discriminator.
    (layout.layout != null && layout.discriminator != null)
  );
}

/**
 * Detect if a layout node is a Union (Rust enum) layout.
 * Union layouts need variant matching — you pass { VariantName: value } and
 * the layout figures out which branch of the enum to encode.
 *
 * The fun part: variant names in the IDL (Rust PascalCase) may not match
 * what the TypeScript client sends (camelCase, lowercase, whatever).
 * This function enables the normalization that follows.
 *
 * @param layout - A buffer-layout node
 * @returns true if this is a Union (enum variant) layout
 */
function isUnionLayout(layout: any): boolean {
  if (!layout) return false;
  return (
    layout.constructor?.name === "Union" ||
    // Fallback: Union layouts have a .variants object and a .getSourceVariant function.
    // If it quacks like a union, it's a union.
    (layout.variants != null && typeof layout.variants === "object" && layout.getSourceVariant != null)
  );
}

// ─── CASE CONVERSION ──────────────────────────────────────────────────────────

/**
 * snake_case → camelCase.
 * IDL field names come in Rust snake_case. TypeScript clients send camelCase.
 * This bridge function is why we don't have a naming convention war every build.
 *
 * @param s - snake_case string (e.g., "creator_wallet")
 * @returns camelCase string (e.g., "creatorWallet")
 */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * camelCase → snake_case.
 * The reverse journey. For when Anchor expects the Rust form and we have the JS form.
 * The snake always comes home eventually.
 *
 * @param s - camelCase string (e.g., "creatorWallet")
 * @returns snake_case string (e.g., "creator_wallet")
 */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Get a value from a struct object by its layout key,
 * trying both the exact key and its camelCase/snake_case equivalents.
 *
 * This is the "be flexible about naming" function.
 * The IDL says snake_case. The client sends camelCase.
 * We check both. Peace is maintained.
 *
 * @param obj - The object to look in
 * @param layoutKey - The key as named in the IDL/layout
 * @returns The value if found by any case convention, undefined otherwise
 */
function getStructValue(obj: any, layoutKey: string): any {
  if (obj == null || typeof obj !== "object") return undefined;

  // Exact match first. Most common case. Fastest path.
  let v = obj[layoutKey];
  if (v !== undefined) return v;

  // Try camelCase version.
  const camel = snakeToCamel(layoutKey);
  if (camel !== layoutKey) v = obj[camel];
  if (v !== undefined) return v;

  // Try snake_case version. Belt and suspenders.
  const snake = camelToSnake(layoutKey);
  if (snake !== layoutKey) v = obj[snake];
  return v;
}

// ─── OPTION UNWRAPPING ────────────────────────────────────────────────────────

/**
 * Unwrap all Option-like shapes to null | raw value.
 * Ensures { some } / { none } wrapper objects never reach OptionLayout.encode,
 * which expects raw values, not the wrapper form TypeScript clients often produce.
 *
 * Think of this as a customs agent for Option values:
 * "What's in the box?" → unwraps → "Just a number, sir."
 *
 * @param v - Possibly an Option wrapper object, possibly a raw value, possibly null
 * @returns The raw inner value (for Some) or null (for None / null / undefined)
 */
function unwrapOptionLike(v: any): null | any {
  if (v == null) return null;
  if (typeof v === "object" && !Array.isArray(v)) {
    // Explicit .some property → Some(inner). Return the inner.
    if (Object.prototype.hasOwnProperty.call(v, "some")) {
      return (v as any).some;
    }
    // Explicit .none property → None. Return null.
    if (Object.prototype.hasOwnProperty.call(v, "none")) {
      return null;
    }
    // Single-key object where the key is "some" or "none" → same logic.
    const keys = Object.keys(v);
    if (keys.length === 1 && (keys[0] === "some" || keys[0] === "none")) {
      if (keys[0] === "some") return (v as any).some;
      if (keys[0] === "none") return null;
    }
  }
  // Already a raw value. Nothing to unwrap. Return as-is.
  return v;
}

// ─── BN COERCION ──────────────────────────────────────────────────────────────

/**
 * Convert a number/bigint/string to BN.
 * BNLayout.encode calls .toTwos() on its input, which only works on BN instances.
 * This function ensures BNLayout always gets what it needs: a proper BN object.
 *
 * Signedness is handled by BNLayout itself via .toTwos(). We just need the BN.
 * Non-integer floats are rejected immediately — the blockchain does not do decimals.
 *
 * @param value - A number, bigint, or string representing the integer value
 * @returns A BN instance representing the same value
 */
function toBN(value: any): any {
  const BN = getBN();

  // Already a BN? Return immediately. No re-boxing needed.
  if (BN.isBN(value)) return value;

  // bigint → BN. Convert via string to avoid precision loss.
  if (typeof value === "bigint") return new BN(value.toString());

  // number → BN. Reject floats; Solana's integers are integers. This is law.
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new Error(`Non-integer number cannot be encoded as BN: ${value}`);
    }
    return new BN(value.toString());
  }

  // string → BN. Base 10. No hex, no binary. (Add those if you need them.)
  if (typeof value === "string") return new BN(value, 10);

  // Anything else is a bug. Scream loudly.
  throw new Error(`Cannot convert value to BN: ${value} (${typeof value})`);
}

// ─── LAYOUT-DRIVEN NORMALIZATION ──────────────────────────────────────────────

/**
 * Recursively normalize a value for a specific layout node.
 * This is the core of the patch's correctness guarantee.
 *
 * The problem it solves:
 *   - Option<i64> must arrive at OptionLayout as `null` or a `BN` instance.
 *   - Option<u8> must arrive at OptionLayout as `null` or a plain `number`.
 *   - Union (enum) variants must have their keys matched to the IDL's exact names.
 *   - Struct fields must be recursively normalized.
 *
 * Without this, you get "toTwos is not a function" and other fun surprises.
 * With this, encoding works and the blockchain accepts your transaction.
 * (Assuming the transaction isn't too big. See transaction-size-validator for that adventure.)
 *
 * @param layout - The buffer-layout node describing how the value should be encoded
 * @param value - The raw value from the TypeScript client (pre-normalization)
 * @returns A normalized value ready to be handed directly to layout.encode()
 */
function normalizeValueForLayout(layout: any, value: any): any {
  // ── Option<T> handling ──────────────────────────────────────────────────────
  // OptionLayout.encode expects null (None) or raw inner value (Some).
  // Never expects { some: ... } — that wrapper must die here.
  if (isOptionLayout(layout)) {
    const inner = layout.layout;
    const unwrapped = unwrapOptionLike(value);
    if (unwrapped == null) return null; // None. The option was empty.
    if (isBNLayout(inner)) return toBN(unwrapped); // Some(BN). Coerce.
    return normalizeValueForLayout(inner, unwrapped); // Some(T). Recurse.
  }

  // ── Union (enum) handling ────────────────────────────────────────────────────
  // Union layouts encode a single variant. Input is { VariantName: value }.
  // We need to match the input key to the IDL's exact variant name, which may
  // differ in case. (The IDL says "SemiFungible". Your code says "semiFungible".
  // We fix this instead of fighting about it.)
  if (isUnionLayout(layout)) {
    if (value == null || typeof value !== "object") {
      return value; // Scalar passed to Union? Return and let Anchor complain.
    }

    // Get all known variant names from the layout.
    const variants = layout.variants || {};
    const variantNames = Object.keys(variants);

    if (variantNames.length === 0) {
      return value; // Empty union? Unusual. Return as-is and move on.
    }

    // Try to find which of the input's keys matches a known variant name.
    let matchedVariant: string | null = null;
    const inputKeys = Object.keys(value);

    if (inputKeys.length === 1) {
      const inputKey = inputKeys[0];

      // Strategy 1: Exact match. Most common. Fastest. Best.
      if (variantNames.includes(inputKey)) {
        matchedVariant = inputKey;
      } else {
        // Strategy 2 & 3: Case-insensitive and normalized (no underscores/hyphens).
        // "semifungible" matches "SemiFungible". "semi_fungible" matches "SemiFungible".
        const lowerInput = inputKey.toLowerCase();
        const normalizedInput = inputKey.toLowerCase().replace(/[_-]/g, "");

        for (const variantName of variantNames) {
          const lowerVariant = variantName.toLowerCase();
          const normalizedVariant = variantName.toLowerCase().replace(/[_-]/g, "");

          // Lowercase exact match.
          if (lowerInput === lowerVariant) {
            matchedVariant = variantName;
            break;
          }

          // Normalized match (strips underscores/hyphens then compares).
          if (normalizedInput === normalizedVariant) {
            matchedVariant = variantName;
            break;
          }
        }
      }
    }

    if (matchedVariant) {
      // Found the variant. Normalize its inner value recursively.
      const variantValue = value[inputKeys[0]];
      const variantLayout = variants[matchedVariant];
      const normalized: any = {};

      if (variantLayout && variantValue != null) {
        normalized[matchedVariant] = normalizeValueForLayout(variantLayout, variantValue);
      } else {
        normalized[matchedVariant] = variantValue;
      }

      return normalized;
    }

    // No match found. Provide a helpful error before Anchor throws a cryptic one.
    // "unable to infer src variant" is the opaque error we're preventing here.
    if (inputKeys.length === 1) {
      const inputKey = inputKeys[0];
      throw new Error(
        `[anchor-buffer-patch] Unable to match enum variant "${inputKey}". ` +
        `Available variants: ${variantNames.join(", ")}. ` +
        `Input value: ${JSON.stringify(value)}. ` +
        `This usually means the variant name doesn't match Anchor's IDL (e.g., use "semiFungible" not "semifungible").`
      );
    }

    // Multi-key or zero-key input: return as-is. Not our problem to fix.
    return value;
  }

  // ── Bare BNLayout handling ───────────────────────────────────────────────────
  // A direct i64/u64/i128/u128 field. Convert to BN or it dies on .toTwos().
  if (isBNLayout(layout)) {
    if (value == null) return value; // null stays null.
    return toBN(value); // Everything else becomes a BN.
  }

  // ── Struct handling ──────────────────────────────────────────────────────────
  // Normalize each field individually using its own layout.
  // Output keys must match fd.property exactly — buffer-layout reads src[fd.property].
  if (layout?.fields && Array.isArray(layout.fields) && value && typeof value === "object") {
    const out: any = Array.isArray(value) ? [] : {};
    for (const fd of layout.fields) {
      const prop = fd.property ?? (fd as any).name;
      if (!prop) continue;
      let raw = getStructValue(value, prop);

      if (isOptionLayout(fd.layout)) {
        // OptionLayout: pass through to normalizeValueForLayout, which handles unwrapping.
        const normalized = normalizeValueForLayout(fd.layout, raw);
        out[prop] = normalized;
      } else {
        // Non-Option layout: defensively unwrap any accidental Option wrappers first,
        // then normalize for the actual layout type.
        raw = unwrapOptionLike(raw);
        const normalized = normalizeValueForLayout(fd.layout, raw);
        // Final defensive unwrap: if normalized value still has a wrapper, strip it.
        // This shouldn't happen if normalization worked, but belts AND suspenders.
        const finalValue = unwrapOptionLike(normalized);
        out[prop] = finalValue;
      }
    }
    return out;
  }

  // ── Sequence/Array handling ──────────────────────────────────────────────────
  // Sequences call .reduce() on their value. null or undefined would crash this.
  // Return an empty array for missing values — safe, defensible, correct.
  if (layout?.elementLayout) {
    if (value == null) return []; // null array → empty array. The sequence lives.
    if (Array.isArray(value)) {
      return value.map((v) => normalizeValueForLayout(layout.elementLayout, v));
    }
    return []; // Non-array passed to sequence layout. Return empty and move on.
  }

  // ── Fallthrough ──────────────────────────────────────────────────────────────
  // Boolean, u8, string, pubkey, etc. — pass through unchanged.
  // These layouts handle their own encoding. We're not the boss of everything.
  return value;
}

// ─── ASSERTION HELPERS ────────────────────────────────────────────────────────

/**
 * Assert that no { some } / { none } wrapper objects remain in the normalized data.
 * Converts opaque "toTwos is not a function" crashes into precise path-aware errors.
 *
 * Think of this as a final QA pass before handing data to the encoder.
 * If a wrapper slipped through normalization, we'll find it here and tell you exactly where.
 *
 * Skips Array.prototype.some (arrays have .some natively — that's not an Option wrapper).
 *
 * @param x - The normalized data to audit
 * @param path - The current dot-path in the object tree (for error messages)
 */
function assertNoSomeObjects(x: any, path = "root"): void {
  if (x == null || typeof x !== "object") return;

  // Arrays: recurse into each element, but don't check the array itself for .some
  // (Array.prototype.some is real and has nothing to do with Option<T>).
  if (Array.isArray(x)) {
    for (let i = 0; i < x.length; i++) {
      assertNoSomeObjects(x[i], `${path}[${i}]`);
    }
    return;
  }

  // Use own-property check to distinguish actual { some } objects from arrays.
  const hasSome = Object.prototype.hasOwnProperty.call(x, "some");
  const hasNone = Object.prototype.hasOwnProperty.call(x, "none");

  // If the object looks like an Option wrapper (small, has some/none), investigate.
  const keys = Object.keys(x);
  if ((hasSome || hasNone) && keys.length <= 2) {
    // Try to unwrap it one more time. Maybe normalization missed it.
    const unwrapped = unwrapOptionLike(x);
    if (unwrapped !== x) {
      // It was an Option wrapper that survived normalization.
      // Warn only if the inner value is a complex type (not a primitive).
      // Primitive inner values are handled by the OptionLayout.encode patch below.
      const innerValue = unwrapped;
      if (typeof innerValue === "object" && innerValue !== null && !(innerValue instanceof getBN())) {
        // Non-primitive option inner value: warn, but don't throw.
        // The OptionLayout.encode patch is the fallback safety net.
        console.warn(
          `[anchor-buffer-patch] Option wrapper detected at ${path} after normalization. ` +
          `This may indicate a normalization issue. Value: ${JSON.stringify(x)}`
        );
      }
      // Primitive values (number, string): the OptionLayout.encode patch handles these.
      // No warning needed — it's expected behavior.
      return;
    }
  }

  // Recurse into nested objects, skipping the some/none keys themselves.
  for (const [k, v] of Object.entries(x)) {
    if ((hasSome || hasNone) && (k === "some" || k === "none")) {
      continue; // Don't recurse into the option wrapper's own keys.
    }
    assertNoSomeObjects(v, `${path}.${k}`);
  }
}

/**
 * Preflight assertion: catch "plain number passed to BNLayout" early.
 * Converts the opaque "toTwos is not a function" crash into a clear, path-aware error
 * that tells you exactly which field is wrong and what type it has.
 *
 * This is the "make debugging less miserable" function.
 * Without it, you get a stack trace that points into buffer-layout internals.
 * With it, you get "[anchor-buffer-patch] BNLayout got number at root.supply."
 *
 * @param layout - The layout to check
 * @param value - The normalized value to validate
 * @param path - Current dot-path for error messages
 */
function assertNoPlainNumberForBN(layout: any, value: any, path = "root"): void {
  if (isBNLayout(layout)) {
    // A BNLayout received a plain number or bigint after normalization.
    // This means toBN() was never called on it. That's a normalization bug.
    if (typeof value === "number" || typeof value === "bigint") {
      throw new Error(
        `[anchor-buffer-patch] BNLayout got ${typeof value} at ${path}. ` +
        `Value=${String(value)}. This should have been normalized to BN.`
      );
    }
  }

  if (isOptionLayout(layout)) {
    // For Option layouts, check the payload (already unwrapped by normalization).
    const inner = layout.layout;
    const payload = value;
    if (payload != null) {
      assertNoPlainNumberForBN(inner, payload, `${path}`);
    }
    return;
  }

  // Recurse into struct fields.
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

// ─── THE PATCH ────────────────────────────────────────────────────────────────

/**
 * Patch Anchor's BorshInstructionCoder with a robust, dynamic-buffer version.
 *
 * What this does:
 *   1. Finds BorshInstructionCoder in Anchor's dist (CJS or ESM, we're flexible).
 *   2. Replaces its .encode() method with one that:
 *      - Normalizes all values (BN coercion, Option unwrapping, enum variant matching).
 *      - Runs preflight assertions to catch bugs before buffer-layout does.
 *      - Starts with a 1KB buffer and doubles it up to 64KB until encoding succeeds.
 *   3. Also patches OptionLayout.encode to handle { some } / { none } wrappers.
 *   4. Returns a restore function so the patch can be undone in tests.
 *
 * The "dynamically growing buffer" strategy:
 *   Anchor hardcodes 1000 bytes. We start at 1024 and double up to 64KB.
 *   If encoding fails with a RangeError (buffer overrun), we double and retry.
 *   Any other error is re-thrown immediately — not a buffer size problem.
 *   After 10 doublings we give up and throw a clear error.
 *   (10 doublings from 1KB = 1GB theoretical max. We cap at 64KB.
 *    If your instruction data exceeds 64KB, you have a different problem entirely.)
 *
 * @returns A restore function that undoes the patch (useful in test teardown)
 *
 * @example
 * ```typescript
 * const restore = patchAnchorBuffer();
 * // ... do Anchor things ...
 * restore(); // Restore original behavior
 * ```
 */
export function patchAnchorBuffer(): () => void {
  // ── Locate BorshInstructionCoder ──────────────────────────────────────────────
  // Try CJS first, then ESM, then the top-level Anchor export.
  // Anchor has reorganized its dist folder in ways that inspire creative import strategies.
  let BorshInstructionCoder: any;
  try {
    BorshInstructionCoder = require("@coral-xyz/anchor/dist/cjs/coder/borsh/instruction").BorshInstructionCoder;
  } catch (e) {
    try {
      BorshInstructionCoder = require("@coral-xyz/anchor/dist/esm/coder/borsh/instruction").BorshInstructionCoder;
    } catch (e2) {
      // Last resort: maybe it's on the top-level export. (It usually isn't. But maybe.)
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

  // ── Patch OptionLayout.encode ─────────────────────────────────────────────────
  // Safety-net: also patch OptionLayout directly via its constructor.
  // This catches { some } / { none } wrappers that slip through normalization.
  // We use the same borsh instance Anchor uses to guarantee we're patching the right class.
  try {
    const borsh = require("@coral-xyz/borsh");

    // Create a dummy option instance just to get at the OptionLayout constructor.
    // We don't care about option(u8(), "x") specifically — we want OptionLayout itself.
    const optInstance: any = borsh.option(borsh.u8(), "x");
    const OptionLayout = optInstance.constructor;

    if (!(OptionLayout as any).__patched_unwrap_some) {
      const originalEncode = OptionLayout.prototype.encode;
      OptionLayout.prototype.encode = function (this: any, src: any, b: any, offset = 0) {
        // Unwrap any { some } / { none } wrappers before calling the original encode.
        const unwrapped = unwrapOptionLike(src);
        if (unwrapped == null) return originalEncode.call(this, null, b, offset);

        // Coerce to BN if the inner layout is BNLayout. Otherwise pass through.
        const inner = this.layout;
        const coerced = isBNLayout(inner) ? toBN(unwrapped) : unwrapped;
        return originalEncode.call(this, coerced, b, offset);
      };
      // Mark as patched so we don't double-patch on multiple calls.
      (OptionLayout as any).__patched_unwrap_some = true;
    }
  } catch (e) {
    // Non-fatal. The primary normalization in BorshInstructionCoder.encode is the real fix.
    // This OptionLayout patch is just extra insurance. Belt AND suspenders AND a safety pin.
  }

  // ── Store the original encode for restoration later ───────────────────────────
  const originalEncode = BorshInstructionCoder.prototype.encode;

  /**
   * The replacement encode function. This is where the magic happens.
   *
   * Handles both Anchor calling conventions:
   *   - New (≥0.3x): encode(ixName: string, ix: any)
   *   - Legacy/internal: encode({ name, data }) or similar ad-hoc formats
   *
   * If we can't identify the instruction name or find its layout,
   * we fall back to the original encode. No silent failures.
   */
  BorshInstructionCoder.prototype.encode = function (...args: any[]) {
    // ── Argument unpacking ────────────────────────────────────────────────────
    let ixName: string | undefined;
    let ix: any;

    if (typeof args[0] === "string") {
      // New Anchor signature: encode(ixName, ix)
      ixName = args[0];
      ix = args[1];
    } else if (args[0] && typeof args[0] === "object") {
      // Legacy formats: encode({ name, data }) or similar.
      // Try multiple property name conventions because Anchor has a history.
      ixName = args[0].name ?? args[0].ixName ?? args[0].instructionName;
      ix = args[0].data ?? args[0].ix ?? args[0];
    }

    // ── Layout lookup ─────────────────────────────────────────────────────────
    // Anchor versions use different property names for the instruction layout map.
    // We try both. (If you're reading this because a third name broke, add it here.)
    const layouts =
      (this as any).ixLayouts ||
      (this as any).instructionLayouts ||
      null;

    // Can't find layouts → fall back to original. Don't break things we can't fix.
    if (!layouts || typeof layouts.get !== "function") {
      return originalEncode.apply(this, args);
    }

    // Can't identify instruction name → same. Fall back gracefully.
    if (!ixName) {
      return originalEncode.apply(this, args);
    }

    // ── Get the encoder for this instruction ──────────────────────────────────
    const encoder = layouts.get(ixName);

    if (!encoder) {
      // If the instruction doesn't exist in the IDL, something is very wrong.
      // Provide a clear error with the list of valid instructions to save debug time.
      throw new Error(
        `[anchor-buffer-patch] Instruction layout not found: ${ixName}. ` +
          `Available instructions: ${Array.from(layouts.keys()).join(", ")}`
      );
    }

    // ── Extract discriminator and layout ─────────────────────────────────────
    // The discriminator is Anchor's instruction selector: an 8-byte prefix derived
    // from the instruction name. It tells the program which instruction to execute.
    // Convert to Buffer regardless of whether it's an Array, Uint8Array, or Buffer.
    const discriminatorRaw = encoder.discriminator;
    const layout = encoder.layout;
    const discriminator = Buffer.from(discriminatorRaw);

    // ── Normalize the instruction data ────────────────────────────────────────
    // This is the main value-add of the patch: recursive, layout-driven normalization
    // that handles Option<T>, Union, BNLayout, struct fields, and sequences.
    const normalizedIx = normalizeValueForLayout(layout, ix);

    // Run preflight assertions. Catch bugs before buffer-layout does.
    // These throw early with clear, path-aware messages. Much better than RangeError from nowhere.
    assertNoPlainNumberForBN(layout, normalizedIx, ixName);
    assertNoSomeObjects(normalizedIx);

    // ── Dynamic buffer growth ─────────────────────────────────────────────────
    // Start at 1KB. Double on RangeError. Cap at 64KB.
    // This is the actual buffer-size fix that resolves "encoding overruns Buffer".
    // Anchor's hardcoded 1000 bytes is not enough for large NFT metadata structs.
    // We are not hardcoding anything. We grow until it fits or we give up.
    let size = 1024; // Starting size: 1KB. Reasonable for most instructions.
    const maxAttempts = 10;  // 10 doublings max. 1KB → 2KB → ... → 1MB theoretical. We cap at 64KB.
    const maxSize = 64 * 1024; // 64KB absolute maximum. If you need more, re-read the Solana docs.
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Hard cap check before allocating. Don't let buffer growth become a memory leak.
      if (size > maxSize) {
        if (lastError && !(lastError instanceof RangeError)) {
          throw lastError; // Non-buffer error stored from last attempt — throw it directly.
        }
        throw new Error(
          `[anchor-buffer-patch] Buffer size exceeded maximum (${maxSize} bytes) ` +
            `while encoding ${ixName}. Instruction data may be too large for Solana transaction limits.`
        );
      }

      // Allocate the buffer for this attempt.
      const data = Buffer.alloc(size);

      try {
        // The actual encoding. If this succeeds, we're done.
        const len = layout.encode(normalizedIx, data);

        // Prepend the discriminator. This matches Anchor's exact output format.
        // discriminator (8 bytes) + encoded data = complete instruction payload.
        return Buffer.concat([discriminator, data.subarray(0, len)]);
      } catch (e: any) {
        lastError = e;

        // RangeError from buffer-layout means the buffer was too small.
        // Double and retry. This is the whole point of the patch.
        const isOutOfBounds = e instanceof RangeError;
        if (isOutOfBounds) {
          size *= 2; // Double it. We are unstoppable (within reason).
          continue;
        }

        // Any other error is a real bug — BN coercion failure, bad layout, etc.
        // Don't keep growing the buffer. Throw immediately with the real error.
        throw e;
      }
    }

    // If we exhausted all attempts, compose a useful error message.
    const errorMsg = lastError && !(lastError instanceof RangeError)
      ? `Last error: ${lastError.message}`
      : `exceeded max buffer growth (final size: ${size} bytes, max attempts: ${maxAttempts})`;

    throw new Error(
      `[anchor-buffer-patch] Unable to encode ${ixName}: ${errorMsg}`
    );
  };

  // Report successful patching. Logged for observability.
  // Also a small comfort during late-night debugging sessions.
  console.log(
    `[anchor-buffer-patch] Anchor instruction buffer patched successfully ` +
    `(dynamic buffer growth enabled)`
  );

  // Return a restore function. Useful in test teardown.
  // "With great patching comes great restorability."
  return () => {
    BorshInstructionCoder.prototype.encode = originalEncode;
    console.log("[anchor-buffer-patch] Anchor instruction buffer patch restored");
  };
}

// ─── AUTO-PATCH EXPORT ────────────────────────────────────────────────────────

/**
 * Auto-patch: applies the buffer patch immediately on module import.
 * For when you want the fix without the ceremony of calling a function.
 *
 * Usage:
 *   import './utils/anchor-buffer-patch'; // Patched. Done. Move on.
 *
 * The buffer starts at 1KB and grows automatically until encoding succeeds.
 * You don't have to think about it. That's the point.
 */
export const autoPatch = patchAnchorBuffer();

/**
 * Default export for convenience.
 * Some people prefer `import patchAnchorBuffer from '...'`.
 * We respect all calling conventions here.
 */
export default patchAnchorBuffer;

// ─── ANCHOR ERROR CODE EXTRACTION ────────────────────────────────────────────
//
// Anchor stores error codes in at least seven different places depending on
// which version you're running, whether you're on localnet, and what phase
// the moon is in. The following functions extract the error code regardless.
//
// You're welcome.

/**
 * Extract the Anchor error code name from an error object.
 * Checks every known path Anchor uses to store error codes.
 * Returns the first one found, or undefined if it found nothing useful.
 *
 * (If it returns undefined, the error is either not an Anchor program error
 *  or Anchor stored it somewhere we haven't found yet. File a PR.)
 *
 * @param err - The error object thrown by Anchor
 * @returns The error code string (e.g., "InvalidSupply") or undefined
 */
export function extractAnchorErrorCode(err: any): string | undefined {
  // All known paths. Anchor v0.28+ and earlier.
  // We check all of them because hope is free.
  const paths = [
    err?.error?.errorCode?.code,
    err?.error?.error?.errorCode?.code,
    err?.errorCode?.code,
    err?.error?.code,
    err?.code,
    err?.error?.errorCode?.name,
    err?.errorCode?.name,
    err?.error?.name,
    err?.name,
  ];

  for (const path of paths) {
    if (path && typeof path === 'string' && path !== 'Error' && path !== 'error') {
      return path;
    }
  }

  // If object paths failed, try reading program logs.
  // Anchor sometimes prints the error name in logs when it doesn't put it in the object.
  // "Program log: MintingPaused" → "MintingPaused"
  if (err?.logs && Array.isArray(err.logs)) {
    for (const log of err.logs) {
      if (typeof log === 'string') {
        // Skip instruction invocation logs — not what we want.
        if (log.includes('Instruction:')) continue;

        const match = log.match(/Program log:\s*(\w+)/i);
        if (match && match[1] && match[1] !== 'Instruction' && match[1] !== 'Error' && match[1] !== 'error') {
          return match[1];
        }
      }
    }
  }

  // Nothing found. The error code has eluded us. Try another function.
  return undefined;
}

/**
 * Extract a custom program error number from the error message or logs.
 * Custom program errors appear as hex codes: "custom program error: 0x1770"
 * (0x1770 = 6000, Anchor's first custom error offset. The math is always 6000+n.)
 *
 * @param err - The error object
 * @returns The decimal error number, or undefined if not found
 */
export function extractCustomProgramErrorNumber(err: any): number | undefined {
  // Check the error message or toString() for the hex pattern.
  const text = String(err?.message || err?.toString?.() || "");
  const m = text.match(/custom program error:\s*(0x[0-9a-fA-F]+)/i);
  if (m) return parseInt(m[1], 16); // Convert hex to decimal.

  // Also check Anchor's structured error objects for numeric codes.
  if (typeof err?.error?.errorCode?.number === "number") return err.error.errorCode.number;
  if (typeof err?.errorCode?.number === "number") return err.errorCode.number;

  return undefined; // Not found. The error remains anonymous.
}

/**
 * Map a custom error number to its IDL-defined error name.
 * The IDL contains the error codes like { name: "InvalidSupply", code: 6000 }.
 * We look up by code and return the name.
 *
 * @param idl - The program IDL (optional — returns undefined if not provided)
 * @param customErr - The decimal error code number
 * @returns The error name string, or undefined if not in the IDL
 */
export function mapCustomErrorToIdlCode(idl: Idl | undefined, customErr: number | undefined): string | undefined {
  if (customErr == null || !idl?.errors) return undefined;
  const found = idl.errors.find((e: any) => e.code === customErr);
  return found?.name;
}

/**
 * Convert snake_case to PascalCase.
 * "invalid_supply" → "InvalidSupply"
 * Used to normalize IDL error names to the canonical PascalCase form.
 */
function snakeToPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert camelCase to PascalCase.
 * "invalidSupply" → "InvalidSupply"
 * Used to normalize camelCase error names from Anchor's error objects.
 */
function camelToPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Comprehensive error code extraction: tries every method, normalizes to PascalCase,
 * validates against the known error list, and returns the canonical name.
 *
 * The "give me the error name no matter what" function.
 * Throw anything at it. It'll find the error code or die trying.
 * (It doesn't actually die. It returns undefined. Which is fine.)
 *
 * @param err - The error object from Anchor (in any of its many forms)
 * @param idl - Optional IDL for mapping custom error numbers to names
 * @returns The error code name in PascalCase (e.g., "InvalidSupply"), or undefined
 */
export function getProgramErrorCode(err: any, idl?: Idl | undefined): string | undefined {
  // The canonical list of known error names in this program.
  // If an error comes back that's not in this list, it might be a new one.
  // Update this list when you add errors to the Rust program.
  const knownErrors = [
    'InvalidSupply', 'InvalidStartTime', 'InvalidFeePercentage',
    'MintingPaused', 'MintingNotStarted', 'MintingEnded',
    'SupplyExceeded', 'MintLimitExceeded', 'Unauthorized',
    'TradingFrozen', 'TradingNotFrozen', 'AllowlistRequired',
    'AllowlistInvalid', 'AllowlistNotRequired', 'MathOverflow',
    'InvalidStatus', 'InvalidFee'
  ];

  // ── Attempt 1: Direct Anchor error code path ─────────────────────────────────
  const anchorCode = extractAnchorErrorCode(err);
  if (anchorCode) {
    let convertedCode = anchorCode;
    if (anchorCode.includes('_')) {
      convertedCode = snakeToPascalCase(anchorCode); // snake_case → PascalCase
    } else if (anchorCode.charAt(0) === anchorCode.charAt(0).toLowerCase() && anchorCode.length > 0) {
      convertedCode = camelToPascalCase(anchorCode); // camelCase → PascalCase
    }

    // Validate against known errors. Return the authoritative spelling.
    const matchingError = knownErrors.find(e => e.toLowerCase() === convertedCode.toLowerCase());
    if (matchingError) return matchingError;
    return convertedCode; // Unknown error name, but valid-looking. Return it.
  }

  // ── Attempt 2: Custom program error from logs/message ────────────────────────
  // Simulation failures often put "custom program error: 0x..." only in logs.
  // Parse the full text of the error object to find it.
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

  // ── Attempt 3: Numeric error code from Anchor structure ─────────────────────
  // Anchor v0.28+ stores the numeric code at err.error.errorCode.number.
  const errorNumber = err?.error?.errorCode?.number ?? err?.errorCode?.number ?? err?.code;
  if (errorNumber != null && idl) {
    const mapped = mapCustomErrorToIdlCode(idl, errorNumber);
    if (mapped) {
      // Normalize case before returning.
      if (mapped.includes('_')) return snakeToPascalCase(mapped);
      if (mapped.charAt(0) === mapped.charAt(0).toLowerCase() && mapped.length > 0) {
        const converted = camelToPascalCase(mapped);
        const matchingError = knownErrors.find(e => e.toLowerCase() === converted.toLowerCase());
        if (matchingError) return matchingError;
        return converted;
      }
      return mapped;
    }
  }

  // ── Attempt 4: Error name from Anchor structure ──────────────────────────────
  // Sometimes the name is directly in err.error.errorCode.name or similar.
  let errorName = err?.error?.errorCode?.name ?? err?.errorCode?.name ?? err?.error?.name ?? err?.name;
  if (!errorName || errorName === 'Error' || errorName === 'error') {
    // Also try the .code field which sometimes contains the name as a string.
    errorName = err?.error?.errorCode?.code ?? err?.errorCode?.code;
  }

  if (errorName && typeof errorName === 'string' && errorName !== 'Error' && errorName !== 'error') {
    if (errorName.includes('_')) {
      errorName = snakeToPascalCase(errorName);
    } else if (errorName.charAt(0) === errorName.charAt(0).toLowerCase() && errorName.length > 0) {
      errorName = camelToPascalCase(errorName);
    }

    const matchingError = knownErrors.find(e => e.toLowerCase() === errorName.toLowerCase());
    if (matchingError) return matchingError;
    if (errorName.length > 0 && /^[A-Z]/.test(errorName)) return errorName;
  }

  // ── Attempt 5: Pattern matching on error message ──────────────────────────────
  // Anchor sometimes includes error names in messages: "AnchorError: InvalidSupply"
  const errorMessage = err?.message || err?.toString?.() || '';
  const messageMatch = errorMessage.match(/(?:AnchorError|ProgramError|Error):\s*(\w+)/i);
  if (messageMatch && messageMatch[1] && messageMatch[1] !== 'Error' && messageMatch[1] !== 'error') {
    let eName = messageMatch[1];
    if (eName.includes('_')) eName = snakeToPascalCase(eName);
    else if (eName.charAt(0) === eName.charAt(0).toLowerCase() && eName.length > 0) eName = camelToPascalCase(eName);

    const matchingError = knownErrors.find(e => e.toLowerCase() === eName.toLowerCase());
    if (matchingError) return matchingError;
    if (eName.length > 0 && /^[A-Z]/.test(eName)) return eName;
  }

  // ── Attempt 6: Pattern matching on program logs ───────────────────────────────
  // The last place Anchor hides error names. Each log format gets its own regex.
  if (err?.logs && Array.isArray(err.logs)) {
    for (const log of err.logs) {
      if (typeof log === 'string') {
        if (log.includes('Instruction:')) continue; // Skip invocation logs.

        const patterns = [
          /Program log:\s*(\w+)/i,
          /Program log:\s*CUSTOM_PROGRAM_ERROR:\s*(\w+)/i,
          /Program log:\s*Error:\s*(\w+)/i,
          /(\w+)\s*\(custom program error\)/i,
        ];

        for (const pattern of patterns) {
          const match = log.match(pattern);
          if (match && match[1] && match[1] !== 'Instruction' && match[1] !== 'Error' && match[1] !== 'error') {
            let eName = match[1];
            if (eName.includes('_')) eName = snakeToPascalCase(eName);
            else if (eName.charAt(0) === eName.charAt(0).toLowerCase() && eName.length > 0) eName = camelToPascalCase(eName);

            const matchingError = knownErrors.find(e => e.toLowerCase() === eName.toLowerCase());
            if (matchingError) return matchingError;
            if (eName.length > 0 && /^[A-Z]/.test(eName)) return eName;
          }
        }

        // Also try hex error codes in logs.
        const hexMatch = log.match(/custom program error:\s*(0x[0-9a-fA-F]+)/i);
        if (hexMatch && idl) {
          const errorNum = parseInt(hexMatch[1], 16);
          const mapped = mapCustomErrorToIdlCode(idl, errorNum);
          if (mapped) return mapped;
        }
      }
    }
  }

  // ── Attempt 7: Substring search across all error text ────────────────────────
  // The nuclear option: search the entire error text for any known error name.
  const errorString = String(err || '');
  const allText = `${errorMessage} ${errorString}`.toLowerCase();

  for (const eName of knownErrors) {
    const lowerErrorName = eName.toLowerCase();
    const snakeCaseErrorName = eName.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allText.includes(lowerErrorName) || allText.includes(snakeCaseErrorName)) {
      return eName;
    }
  }

  // ── Bail out for Anchor validation errors ────────────────────────────────────
  // "not provided" and "Account" are Anchor's signatures for missing account errors.
  // These aren't program errors — they're client errors. Return undefined.
  if (errorMessage.includes('not provided') || errorMessage.includes('Account')) {
    return undefined;
  }

  // Truly unknown error. We tried everything. Return undefined.
  // Go look at the logs. The logs know things.
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This file exists because Anchor hardcoded a 1000-byte buffer and someone
// showed up with NFT metadata that politely exceeded it. The blockchain does
// not accept "politely exceeded." The blockchain accepts bytes or it rejects you.
//
// The patch is surgical. The normalization is recursive. The BN coercion is
// thorough. The error extraction is exhaustive to the point of obsession.
// That obsession is a feature, not a bug. Anchor's error format changes
// between versions. We check all of them. We leave no error code behind.
//
// If this file is causing you pain, it's probably because your enum variant
// name doesn't match the IDL. Check the case. It's always the case.
//
// — Juan
//   "Patching Anchor so you don't have to understand buffer-layout internals."
//   nexus-launchpad, somewhere between 1000 bytes and the truth
// ─────────────────────────────────────────────────────────────────────────────
