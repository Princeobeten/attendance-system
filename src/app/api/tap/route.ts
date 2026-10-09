import { timingSafeEqual } from "node:crypto";
import { recordTap } from "@/lib/tap";
import { normalizeUid } from "@/lib/uid";

function terminalKeyValid(req: Request) {
  const expected = process.env.TERMINAL_KEY;
  if (!expected) return true;
  const given = Buffer.from(req.headers.get("x-terminal-key") ?? "");
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** The terminal reports a tap; the server decides whether it counts. */
export async function POST(req: Request) {
  if (!terminalKeyValid(req)) {
    return Response.json({ error: "This terminal is not authorised." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cardUid = normalizeUid(body?.cardUid);
  const terminalId =
    typeof body?.terminalId === "string" ? body.terminalId.trim().toUpperCase() : "";

  if (!cardUid || !terminalId || terminalId.length > 20) {
    return Response.json({ error: "A card UID and terminal ID are required." }, { status: 400 });
  }

  return Response.json(await recordTap(cardUid, terminalId));
}
