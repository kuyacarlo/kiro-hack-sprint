export const runtime = "nodejs";

import { submitRetireCredit } from "@/lib/stellar/carbon";

type Body = {
  /** Secret key of the credit's current owner. DEV MODE. */
  ownerSecret: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const creditId = Number(id);
    if (!Number.isInteger(creditId) || creditId < 1) {
      return Response.json({ ok: false, error: "id must be a positive integer" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (!body?.ownerSecret) {
      return Response.json({ ok: false, error: "Missing ownerSecret" }, { status: 400 });
    }

    const result = await submitRetireCredit(body.ownerSecret, creditId);
    return Response.json({ ok: true, creditId, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "retire credit failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
