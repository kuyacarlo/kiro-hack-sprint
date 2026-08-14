export const runtime = "nodejs";

import { stroopsToHuman, submitBuyCredit } from "@/lib/stellar/carbon";

type Body = {
  /** Secret key of the buyer. DEV MODE: the server signs on the buyer's
   *  behalf. For production, replace with a wallet-signed XDR flow. */
  buyerSecret: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const creditId = Number(id);
    if (!Number.isInteger(creditId) || creditId < 1) {
      return Response.json({ ok: false, error: "id must be a positive integer" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (!body?.buyerSecret) {
      return Response.json({ ok: false, error: "Missing buyerSecret" }, { status: 400 });
    }

    const result = await submitBuyCredit(body.buyerSecret, creditId);
    return Response.json({ ok: true, creditId, ...result, result: result.result ? { ...result.result, price: stroopsToHuman(result.result.price) } : undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "buy credit failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
