import "server-only";
import { connectDb, isDuplicateKeyError } from "@/lib/db";
import { fmtTime, fmtTimeSeconds } from "@/lib/format";
import { Session } from "@/models/Session";
import { Card } from "@/models/Card";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { TapLog, type TapOutcome } from "@/models/TapLog";
import type { UserDoc } from "@/models/User";
import type { Types } from "mongoose";

export type TapResult = {
  ok: boolean;
  outcome: TapOutcome;
  message: string;
  name?: string;
  identifier?: string;
  time?: string;
  status?: "present" | "late";
};

type PopulatedUser = UserDoc & { _id: Types.ObjectId };

/**
 * Algorithm 4.2: record an attendance from a tap.
 * The terminal only reports (cardUid, terminalId); every decision is made here.
 */
export async function recordTap(cardUid: string, terminalId: string): Promise<TapResult> {
  await connectDb();
  const now = new Date();

  const log = (
    outcome: TapOutcome,
    message: string,
    refs: { user?: Types.ObjectId; session?: Types.ObjectId } = {},
  ) => TapLog.create({ cardUid, terminalId, outcome, message, at: now, ...refs });

  // 1-2. A tap counts only at the terminal and inside the window a session fixes.
  const session = await Session.findOne({
    terminalId,
    opensAt: { $lte: now },
    closesAt: { $gte: now },
  }).sort({ opensAt: -1 });

  if (!session) {
    const message = "No session is open";
    await log("no_session", message);
    return { ok: false, outcome: "no_session", message };
  }

  // 3-4. The card must be issued and active.
  const card = await Card.findOne({ cardUid, status: "active" }).populate<{
    user: PopulatedUser;
  }>("user");

  if (!card || !card.user) {
    const message = "Card not recognised";
    await log("unrecognised", message, { session: session._id });
    return { ok: false, outcome: "unrecognised", message };
  }

  const user = card.user;

  // 5-6. The holder's account must be active.
  if (user.status === "suspended") {
    const message = "Account suspended";
    await log("suspended", message, { user: user._id, session: session._id });
    return { ok: false, outcome: "suspended", message, name: user.fullName };
  }

  const lateAt =
    session.lateAfterMinutes != null
      ? session.opensAt.getTime() + session.lateAfterMinutes * 60_000
      : Infinity;
  const status = now.getTime() > lateAt ? "late" : "present";

  // 7-8. Attempt the insert and let the unique index refuse a duplicate.
  // Reading first and then deciding would let two simultaneous taps both pass.
  try {
    await AttendanceRecord.create({
      session: session._id,
      user: user._id,
      cardUid,
      terminalId,
      markedAt: now,
      status,
    });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    const earlier = await AttendanceRecord.findOne({ session: session._id, user: user._id });
    const message = earlier
      ? `Already marked at ${fmtTime(earlier.markedAt)}`
      : "Already marked";
    await log("duplicate", message, { user: user._id, session: session._id });
    return { ok: false, outcome: "duplicate", message, name: user.fullName };
  }

  // 9. Show the name and the time so the user can confirm who was credited.
  const time = fmtTimeSeconds(now);
  const message = status === "late" ? `Marked late at ${time}` : `Marked present at ${time}`;
  await log("accepted", message, { user: user._id, session: session._id });
  return {
    ok: true,
    outcome: "accepted",
    message,
    name: user.fullName,
    identifier: user.identifier,
    time,
    status,
  };
}
