import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { connectDb } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_MS, signToken, verifyToken } from "@/lib/token";
import { User } from "@/models/User";

export async function createAdminSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_TTL_MS),
  });
}

export async function deleteAdminSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in administrator, re-checked against the database, or null. */
export const getAdmin = cache(async () => {
  const userId = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId || !isValidObjectId(userId)) return null;

  await connectDb();
  const user = await User.findById(userId).lean();
  if (!user || user.role !== "administrator" || user.status !== "active") return null;

  return { id: String(user._id), fullName: user.fullName, identifier: user.identifier };
});

/** Use at the top of every console page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return admin;
}
