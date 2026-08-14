export const runtime = "nodejs";

import { CARBON_ADMIN_SECRET } from "@/lib/stellar/config";
import { readCredit, readInstance, submitIssueCredit, stroopsToHuman, toStroops } from "@/lib/stellar/carbon";

type Body = {
  issuer: string;
  projectName: string;
  projectType: string;
  vintageYear: number;
  tonnes: number;
  /** Human price, e.g. "250.00" (payment-token units, 7 decimals). */
  price: string;
  region: string;
  registryId: string;
};

function toSerializableCredit(credit: ReturnType<typeof readCredit> extends Promise<infer T> ? T : never) {
  return { ...credit, price: stroopsToHuman(credit.price) };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listedOnly = url.searchParams.get("listedOnly") === "true";
    const { nextId } = await readInstance();

    const credits = [];
    for (let id = 1; id < nextId; id++) {
      try {
        const credit = await readCredit(id);
        if (listedOnly && credit.status !== "Listed") continue;
        credits.push(credit);
      } catch {
        // Skip ids without stored credits.
      }
    }

    return Response.json({ ok: true, credits: credits.map(toSerializableCredit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "marketplace list failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!CARBON_ADMIN_SECRET) {
      return Response.json(
        { ok: false, error: "CARBON_ADMIN_SECRET is not configured on the server" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as Body;
    if (
      !body?.issuer ||
      !body?.projectName ||
      !body?.projectType ||
      !body?.region ||
      !body?.registryId
    ) {
      return Response.json(
        { ok: false, error: "Missing issuer/projectName/projectType/region/registryId" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(body.tonnes) || body.tonnes <= 0) {
      return Response.json({ ok: false, error: "tonnes must be > 0" }, { status: 400 });
    }
    if (!Number.isFinite(body.vintageYear) || body.vintageYear < 1000) {
      return Response.json({ ok: false, error: "vintageYear is invalid" }, { status: 400 });
    }
    let price: bigint;
    try {
      price = toStroops(body.price);
    } catch {
      return Response.json({ ok: false, error: "price is invalid" }, { status: 400 });
    }
    if (price <= 0n) {
      return Response.json({ ok: false, error: "price must be > 0" }, { status: 400 });
    }

    const result = await submitIssueCredit(CARBON_ADMIN_SECRET, {
      issuer: body.issuer,
      projectName: body.projectName,
      projectType: body.projectType,
      vintageYear: body.vintageYear,
      tonnes: body.tonnes,
      price,
      region: body.region,
      registryId: body.registryId,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "issue credit failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
