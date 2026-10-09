"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { createAdminSession, deleteAdminSession } from "@/lib/auth";
import { User } from "@/models/User";

export type LoginState = { error?: string; identifier?: string } | undefined;

// Compared against when the identifier is unknown, so a miss takes as long as a hit.
const DUMMY_HASH = "$2b$10$BB/aR/OjidX0qpRxdJYWM.bmo83iCouIViRQkkXbEJRblmov7bGxO";

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter your staff number and password.", identifier };
  }

  await connectDb();
  const user = await User.findOne({ identifier }).select("+passwordHash");
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid || user.role !== "administrator") {
    return { error: "Incorrect staff number or password.", identifier };
  }
  if (user.status !== "active") {
    return { error: "This account is suspended.", identifier };
  }

  await createAdminSession(String(user._id));
  redirect("/");
}

export async function logout() {
  await deleteAdminSession();
  redirect("/login");
}
