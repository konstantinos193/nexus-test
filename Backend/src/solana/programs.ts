/**
 * Backend Program Configuration
 * Provides access to IDL files and program metadata for backend services
 */

import { PROGRAM_IDS } from './constants';
import * as fs from 'fs';
import * as path from 'path';

// Load IDL files dynamically
const loadIdl = (filename: string) => {
  try {
    const idlPath = path.join(__dirname, 'idl', filename);
    return JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to load IDL ${filename}:`, error);
    return null;
  }
};

// Program metadata
export interface ProgramMetadata {
  id: string;
  name: string;
  idl: any;
  description?: string;
}

// Program configurations
export const PROGRAMS: Record<string, ProgramMetadata> = {
  nexus_collection: {
    id: PROGRAM_IDS.COLLECTION_PROGRAM,
    name: 'Nexus Collection',
    idl: loadIdl('nexus_collection.json'),
    description: 'NFT collection minting and management program',
  },
  nexus_launchpad: {
    id: PROGRAM_IDS.MINTING_PROGRAM,
    name: 'Nexus Launchpad',
    idl: loadIdl('nexus_launchpad.json'),
    description: 'Launchpad and whitelist management program',
  },
  nexus_payment: {
    id: PROGRAM_IDS.PAYMENT_PROGRAM,
    name: 'Nexus Payment',
    idl: loadIdl('nexus_payment.json'),
    description: 'Payment processing and fee distribution program',
  },
};

// Get program by ID
export function getProgramById(programId: string): ProgramMetadata | undefined {
  return Object.values(PROGRAMS).find(program => program.id === programId);
}

// Get program by name
export function getProgramByName(name: keyof typeof PROGRAMS): ProgramMetadata | undefined {
  return PROGRAMS[name];
}

// Get all programs
export function getAllPrograms(): ProgramMetadata[] {
  return Object.values(PROGRAMS);
}

// Get IDL by program name
export function getProgramIdl(programName: keyof typeof PROGRAMS) {
  const program = PROGRAMS[programName];
  return program ? program.idl : null;
}
