import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusCollection } from "../target/types/nexus_collection";
import { patchAnchorBuffer } from "../utils/anchor-buffer-patch";
import { reduceMetadataToFit, estimateMetadataSize, validateTransactionSize } from "../utils/transaction-size-validator";

// Apply the patch before any tests run
patchAnchorBuffer();

// Configure the client
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

export const program = anchor.workspace.NexusCollection as Program<NexusCollection>;
export const authority = provider.wallet;
export { provider };

// Check if we're on localnet for performance optimizations
export const isLocalnet = provider.connection.rpcEndpoint.includes("localhost") || 
                   provider.connection.rpcEndpoint.includes("127.0.0.1") ||
                   provider.connection.rpcEndpoint.includes("8900") ||
                   provider.connection.rpcEndpoint.includes("8899");

// Optimized RPC options for localnet (skip preflight, use processed commitment)
export const rpcOptions = isLocalnet 
  ? { skipPreflight: true, commitment: "processed" as anchor.web3.Commitment }
  : {};

// Helper to wait after airdrop (only on non-localnet)
export async function waitAfterAirdrop(): Promise<void> {
  if (!isLocalnet) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Global before hook to ensure provider wallet has sufficient funds
export async function ensureProviderFunds(): Promise<void> {
  const balance = await provider.connection.getBalance(provider.wallet.publicKey);
  const minBalance = 10 * anchor.web3.LAMPORTS_PER_SOL; // 10 SOL minimum
  
  if (balance < minBalance) {
    const airdropAmount = minBalance - balance + anchor.web3.LAMPORTS_PER_SOL;
    const signature = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      airdropAmount
    );
    if (isLocalnet) {
      await provider.connection.confirmTransaction(signature, "processed");
    } else {
      await provider.connection.confirmTransaction(signature);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Helper to create a file property with r#type field (raw identifier in Rust)
export function createFileProperty(uri: string, type: string): any {
  return {
    uri: String(uri),
    ["r#type"]: String(type),
  };
}

// Helper to convert camelCase metadata to the format Anchor expects
export function toSnakeCaseMetadata(metadata: {
  name: string;
  symbol: string;
  description: string;
  sellerFeeBasisPoints?: number;
  image: string;
  externalUrl?: string | null;
  attributes?: Array<{ traitType?: string; trait_type?: string; value: string; displayType?: string; maxValue?: number }>;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
    category?: string;
    creators?: Array<{ address: string; share: number }>;
  };
}): any {
  return {
    name: String(metadata.name),
    symbol: String(metadata.symbol),
    description: String(metadata.description),
    sellerFeeBasisPoints: Number(metadata.sellerFeeBasisPoints ?? 250),
    image: String(metadata.image),
    externalUrl: (() => {
      if (metadata.externalUrl === undefined) {
        return "https://example.com";
      }
      if (metadata.externalUrl === null || metadata.externalUrl === "") {
        return null;
      }
      return String(metadata.externalUrl);
    })(),
    attributes: (metadata.attributes || []).map((attr: any) => {
      const attribute: any = {
        traitType: String(attr.traitType || attr.trait_type || ""),
        value: String(attr.value || ""),
        displayType: null,
        maxValue: null,
      };
      
      if (attr.displayType !== undefined && attr.displayType !== null && attr.displayType !== "") {
        attribute.displayType = String(attr.displayType);
      }
      
      if (attr.maxValue !== undefined && attr.maxValue !== null) {
        const numValue = typeof attr.maxValue === "number" 
          ? attr.maxValue 
          : (attr.maxValue instanceof anchor.BN ? attr.maxValue.toNumber() : Number(attr.maxValue));
        if (!isNaN(numValue) && isFinite(numValue)) {
          attribute.maxValue = new anchor.BN(numValue);
        }
      }
      
      return attribute;
    }),
    properties: {
      files: (metadata.properties?.files || [createFileProperty("https://gateway.lighthouse.storage/ipfs/bafybeia4un2wbforwcycyvagvynvds7246adcbxbtudk256qp3uehdzdce/0.png", "image/png")]).map((f: any) => {
        const fileProp: any = {
          uri: String(f.uri || ""),
        };
        fileProp["r#type"] = String(f.type || f["r#type"] || "");
        return fileProp;
      }),
      category: String(metadata.properties?.category || "image"),
      creators: (metadata.properties?.creators || [{ address: authority.publicKey.toString(), share: 100 }]).map((c: any) => {
        const addressStr = String(c.address || authority.publicKey.toString());
        let address: anchor.web3.PublicKey;
        try {
          address = new anchor.web3.PublicKey(addressStr);
        } catch (err) {
          address = authority.publicKey;
        }
        return {
          address: address,
          share: Math.min(255, Math.max(0, Number(c.share || 0) | 0)),
        };
      }),
    },
  };
}

// Helper to check if a PublicKey exists in a registry collections array
export function registryContains(registry: { collections: anchor.web3.PublicKey[] }, target: anchor.web3.PublicKey): boolean {
  return registry.collections.some((pk: anchor.web3.PublicKey) => pk.equals(target));
}

// Helper to create a collection
export async function createCollection(metadata: {
  name?: string;
  symbol?: string;
  description?: string;
  sellerFeeBasisPoints?: number;
  image?: string;
  externalUrl?: string | null;
  attributes?: Array<{ traitType: string; value: string; displayType?: string; maxValue?: number }>;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
    category?: string;
    creators?: Array<{ address: string; share: number }>;
  };
}, metadataUri?: string) {
  const mint = anchor.web3.Keypair.generate();
  const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("collection"), mint.publicKey.toBuffer()],
    program.programId
  );

  const truncateString = (str: string, maxLen: number): string => {
    const byteLength = Buffer.byteLength(str, 'utf8');
    if (byteLength <= maxLen) return str;
    
    let truncated = '';
    for (const char of str) {
      const newByteLength = Buffer.byteLength(truncated + char, 'utf8');
      if (newByteLength > maxLen) break;
      truncated += char;
    }
    return truncated;
  };

  let collectionMetadata: any = {
    name: truncateString(String(metadata.name || "Test Collection"), 100),
    symbol: truncateString(String(metadata.symbol || "TEST"), 10),
    description: truncateString(String(metadata.description || "Test Description"), 500),
    sellerFeeBasisPoints: Number(metadata.sellerFeeBasisPoints ?? 250),
    image: truncateString(String(metadata.image || "https://gateway.lighthouse.storage/ipfs/bafybeia4un2wbforwcycyvagvynvds7246adcbxbtudk256qp3uehdzdce/0.png"), 200),
    externalUrl: (() => {
      if (metadata.externalUrl === undefined) {
        return truncateString("https://example.com", 200);
      }
      if (metadata.externalUrl === null || metadata.externalUrl === "") {
        return null;
      }
      const truncated = truncateString(String(metadata.externalUrl), 200);
      return truncated === "" ? null : truncated;
    })(),
    attributes: (metadata.attributes || []).slice(0, 10).map((attr: any) => {
      const attribute: {
        traitType: string;
        value: string;
        displayType: string | null;
        maxValue: anchor.BN | null;
      } = {
        traitType: truncateString(String(attr.traitType || attr.trait_type || ""), 50),
        value: truncateString(String(attr.value || ""), 100),
        displayType: null,
        maxValue: null,
      };
      
      if (attr.displayType !== undefined && attr.displayType !== null && attr.displayType !== "") {
        const truncated = truncateString(String(attr.displayType), 50);
        attribute.displayType = truncated === "" ? null : truncated;
      }
      
      if (attr.maxValue !== undefined && attr.maxValue !== null) {
        const numValue = typeof attr.maxValue === "number" 
          ? attr.maxValue 
          : (attr.maxValue instanceof anchor.BN ? attr.maxValue.toNumber() : Number(attr.maxValue));
        if (!isNaN(numValue) && isFinite(numValue)) {
          attribute.maxValue = new anchor.BN(numValue);
        }
      }
      
      return attribute;
    }),
    properties: {
      files: (metadata.properties?.files || [createFileProperty("https://gateway.lighthouse.storage/ipfs/bafybeia4un2wbforwcycyvagvynvds7246adcbxbtudk256qp3uehdzdce/0.png", "image/png")]).slice(0, 5).map((f: any) => {
        const fileProp: any = {
          uri: truncateString(String(f.uri || ""), 200),
        };
        fileProp["r#type"] = truncateString(String(f.type || f["r#type"] || ""), 50);
        return fileProp;
      }),
      category: truncateString(String(metadata.properties?.category || "image"), 50),
      creators: (metadata.properties?.creators || [{ address: authority.publicKey.toString(), share: 100 }]).slice(0, 10).map((c: any) => {
        const addressStr = String(c.address || authority.publicKey.toString());
        let address: anchor.web3.PublicKey;
        try {
          address = new anchor.web3.PublicKey(addressStr);
        } catch (err) {
          address = authority.publicKey;
        }
        return {
          address: address,
          share: Math.min(255, Math.max(0, Number(c.share || 0) | 0)),
        };
      }),
    },
  };

  const [registryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    program.programId
  );

  try {
    await program.account.collectionRegistry.fetch(registryPda);
  } catch (err) {
    await program.methods
      .initializeRegistry()
      .accountsStrict({
        registry: registryPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc(rpcOptions);
  }

  const accounts = [
    collectionPda,
    mint.publicKey,
    registryPda,
    authority.publicKey,
    anchor.web3.SystemProgram.programId,
  ];
  
  let estimatedDataSize = estimateMetadataSize(collectionMetadata);
  const validation = validateTransactionSize(accounts, estimatedDataSize);
  
  if (!validation.isValid) {
    const reduced = reduceMetadataToFit(collectionMetadata, accounts);
    
    collectionMetadata = {
      name: reduced.name,
      symbol: reduced.symbol,
      description: reduced.description,
      sellerFeeBasisPoints: collectionMetadata.sellerFeeBasisPoints,
      image: reduced.image,
      externalUrl: reduced.externalUrl,
      attributes: reduced.attributes?.map((attr: any) => ({
        traitType: attr.traitType,
        value: attr.value,
        displayType: attr.displayType,
        maxValue: attr.maxValue !== null && attr.maxValue !== undefined 
          ? (attr.maxValue instanceof anchor.BN ? attr.maxValue : new anchor.BN(attr.maxValue))
          : null,
      })) || [],
      properties: {
        files: reduced.properties?.files?.map((f: any) => {
          const fileProp: any = {
            uri: f.uri,
          };
          fileProp["r#type"] = f.type || f["r#type"];
          return fileProp;
        }) || [],
        category: reduced.properties?.category || "image",
        creators: (reduced.properties?.creators || []).map((c: any) => {
          let address: anchor.web3.PublicKey;
          if (c.address && typeof c.address === 'object' && 'toBuffer' in c.address) {
            address = c.address;
          } else {
            const addressStr = String(c.address || authority.publicKey.toString());
            try {
              address = new anchor.web3.PublicKey(addressStr);
            } catch (err) {
              address = authority.publicKey;
            }
          }
          return {
            address: address,
            share: Math.min(255, Math.max(0, Number(c.share || 0) | 0)),
          };
        }),
      },
    };
    
    estimatedDataSize = estimateMetadataSize(collectionMetadata);
    const finalValidation = validateTransactionSize(accounts, estimatedDataSize);
    if (!finalValidation.isValid) {
      console.warn(
        `[transaction-size-validator] Warning: Transaction size (${finalValidation.estimatedSize} bytes) ` +
        `still exceeds limit (${finalValidation.maxSize} bytes) after reduction. ` +
        `Proceeding anyway - transaction may fail.`
      );
    }
  }

  const uri = metadataUri || "https://example.com/metadata.json";

  const sig = await program.methods
    .createCollection(uri)
    .accountsStrict({
      collection: collectionPda,
      mint: mint.publicKey,
      registry: registryPda,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc(rpcOptions);

  // FORCE FINALIZATION: With skipPreflight + processed, .rpc() returns before account is readable.
  // Any follow-up instruction that depends on this collection (e.g. PDA seeds) will see the
  // account as missing until we confirm and fetch.
  await provider.connection.confirmTransaction(sig, "confirmed");
  await program.account.collection.fetch(collectionPda);

  return { collectionPda, mint, registryPda };
}
