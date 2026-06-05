/**
 * Merkle Allowlist Utilities for nexus-launchpad.
 *
 * Matches the on-chain program's verification logic:
 *   leaf  = keccak256(pubkey)
 *   parent = keccak256(left || right)
 *   Leaf index bits determine left/right at each level. Max proof depth 24.
 *
 * Translation: this file builds the cryptographic tree of trust that decides
 * who gets to mint and who gets told "you're not on the list."
 * There is no bouncer. There is only math. The math does not negotiate.
 *
 * Allowlists are the blockchain's velvet rope. Merkle trees are the clipboard.
 * keccak256 is the bouncer who never forgets a face — or a public key.
 */

// keccak256 from js-sha3 — the hashing algorithm that powers Ethereum, many Solana programs,
// and, quite specifically, this allowlist. Not to be confused with SHA-256, which is
// a different kind of mathematical paranoia.
import { keccak256 } from "js-sha3";

// PublicKey from @solana/web3.js — the 32-byte address type that Solana uses for everything.
// Accounts, programs, PDAs, wallets — it's all 32 bytes.
// Beautiful in its uniformity. Deeply annoying when you typo one.
import type { PublicKey } from "@solana/web3.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/** keccak256 produces 32-byte hashes. This is a fixed law of the universe.
 *  Do not change this. You cannot change this. Nature has spoken. */
const HASH_LEN = 32;

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

/**
 * Convert a Uint8Array to a fixed-length 32-element number array.
 * Pads with zeros if the input is shorter than 32 bytes.
 * (If it's shorter than 32 bytes, something is already wrong upstream.
 *  But we pad anyway, because defensive code is kind code.)
 *
 * @param b - Input Uint8Array (should be 32 bytes; we're trusting you here)
 * @returns A number[] of exactly 32 elements, suitable for Anchor's Vec<u8;32> type
 */
function toArray32(b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < 32; i++) out.push(b[i] ?? 0); // ?? 0: fill the void with zeros
  return out;
}

/**
 * Hash arbitrary bytes with keccak256. Returns a 32-byte number array.
 * This is the cryptographic heart of the allowlist system.
 * Every leaf, every parent node — all created here.
 *
 * keccak256 is deterministic, collision-resistant, and fast.
 * The blockchain trusts it. So do we. (Mostly because we have no choice.)
 *
 * @param data - The raw bytes to hash
 * @returns A 32-element number[] representing the keccak256 digest
 */
function hash(data: Uint8Array): number[] {
  const k = keccak256.create();
  k.update(data);
  const out = new Uint8Array(k.arrayBuffer());
  return toArray32(out);
}

// ─── LEAF OPERATIONS ──────────────────────────────────────────────────────────

/**
 * Compute the Merkle leaf hash for a wallet's public key.
 * Leaf = keccak256(pubkey.toBytes()) — matches the on-chain program exactly.
 *
 * This is what makes an address "in" or "out" of the allowlist.
 * If your leaf is in the tree, you can mint.
 * If your leaf is not in the tree, you get "AllowlistInvalid."
 * The Merkle tree has no feelings about this. It just has math.
 *
 * @param pubkey - The Solana public key to hash into a leaf
 * @returns A 32-element number[] representing this address's leaf hash
 */
export function hashLeaf(pubkey: PublicKey): number[] {
  return hash(new Uint8Array(pubkey.toBytes()));
}

/**
 * Compute the parent hash of two sibling nodes.
 * Parent = keccak256(left || right) — concatenated, then hashed.
 *
 * The order matters. left is always the lower-index sibling.
 * Leaf index bits determine which sibling is left/right at each level.
 * The program verifies this exact same way. Match perfectly, or verification fails.
 * (The chain doesn't accept "close enough." The chain accepts correct or nothing.)
 *
 * @param left - The left sibling's 32-byte hash
 * @param right - The right sibling's 32-byte hash
 * @returns The 32-byte parent hash
 */
function hashPair(left: number[], right: number[]): number[] {
  // Concatenate left (32 bytes) || right (32 bytes) = 64-byte input to keccak256.
  // This is the standard Merkle construction. Nothing exotic here.
  // Just bytes in, bytes out. The universe is consistent about this.
  const combined = new Uint8Array(64);
  for (let i = 0; i < 32; i++) {
    combined[i] = left[i] ?? 0;         // Left half: bytes 0–31
    combined[32 + i] = right[i] ?? 0;   // Right half: bytes 32–63
  }
  return hash(combined);
}

