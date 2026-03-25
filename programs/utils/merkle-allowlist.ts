/**
 * Merkle allowlist utilities for nexus-launchpad.
 * Matches the program's verification: leaf = keccak256(pubkey), parent = keccak256(left||right).
 * Leaf index bits determine left/right at each level. Max proof depth 24.
 */

import { keccak256 } from "js-sha3";
import type { PublicKey } from "@solana/web3.js";

const HASH_LEN = 32;

function toArray32(b: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < 32; i++) out.push(b[i] ?? 0);
  return out;
}

/** Hash bytes with keccak256. Returns 32-byte array. */
function hash(data: Uint8Array): number[] {
  const k = keccak256.create();
  k.update(data);
  const out = new Uint8Array(k.arrayBuffer());
  return toArray32(out);
}

/** Leaf = keccak256(pubkey), matching program. */
export function hashLeaf(pubkey: PublicKey): number[] {
  return hash(new Uint8Array(pubkey.toBytes()));
}

/** Hash(left || right) for parent node. */
function hashPair(left: number[], right: number[]): number[] {
  const combined = new Uint8Array(64);
  for (let i = 0; i < 32; i++) {
    combined[i] = left[i] ?? 0;
    combined[32 + i] = right[i] ?? 0;
  }
  return hash(combined);
}

/** Pad leaves to next power of 2 by duplicating last leaf. */
function padToPowerOf2(leaves: number[][]): number[][] {
  let n = leaves.length;
  if (n === 0) return [];
  let size = 1;
  while (size < n) size *= 2;
  const out = leaves.map((r) => [...r]);
  const last = out[out.length - 1]!;
  while (out.length < size) out.push([...last]);
  return out;
}

export interface MerkleAllowlist {
  root: number[];
  leaves: number[][];
  layers: number[][][];
}

/**
 * Build Merkle tree from allowlist pubkeys.
 * Leaves are sorted by pubkey bytes for deterministic order.
 */
export function buildMerkleAllowlist(pubkeys: PublicKey[]): MerkleAllowlist {
  const sorted = [...pubkeys].sort((a, b) => {
    const x = a.toBytes();
    const y = b.toBytes();
    for (let i = 0; i < 32; i++) {
      const d = (x[i] ?? 0) - (y[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  });
  const leaves = padToPowerOf2(sorted.map((p) => hashLeaf(p)));
  const layers: number[][][] = [leaves];

  let current = leaves;
  while (current.length > 1) {
    const next: number[][] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]!;
      const right = current[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    layers.push(next);
    current = next;
  }

  const root = current[0] ?? new Array(32).fill(0);
  return { root, leaves, layers };
}

/**
 * Get Merkle proof for leaf at index.
 * Returns array of 32-byte sibling hashes from leaf level to root (excl. root).
 * Matches program's verify_allowlist_proof (leaf_index bits => left/right).
 */
export function getProof(tree: MerkleAllowlist, leafIndex: number): number[][] {
  const proof: number[][] = [];
  let idx = leafIndex;
  for (let level = 0; level < tree.layers.length - 1; level++) {
    const row = tree.layers[level]!;
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx >= 0 && siblingIdx < row.length) {
      proof.push([...row[siblingIdx]!]);
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Convert proof to Anchor mint format: Vec<[u8;32]>. */
export function proofToAnchorFormat(proof: number[][]): number[][] {
  return proof.map((p) => {
    const out: number[] = [];
    for (let i = 0; i < 32; i++) out.push(p[i] ?? 0);
    return out;
  });
}
