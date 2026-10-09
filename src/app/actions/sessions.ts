"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { Session } from "@/models/Session";
import type { FormResult } from "./users";

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function createSession(_: FormResult, formData: FormData): Promise<FormResult> {
  const admin = await requireAdmin();

  const values = {
    title: field(formData, "title"),
    courseCode: field(formData, "courseCode").toUpperCase(),
    terminalId: field(formData, "terminalId").toUpperCase(),
    opensAt: field(formData, "opensAt"),
    closesAt: field(formData, "closesAt"),
    lateAfterMinutes: field(formData, "lateAfterMinutes"),
    // Echoed back so the form keeps the admin's times after a refusal
    opensLocal: field(formData, "opensLocal"),
    closesLocal: field(formData, "closesLocal"),
  };

  if (!values.title || !values.terminalId || !values.opensAt || !values.closesAt) {
    return { ok: false, error: "Title, terminal, opening and closing time are required.", values };
  }
  // The browser sends ISO timestamps, so the window is the one the admin saw.
  const opensAt = new Date(values.opensAt);
  const closesAt = new Date(values.closesAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return { ok: false, error: "Enter valid opening and closing times.", values };
  }
  if (closesAt <= opensAt) {
    return { ok: false, error: "The session must close after it opens.", values };
  }
  const late = values.lateAfterMinutes === "" ? undefined : Number(values.lateAfterMinutes);
  if (late !== undefined && (!Number.isInteger(late) || late < 0)) {
    return { ok: false, error: "Late after must be a whole number of minutes.", values };
  }

  await connectDb();

  // Two sessions on one terminal at the same time would make a tap ambiguous.
  const clash = await Session.findOne({
    terminalId: values.terminalId,
    opensAt: { $lt: closesAt },
    closesAt: { $gt: opensAt },
  });
  if (clash) {
    return {
      ok: false,
      error: `Terminal ${values.terminalId} already has "${clash.title}" in that window.`,
      values,
    };
  }

  const session = await Session.create({
    title: values.title,
    courseCode: values.courseCode || undefined,
    terminalId: values.terminalId,
    opensAt,
    closesAt,
    lateAfterMinutes: late,
    createdBy: admin.id,
  });

  revalidatePath("/sessions");
  revalidatePath("/");
  return { ok: true, message: `Session "${session.title}" created.` };
}

/** Close an open session now, so no further taps are accepted. */
export async function closeSession(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "sessionId");
  if (!isValidObjectId(id)) return;

  await connectDb();
  const now = new Date();
  await Session.updateOne({ _id: id, closesAt: { $gt: now } }, { closesAt: now });
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
}

/** Only a session with no attendance can be deleted; otherwise close it. */
export async function deleteSession(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "sessionId");
  if (!isValidObjectId(id)) return;

  await connectDb();
  if (await AttendanceRecord.exists({ session: id })) return;
  await Session.deleteOne({ _id: id });
  revalidatePath("/sessions");
  redirect("/sessions");
}
