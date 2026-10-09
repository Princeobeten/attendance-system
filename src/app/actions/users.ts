"use server";

import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CardIssueError, issueCard } from "@/lib/cards";
import { connectDb, isDuplicateKeyError } from "@/lib/db";
import { normalizeUid } from "@/lib/uid";
import { Card, CARD_STATUSES } from "@/models/Card";
import { ROLES, User, USER_STATUSES } from "@/models/User";

export type FormResult =
  | { ok: true; message: string; userId?: string }
  | { ok: false; error: string; values?: Record<string, string> }
  | undefined;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

/** Algorithm 4.1: register a user and, if a card was read, bind it to them. */
export async function registerUser(_: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();

  const values = {
    fullName: field(formData, "fullName"),
    identifier: field(formData, "identifier").toUpperCase(),
    department: field(formData, "department"),
    role: field(formData, "role") || "student",
  };
  const password = String(formData.get("password") ?? "");
  const rawUid = field(formData, "cardUid");

  // Step 2: every required field must be supplied.
  if (!values.fullName || !values.identifier || !values.department) {
    return { ok: false, error: "Full name, identifier and department are required.", values };
  }
  if (!(ROLES as readonly string[]).includes(values.role)) {
    return { ok: false, error: "Choose a valid role.", values };
  }
  const role = values.role as (typeof ROLES)[number];
  if (role === "administrator" && password.length < 8) {
    return { ok: false, error: "Administrators need a password of at least 8 characters.", values };
  }
  const cardUid = rawUid ? normalizeUid(rawUid) : null;
  if (rawUid && !cardUid) {
    return { ok: false, error: "The card UID read is not valid. Present the card again.", values };
  }

  await connectDb();

  // Steps 3-4: the identifier must be new; the unique index settles any race.
  let user;
  try {
    user = await User.create({
      ...values,
      role,
      passwordHash: role === "administrator" ? await bcrypt.hash(password, 10) : undefined,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        ok: false,
        error: `A user with identifier ${values.identifier} is already registered.`,
        values,
      };
    }
    throw err;
  }

  revalidatePath("/users");
  const userId = String(user._id);

  if (!cardUid) {
    return { ok: true, message: `${user.fullName} registered. No card issued yet.`, userId };
  }

  // Steps 5-7: issue the card. The user record already exists, so a refused
  // card leaves a registered user without a card rather than undoing the registration.
  try {
    await issueCard(user._id, cardUid);
  } catch (err) {
    if (err instanceof CardIssueError) {
      return {
        ok: true,
        message: `${user.fullName} registered, but the card was refused: ${err.message}`,
        userId,
      };
    }
    throw err;
  }
  return { ok: true, message: `${user.fullName} registered and card ${cardUid} issued.`, userId };
}

export async function issueCardToUser(_: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const userId = field(formData, "userId");
  const cardUid = normalizeUid(field(formData, "cardUid"));

  if (!isValidObjectId(userId)) return { ok: false, error: "Unknown user." };
  if (!cardUid) return { ok: false, error: "Present a card to the reader first." };

  await connectDb();
  if (!(await User.exists({ _id: userId }))) return { ok: false, error: "Unknown user." };

  try {
    await issueCard(userId, cardUid);
  } catch (err) {
    if (err instanceof CardIssueError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return { ok: true, message: `Card ${cardUid} issued.` };
}

/** Mark a card revoked or lost. It is kept, not deleted, so its history stays explicable. */
export async function setCardStatus(formData: FormData) {
  await requireAdmin();
  const cardId = field(formData, "cardId");
  const status = field(formData, "status");
  if (!isValidObjectId(cardId) || status === "active") return;
  if (!(CARD_STATUSES as readonly string[]).includes(status)) return;

  await connectDb();
  const card = await Card.findOneAndUpdate(
    { _id: cardId, status: "active" },
    { status, revokedAt: new Date() },
  );
  if (card) {
    revalidatePath(`/users/${card.user}`);
    revalidatePath("/users");
  }
}

export async function setUserStatus(formData: FormData) {
  const admin = await requireAdmin();
  const userId = field(formData, "userId");
  const status = field(formData, "status");
  if (!isValidObjectId(userId)) return;
  if (!(USER_STATUSES as readonly string[]).includes(status)) return;
  // An administrator suspending themselves would lock the console.
  if (userId === admin.id) return;

  await connectDb();
  await User.updateOne({ _id: userId }, { status });
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
}
