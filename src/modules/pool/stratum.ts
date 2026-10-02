import { randomBytes } from "node:crypto";

export type StratumRpcId = number | string | null;

export interface StratumRequest {
  id: StratumRpcId;
  method: string;
  params: unknown[];
}

export interface StratumResponse {
  id: StratumRpcId;
  result: unknown;
  error: [number, string, unknown] | null;
}

export interface StratumNotification {
  method: string;
  params: unknown[];
}

export interface StratumSubmitRequest {
  workerName: string;
  jobId: string;
  extranonce2: string;
  ntime: string;
  nonce: string;
}

export interface StratumSessionOptions {
  authorize?: (workerName: string, password: string) => boolean | Promise<boolean>;
  submit?: (request: StratumSubmitRequest) => boolean | Promise<boolean>;
  extranonce2Size?: number;
  extranonce1?: string;
}

const MAX_LINE_BYTES = 64 * 1024;

function errorResponse(id: StratumRpcId, code: number, message: string): StratumResponse {
  return { id, result: null, error: [code, message, null] };
}

function okResponse(id: StratumRpcId, result: unknown): StratumResponse {
  return { id, result, error: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRpcId(value: unknown): value is StratumRpcId {
  return value === null || typeof value === "string" || (typeof value === "number" && Number.isSafeInteger(value));
}

function isHex(value: unknown, length: number): value is string {
  return typeof value === "string" && value.length === length && /^[0-9a-fA-F]+$/.test(value);
}

export function parseStratumRequest(line: string): StratumRequest | StratumResponse {
  if (Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES) {
    return errorResponse(null, -32600, "request too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return errorResponse(null, -32700, "invalid JSON");
  }

  if (!isRecord(parsed) || !isRpcId(parsed.id) || typeof parsed.method !== "string" || !Array.isArray(parsed.params)) {
    return errorResponse(isRecord(parsed) && isRpcId(parsed.id) ? parsed.id : null, -32600, "invalid request");
  }

  return { id: parsed.id, method: parsed.method, params: parsed.params };
}

export class StratumSession {
  private subscribed = false;
  private authorized = false;
  private authorizedWorker?: string;
  private readonly activeJobs = new Set<string>();
  private jobGeneration = 0;
  private readonly extranonce1: string;
  private readonly extranonce2Size: number;
  private readonly options: StratumSessionOptions;

  constructor(options: StratumSessionOptions = {}) {
    this.options = options;
    this.extranonce2Size = options.extranonce2Size ?? 4;

    if (!Number.isInteger(this.extranonce2Size) || this.extranonce2Size < 1 || this.extranonce2Size > 16) {
      throw new Error("extranonce2Size must be an integer from 1 to 16");
    }

    this.extranonce1 = options.extranonce1 ?? randomBytes(4).toString("hex");

    if (!isHex(this.extranonce1, 8)) {
      throw new Error("extranonce1 must be exactly 4 bytes of hex");
    }
  }

  async handleLine(line: string): Promise<StratumResponse | StratumNotification[]> {
    const request = parseStratumRequest(line);

    if ("error" in request) return request;

    switch (request.method) {
      case "mining.subscribe":
        return this.subscribe(request.id);
      case "mining.authorize":
        return this.authorize(request.id, request.params);
      case "mining.submit":
        return this.submit(request.id, request.params);
      default:
        return errorResponse(request.id, -32601, "method not found");
    }
  }

  subscribe(id: StratumRpcId): StratumResponse {
    this.subscribed = true;
    return okResponse(id, [
      [["mining.set_difficulty", "1"], ["mining.notify", "1"]],
      this.extranonce1,
      this.extranonce2Size,
    ]);
  }

  async authorize(id: StratumRpcId, params: unknown[]): Promise<StratumResponse> {
    if (!this.subscribed) return errorResponse(id, 20, "subscribe first");
    if (params.length < 1 || typeof params[0] !== "string") return errorResponse(id, 20, "invalid worker name");
    if (params.length < 2 || typeof params[1] !== "string") return errorResponse(id, 20, "invalid password");

    const accepted = this.options.authorize ? await this.options.authorize(params[0], params[1]) : false;
    this.authorized = accepted;
    this.authorizedWorker = accepted ? params[0] : undefined;
    return okResponse(id, accepted);
  }

  async submit(id: StratumRpcId, params: unknown[]): Promise<StratumResponse> {
    if (!this.subscribed) return errorResponse(id, 20, "subscribe first");
    if (!this.authorized) return errorResponse(id, 24, "unauthorized worker");
    if (params.length !== 5 || !params.every((value) => typeof value === "string")) {
      return errorResponse(id, 20, "invalid submit parameters");
    }

    const [workerName, jobId, extranonce2, ntime, nonce] = params as string[];

    if (!workerName || !jobId) return errorResponse(id, 20, "invalid worker or job");
    if (this.authorizedWorker !== workerName) return errorResponse(id, 24, "worker does not match authorized session");
    if (!this.activeJobs.has(jobId)) return errorResponse(id, 21, "stale or unknown job");
    if (!isHex(extranonce2, this.extranonce2Size * 2)) return errorResponse(id, 20, "invalid extranonce2");
    if (!isHex(ntime, 8)) return errorResponse(id, 20, "invalid ntime");
    if (!isHex(nonce, 8)) return errorResponse(id, 20, "invalid nonce");

    const accepted = this.options.submit
      ? await this.options.submit({ workerName, jobId, extranonce2, ntime, nonce })
      : false;

    return okResponse(id, accepted);
  }

  registerJob(jobId: string): void {
    if (!jobId.trim()) throw new Error("jobId is required");
    this.activeJobs.add(jobId);
    this.jobGeneration += 1;
  }

  retireJob(jobId: string): void {
    this.activeJobs.delete(jobId);
    this.jobGeneration += 1;
  }

  retireAllJobs(): void {
    if (this.activeJobs.size > 0) this.jobGeneration += 1;
    this.activeJobs.clear();
  }

  getJobGeneration(): number {
    return this.jobGeneration;
  }

  isJobActive(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  snapshotActiveJobs(): string[] {
    return [...this.activeJobs];
  }

  setDifficulty(difficulty: number): StratumNotification {
    if (!Number.isFinite(difficulty) || difficulty <= 0) {
      throw new Error("difficulty must be positive and finite");
    }
    return { method: "mining.set_difficulty", params: [difficulty] };
  }

  notifyJob(
    jobId: string,
    prevHash: string,
    coinbase1: string,
    coinbase2: string,
    merkleBranches: string[],
    version: string,
    nbits: string,
    ntime: string,
    cleanJobs = true,
  ): StratumNotification {
    if (!this.subscribed) throw new Error("subscribe first");
    if (!jobId || !isHex(prevHash, 64) || !isHex(version, 8) || !isHex(nbits, 8) || !isHex(ntime, 8)) {
      throw new Error("invalid mining.notify job");
    }
    if (!/^[0-9a-fA-F]*$/.test(coinbase1) || !/^[0-9a-fA-F]*$/.test(coinbase2) || merkleBranches.some((branch) => !isHex(branch, 64))) {
      throw new Error("invalid mining.notify coinbase or merkle branch");
    }

    if (cleanJobs) this.retireAllJobs();
    this.registerJob(jobId);

    return {
      method: "mining.notify",
      params: [jobId, prevHash, coinbase1, coinbase2, merkleBranches, version, nbits, ntime, cleanJobs],
    };
  }

  isSubscribed(): boolean {
    return this.subscribed;
  }

  isAuthorized(): boolean {
    return this.authorized;
  }
}
