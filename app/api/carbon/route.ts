export const runtime = "nodejs";

import { readInstance } from "@/lib/stellar/carbon";

export async function GET() {
  try {
    const instance = await readInstance();
    return Response.json({ ok: true, ...instance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "carbon stats failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
