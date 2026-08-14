export const runtime = "nodejs";

import { readCredit, readOwner, stroopsToHuman } from "@/lib/stellar/carbon";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const creditId = Number(id);
    if (!Number.isInteger(creditId) || creditId < 1) {
      return Response.json({ ok: false, error: "id must be a positive integer" }, { status: 400 });
    }

    const [credit, owner] = await Promise.all([readCredit(creditId), readOwner(creditId)]);
    return Response.json({ ok: true, credit: { ...credit, price: stroopsToHuman(credit.price) }, owner });
  } catch (error) {
    const message = error instanceof Error ? error.message : "credit detail failed";
    return Response.json({ ok: false, error: message }, { status: 404 });
  }
}