/**
 * Pad a leaf array to the next power of 2 by duplicating the last leaf.
 *
 * Merkle trees require a perfect binary structure — 2, 4, 8, 16, ... leaves.
 * If you have, say, 5 wallets on your allowlist, we pad to 8 by repeating
 * the last wallet's hash three more times.
 *
 * This matches the on-chain program's padding strategy.
 * Mismatched padding = wrong root = "AllowlistInvalid" for everyone.
 * We don't want that. We do it right.
 *
 * @param leaves - The raw leaf hashes (one per allowlisted wallet)
 * @returns The padded leaf array with length = next power of 2
 */
function padToPowerOf2(leaves: number[][]): number[][] {
  let n = leaves.length;
  if (n === 0) return []; // Empty allowlist. The most exclusive club: nobody's invited.

  // Find the next power of 2 ≥ n.
  let size = 1;
  while (size < n) size *= 2;

  // Copy all existing leaves (immutably — we don't mutate the input).
  const out = leaves.map((r) => [...r]);

  // Duplicate the last leaf until we reach the target size.
  // The last leaf is the sacrificial duplicate. It volunteers for padding duty.
  const last = out[out.length - 1]!;
  while (out.length < size) out.push([...last]);
  return out;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

/**
 * The complete Merkle allowlist data structure.
 * Contains the root (what goes on-chain), the leaves (one per wallet),
 * and all intermediate layers (used to generate proofs).
 *
 * Think of it as the physical clipboard for the velvet rope.
 * root = the bouncer's master hash, stored on-chain.
 * leaves = every approved wallet's leaf hash.
 * layers = the full tree, needed to construct proofs.
 */
export interface MerkleAllowlist {
  /** The root hash — 32 bytes stored on-chain in the Collection account.
   *  This is what the program verifies against during mint. */
  root: number[];

  /** All leaf hashes, in sorted order, padded to next power of 2.
   *  Each leaf = keccak256(pubkey). One per allowlisted wallet (plus padding). */
  leaves: number[][];

  /** All layers of the Merkle tree, from leaves (layer 0) to root (last layer).
   *  Used to derive proofs. Like a receipt for every branch of the trust tree. */
  layers: number[][][];
}

// ─── TREE CONSTRUCTION ────────────────────────────────────────────────────────

/**
 * Build a complete Merkle allowlist tree from a list of public keys.
 * Sorts addresses deterministically, hashes each into a leaf,
 * pads to power of 2, then builds all parent layers bottom-up.
 *
 * The sort is critical. Deterministic ordering means the root is the same
 * every time you build the tree with the same inputs. Undeterministic ordering
 * would give you a different root each run, and everyone's proofs would break.
 * The blockchain would not be impressed. The blockchain would reject everyone.
 *
 * Max proof depth: 24 layers. That's 2^24 = 16.7 million addresses.
 * If your allowlist has more than 16.7 million wallets, call us. We want to hear about it.
 *
 * @param pubkeys - The wallets to allowlist (order doesn't matter — we sort them)
 * @returns The complete MerkleAllowlist with root, leaves, and all layers
 */
export function buildMerkleAllowlist(pubkeys: PublicKey[]): MerkleAllowlist {
  // Sort by raw pubkey bytes, lexicographically.
  // Deterministic. Reproducible. The same inputs always produce the same tree.
  // This is the law of the allowlist. Chaos is not welcome here.
  const sorted = [...pubkeys].sort((a, b) => {
    const x = a.toBytes();
    const y = b.toBytes();
    for (let i = 0; i < 32; i++) {
      const d = (x[i] ?? 0) - (y[i] ?? 0);
      if (d !== 0) return d; // Found a difference. Sort by it.
    }
    return 0; // Identical pubkeys. Shouldn't happen. The chain wouldn't allow duplicates anyway.
  });

  // Hash each sorted pubkey into a leaf, then pad to power of 2.
  // The padding ensures the tree is a perfect binary tree.
  const leaves = padToPowerOf2(sorted.map((p) => hashLeaf(p)));

  // The layers array starts with the leaves.
  // Each subsequent layer is built by hashing pairs from the previous layer.
  const layers: number[][][] = [leaves];

  let current = leaves;

  // Build each level bottom-up until we reach a single root node.
  // This is the classic Merkle tree construction:
  // "take pairs, hash each pair into a parent, repeat until one remains."
  while (current.length > 1) {
    const next: number[][] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]!;
      // If there's no right sibling (odd number), use left as both.
      // (Shouldn't happen after padding, but defensive code is kind code.)
      const right = current[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    layers.push(next);
    current = next;
  }

  // The final layer contains exactly one element: the Merkle root.
  // This 32-byte hash is what gets stored on-chain and verified against.
  // Store this. Guard this. If it changes, everyone's proofs are invalid.
  const root = current[0] ?? new Array(32).fill(0); // Fallback: all zeros (empty tree edge case).
  return { root, leaves, layers };
}

// ─── PROOF GENERATION ─────────────────────────────────────────────────────────

/**
 * Generate a Merkle proof for the leaf at a given index.
 * Returns an array of 32-byte sibling hashes, from leaf level up to (but not including) root.
 *
 * This proof is what a wallet submits at mint time.
 * The on-chain program recomputes the root using the proof and verifies it matches
 * the stored root. If it matches: you're on the list. If not: you're not.
 * The math is the bouncer. The math does not take bribes.
 *
 * Leaf index bits determine left/right sibling at each level:
 *   - Even index (bit 0 = 0): current node is LEFT, sibling is to the RIGHT (idx + 1)
 *   - Odd index  (bit 0 = 1): current node is RIGHT, sibling is to the LEFT (idx - 1)
 * Then divide by 2 to move to the next level. Repeat.
 *
 * This is the exact same traversal the Rust program uses. Byte-for-byte compatible.
 * If you change the traversal here, you break proofs. Don't change the traversal.
 *
 * @param tree - The complete MerkleAllowlist (built by buildMerkleAllowlist)
 * @param leafIndex - The 0-based index of the leaf to generate a proof for
 * @returns Array of sibling hashes, from leaf level to pre-root level
 */
export function getProof(tree: MerkleAllowlist, leafIndex: number): number[][] {
  const proof: number[][] = [];
  let idx = leafIndex;

  // Traverse from leaf level (layer 0) up to (but not including) the root layer.
  for (let level = 0; level < tree.layers.length - 1; level++) {
    const row = tree.layers[level]!;

    // Find the sibling: if current is even (left), sibling is idx+1 (right).
    // If current is odd (right), sibling is idx-1 (left).
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

    // Add sibling to proof (bounds check: a valid tree should always have a sibling).
    if (siblingIdx >= 0 && siblingIdx < row.length) {
      proof.push([...row[siblingIdx]!]); // Copy the sibling hash into the proof.
    }

    // Move to the parent level: divide index by 2.
    // This is how you navigate a binary tree without storing parent pointers.
    // Simple. Elegant. The Merkle way.
    idx = Math.floor(idx / 2);
  }

  return proof;
}

// ─── FORMAT CONVERSION ────────────────────────────────────────────────────────

/**
 * Convert a Merkle proof to the Anchor/Rust expected format: Vec<[u8; 32]>.
 * Each proof element must be exactly 32 bytes. We enforce this here.
 *
 * The on-chain instruction expects this exact format.
 * If a proof element is shorter than 32 bytes, we pad with zeros.
 * (It shouldn't be shorter. But padding is cheap. Broken proofs are not.)
 *
 * @param proof - The proof array from getProof()
 * @returns The same proof as a strictly 32-elements-per-entry number[][] for Anchor
 */
export function proofToAnchorFormat(proof: number[][]): number[][] {
  return proof.map((p) => {
    // Ensure exactly 32 bytes per proof element.
    // The Rust type is [u8; 32] — fixed size, no exceptions.
    const out: number[] = [];
    for (let i = 0; i < 32; i++) out.push(p[i] ?? 0); // Pad to 32 if needed.
    return out;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// The Merkle allowlist is the cryptographic velvet rope of the NFT world.
// Sort your addresses. Hash your leaves. Build your tree. Store the root on-chain.
// Generate proofs. Submit proofs at mint time. The math verifies. You're in.
//
// Or you're not in. And the math explains exactly why.
// "AllowlistInvalid" is the chain's way of saying "I don't recognize you."
// It's not personal. It's keccak256.
//
// The tree is deterministic. The root is immutable (once set on-chain).
// The proof is trustless. The bouncer is mathematics.
// This is better than most real velvet ropes, which are run by Chad.
//
// Notes for future maintainers:
//   - Leaf formula MUST match verify_allowlist_proof in the Rust program.
//   - Sort order MUST match. Different sort = different root = everyone locked out.
//   - Padding strategy MUST match. Different padding = same problem.
//   - Max depth is 24. 2^24 = 16.7M addresses. Scale accordingly.
//
// — Juan
//   "The Merkle root does not forget. The Merkle root does not forgive."
//   nexus-launchpad, somewhere between a leaf hash and the truth
// ─────────────────────────────────────────────────────────────────────────────
