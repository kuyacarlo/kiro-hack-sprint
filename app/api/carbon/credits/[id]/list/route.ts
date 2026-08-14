export const runtime = "nodejs";

import { submitListCredit, submitSetPrice, submitUnlistCredit, toStroops } from "@/lib/stellar/carbon";

type Body = {
  /** Secret key of the credit's current owner. DEV MODE. */
  ownerSecret: string;
  action: "list" | "unlist" | "price";
  /** Required for action=price. Human decimal amount. */
  price?: string;
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
    if (!["list", "unlist", "price"].includes(body.action)) {
      return Response.json({ ok: false, error: "action must be list|unlist|price" }, { status: 400 });
    }

    let result;
    if (body.action === "list") {
      result = await submitListCredit(body.ownerSecret, creditId);
    } else if (body.action === "unlist") {
      result = await submitUnlistCredit(body.ownerSecret, creditId);
    } else {
      let price: bigint;
      try {
        price = toStroops(body.price ?? "");
      } catch {
        return Response.json({ ok: false, error: "price is invalid" }, { status: 400 });
      }
      if (price <= 0n) {
        return Response.json({ ok: false, error: "price must be > 0" }, { status: 400 });
      }
      result = await submitSetPrice(body.ownerSecret, creditId, price);
    }

    return Response.json({ ok: true, creditId, action: body.action, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "listing update failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
