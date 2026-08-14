import { CARBON_ADMIN_SECRET } from "@/lib/stellar/config";
import { submitIssueCredit, toStroops } from "@/lib/stellar/carbon";
import { estimateCarbon, resolveGeometry } from "@/lib/verification/estimate";
import { Keypair } from "@stellar/stellar-sdk";

export const runtime = "nodejs";

type Body = {
  /** The verification result returned by POST /api/verification/run. */
  verification?: {
    ndviMean: number;
    vegetationFraction: number;
    geometry?: { areaHa?: number; polygon?: Array<[number, number]>; locationName?: string | null };
  };
  /** Alternative to `verification`: explicit numbers. */
  ndviMean?: number;
  vegetationFraction?: number;
  areaHa?: number;
  polygon?: Array<[number, number]>;

  projectName: string;
  projectType: string;
  region: string;
  /** Human price per credit, e.g. "25.00" (payment-token units, 7 decimals). */
  pricePerTonne: string;
  vintageYear?: number;
  /** Optional fixed tonnes; defaults to the estimated tCO2e. */
  tonnes?: number;
};

export async function POST(req: Request) {
  try {
    if (!CARBON_ADMIN_SECRET) {
      return Response.json(
        { ok: false, error: "CARBON_ADMIN_SECRET is not configured on the server" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as Body;
    if (!body?.projectName || !body?.projectType || !body?.region) {
      return Response.json(
        { ok: false, error: "Missing projectName/projectType/region" },
        { status: 400 },
      );
    }

    const ver = body.verification;
    const ndviMean = ver?.ndviMean ?? body.ndviMean;
    const vegetationFraction = ver?.vegetationFraction ?? body.vegetationFraction;
    if (!Number.isFinite(ndviMean)) {
      return Response.json({ ok: false, error: "ndviMean is required" }, { status: 400 });
    }

    // Determine the area, either from the verification response or from the
    // map geometry.
    let areaHa = ver?.geometry?.areaHa ?? body.areaHa;
    if (!Number.isFinite(areaHa) || (areaHa ?? 0) <= 0) {
      if (Array.isArray(body.polygon) && body.polygon.length >= 3) {
        areaHa = resolveGeometry({ bbox: { west: 0, south: 0, east: 0, north: 0 }, polygon: body.polygon }).areaHa;
      }
    }
    if (!Number.isFinite(areaHa) || (areaHa ?? 0) <= 0) {
      return Response.json(
        { ok: false, error: "Could not determine area; pass areaHa or polygon" },
        { status: 400 },
      );
    }

    const vegFrac = Number.isFinite(vegetationFraction)
      ? vegetationFraction as number
      : estimateCarbon(ndviMean as number, 1, areaHa!).vegetationFraction;
    const estimate = estimateCarbon(ndviMean as number, vegFrac, areaHa!);

    // Contract stores tonnes as an integer (i128); round up so the credit
    // fully covers the estimated stock.
    const tonnes = body.tonnes ?? Math.ceil(estimate.totalTco2e);
    if (!Number.isFinite(tonnes) || tonnes <= 0) {
      return Response.json(
        { ok: false, error: "Estimated carbon is 0; nothing to attest" },
        { status: 422 },
      );
    }

    let price: bigint;
    try {
      price = toStroops(body.pricePerTonne);
    } catch {
      return Response.json({ ok: false, error: "pricePerTonne is invalid" }, { status: 400 });
    }
    if (price <= 0n) {
      return Response.json({ ok: false, error: "pricePerTonne must be > 0" }, { status: 400 });
    }

    const vintageYear = body.vintageYear ?? new Date().getUTCFullYear();
    const registryId = `KIRO-${Date.now().toString(36).toUpperCase()}`;

    const result = await submitIssueCredit(CARBON_ADMIN_SECRET, {
      issuer: Keypair.fromSecret(CARBON_ADMIN_SECRET).publicKey(),
      projectName: body.projectName,
      projectType: body.projectType,
      vintageYear,
      tonnes,
      price,
      region: body.region,
      registryId,
    });

    return Response.json({
      ok: true,
      ...result,
      credit: result.result ?? null,
      estimation: {
        ndviMean,
        vegetationFraction: Math.round(vegFrac * 1000) / 1000,
        areaHa: Math.round(areaHa! * 100) / 100,
        tco2ePerHa: Math.round(estimate.tco2ePerHa * 100) / 100,
        totalTco2e: Math.round(estimate.totalTco2e * 100) / 100,
      },
      tonnes,
      vintageYear,
      registryId,
      locationName: ver?.geometry?.locationName ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "attestation failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}