import "server-only";
import type { Types } from "mongoose";
import { connectDb, isDuplicateKeyError } from "@/lib/db";
import { Card } from "@/models/Card";

export class CardIssueError extends Error {}

/**
 * Algorithm 4.1, steps 5-7: bind a card UID to a registered user.
 * Both "one active card per UID" and "one active card per user" are unique
 * indexes, so the database refuses a second binding even under a race.
 */
export async function issueCard(userId: Types.ObjectId | string, cardUid: string) {
  await connectDb();

  const existing = await Card.findOne({ status: "active", $or: [{ cardUid }, { user: userId }] });
  if (existing) {
    throw new CardIssueError(
      existing.cardUid === cardUid
        ? "This card is already issued to another user."
        : "This user already holds an active card. Revoke it before issuing another.",
    );
  }

  try {
    return await Card.create({ cardUid, user: userId, status: "active" });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new CardIssueError("This card was issued to someone else a moment ago.");
    }
    throw err;
  }
}
