import "server-only";
import { isValidObjectId, type Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { Session } from "@/models/Session";
import { User } from "@/models/User";

type ReportUser = {
  _id: Types.ObjectId;
  fullName: string;
  identifier: string;
  department: string;
};

const USER_FIELDS = "fullName identifier department";

// Everyone who is expected to attend: all registered students and staff.
async function expectedUsers(): Promise<ReportUser[]> {
  return User.find({ role: { $ne: "administrator" } })
    .select(USER_FIELDS)
    .sort({ fullName: 1 })
    .lean<ReportUser[]>();
}

export type SessionReportRow = {
  user: ReportUser;
  status: "present" | "late" | "absent";
  markedAt?: Date;
  cardUid?: string;
};

/** Every registered user, marked present, late or absent, for one session. */
export async function sessionReport(sessionId: string) {
  if (!isValidObjectId(sessionId)) return null;
  await connectDb();

  const session = await Session.findById(sessionId).lean();
  if (!session) return null;

  const [users, records] = await Promise.all([
    expectedUsers(),
    AttendanceRecord.find({ session: session._id })
      .populate<{ user: ReportUser }>("user", USER_FIELDS)
      .lean(),
  ]);

  const byUser = new Map(records.map((r) => [String(r.user._id), r]));
  const rows: SessionReportRow[] = users.map((user) => {
    const r = byUser.get(String(user._id));
    byUser.delete(String(user._id));
    return r
      ? { user, status: r.status, markedAt: r.markedAt, cardUid: r.cardUid }
      : { user, status: "absent" };
  });
  // Anyone marked who is not in the expected list (e.g. an administrator who tapped)
  for (const r of byUser.values()) {
    rows.push({ user: r.user, status: r.status, markedAt: r.markedAt, cardUid: r.cardUid });
  }

  rows.sort((a, b) => {
    const rank = { present: 0, late: 1, absent: 2 };
    return rank[a.status] - rank[b.status] || a.user.fullName.localeCompare(b.user.fullName);
  });

  const counts = {
    present: rows.filter((r) => r.status === "present").length,
    late: rows.filter((r) => r.status === "late").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };
  return { session, rows, counts };
}

export type RangeFilter = { courseCode?: string; from?: string; to?: string };

export function parseRange(params: Record<string, string | string[] | undefined>): RangeFilter {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  return {
    courseCode: one(params.course)?.toUpperCase(),
    from: one(params.from),
    to: one(params.to),
  };
}

/** Attendance per user across every session matching a course and/or date range. */
export async function rangeReport(filter: RangeFilter) {
  await connectDb();

  const query: Record<string, unknown> = {};
  if (filter.courseCode) query.courseCode = filter.courseCode;
  const opensAt: Record<string, Date> = {};
  if (filter.from) opensAt.$gte = new Date(`${filter.from}T00:00:00`);
  if (filter.to) opensAt.$lte = new Date(`${filter.to}T23:59:59.999`);
  if (Object.keys(opensAt).length) query.opensAt = opensAt;

  const sessions = await Session.find(query).sort({ opensAt: 1 }).lean();
  const sessionIds = sessions.map((s) => s._id);

  const [users, tallies] = await Promise.all([
    expectedUsers(),
    AttendanceRecord.aggregate<{ _id: Types.ObjectId; present: number; late: number }>([
      { $match: { session: { $in: sessionIds } } },
      {
        $group: {
          _id: "$user",
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const byUser = new Map(tallies.map((t) => [String(t._id), t]));
  const total = sessions.length;
  const rows = users.map((user) => {
    const t = byUser.get(String(user._id));
    const present = t?.present ?? 0;
    const late = t?.late ?? 0;
    const attended = present + late;
    return {
      user,
      present,
      late,
      absent: total - attended,
      percent: total ? Math.round((attended / total) * 100) : 0,
    };
  });

  return { sessions, rows, total };
}
