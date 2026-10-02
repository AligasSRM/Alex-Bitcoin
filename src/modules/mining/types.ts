export interface MiningWork {
  jobId: string;
  headerPrefix76: Uint8Array;
  nonceStart: number;
  nonceEnd: number;
  targetHex: string;
  createdAt: string;
}

export interface MiningSearchOptions {
  maxHashes?: number;
  stopSignal?: () => boolean;
}

export interface MiningSearchResult {
  jobId: string;
  found: boolean;
  nonce?: number;
  hashHex?: string;
  hashesTried: number;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
}

export interface MiningAuditEvent {
  jobId: string;
  workerId: string;
  type: "started" | "progress" | "found" | "stopped" | "completed" | "rejected";
  timestamp: string;
  nonce?: number;
  hashHex?: string;
  hashesTried?: number;
  reason?: string;
}
