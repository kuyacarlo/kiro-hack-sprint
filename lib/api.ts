/**
 * Carbon Credit Marketplace — Frontend API Client
 *
 * Typed wrappers around the Next.js API routes for:
 * - /api/carbon (contract stats)
 * - /api/carbon/credits (list + issue)
 * - /api/carbon/credits/:id (detail)
 * - /api/carbon/credits/:id/buy
 * - /api/carbon/credits/:id/list (list/unlist/price)
 * - /api/carbon/credits/:id/retire
 * - /api/verification/run (NDVI satellite check)
 * - /api/openeo (openEO connection status)
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type CreditStatus = "Listed" | "Sold" | "Retired";

export type CarbonCredit = {
  id: number;
  projectName: string;
  projectType: string;
  vintageYear: number;
  tonnes: number;
  price: number; // serialized as number from bigint
  region: string;
  registryId: string;
  issuer: string;
  status: CreditStatus;
  listedAt: number;
  soldAt: number;
  retiredAt: number;
};

export type ContractStats = {
  ok: boolean;
  admin: string | null;
  nextId: number;
  feeBps: number;
  totalIssuedTonnes: number;
  totalRetiredTonnes: number;
  paymentToken: string | null;
  treasury: string | null;
};

export type SubmitResult = {
  ok: boolean;
  hash?: string;
  status?: "PENDING" | "SUCCESS" | "FAILED";
  creditId?: number;
  result?: CarbonCredit;
  error?: string;
};

export type CreditsListResponse = {
  ok: boolean;
  credits: CarbonCredit[];
  error?: string;
};

export type CreditDetailResponse = {
  ok: boolean;
  credit: CarbonCredit;
  owner: string;
  error?: string;
};

export type VerificationResult = {
  ok: boolean;
  bbox?: { west: number; south: number; east: number; north: number };
  temporalExtent?: { start: string; end: string };
  ndviMean?: number;
  rawNdviBps?: number;
  ndviBps?: number;
  minNdviBps?: number;
  buyable?: boolean;
  sampleGridSize?: number;
  source?: string;
  error?: string;
};

export type OpenEOStatus = {
  ok: boolean;
  endpoint?: string;
  apiVersion?: string;
  collections?: number;
  processes?: number;
  authStatus?: string;
  providerId?: string | null;
  error?: string;
};

// ── Fetch helper ──────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = (await res.json()) as T;
  return data;
}

// ── Contract Stats ────────────────────────────────────────────────────────

export async function fetchContractStats(): Promise<ContractStats> {
  return apiFetch<ContractStats>("/api/carbon");
}

// ── Credits ───────────────────────────────────────────────────────────────

export async function fetchCredits(listedOnly = false): Promise<CreditsListResponse> {
  const params = listedOnly ? "?listedOnly=true" : "";
  return apiFetch<CreditsListResponse>(`/api/carbon/credits${params}`);
}

export async function fetchCreditDetail(id: number): Promise<CreditDetailResponse> {
  return apiFetch<CreditDetailResponse>(`/api/carbon/credits/${id}`);
}

// ── Issue Credit ──────────────────────────────────────────────────────────

export type IssueCreditInput = {
  issuer: string;
  projectName: string;
  projectType: string;
  vintageYear: number;
  tonnes: number;
  price: string;
  region: string;
  registryId: string;
};

export async function issueCredit(input: IssueCreditInput): Promise<SubmitResult> {
  return apiFetch<SubmitResult>("/api/carbon/credits", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Buy Credit ────────────────────────────────────────────────────────────

export async function buyCredit(id: number, buyerSecret: string): Promise<SubmitResult> {
  return apiFetch<SubmitResult>(`/api/carbon/credits/${id}/buy`, {
    method: "POST",
    body: JSON.stringify({ buyerSecret }),
  });
}

// ── List/Unlist/Set Price ─────────────────────────────────────────────────

export async function listCredit(
  id: number,
  ownerSecret: string,
  action: "list" | "unlist" | "price",
  price?: string,
): Promise<SubmitResult> {
  return apiFetch<SubmitResult>(`/api/carbon/credits/${id}/list`, {
    method: "POST",
    body: JSON.stringify({ ownerSecret, action, price }),
  });
}

// ── Retire Credit ─────────────────────────────────────────────────────────

export async function retireCredit(id: number, ownerSecret: string): Promise<SubmitResult> {
  return apiFetch<SubmitResult>(`/api/carbon/credits/${id}/retire`, {
    method: "POST",
    body: JSON.stringify({ ownerSecret }),
  });
}

// ── Verification (NDVI) ──────────────────────────────────────────────────

export type VerificationInput = {
  bbox: { west: number; south: number; east: number; north: number };
  sampleGridSize?: number;
  temporalExtent?: { start: string; end: string };
  minNdviBps?: number;
};

export async function runVerification(input: VerificationInput): Promise<VerificationResult> {
  return apiFetch<VerificationResult>("/api/verification/run", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── OpenEO Status ─────────────────────────────────────────────────────────

export async function fetchOpenEOStatus(): Promise<OpenEOStatus> {
  return apiFetch<OpenEOStatus>("/api/openeo");
}
