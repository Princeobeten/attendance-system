import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { fmtTime } from "@/lib/format";
import { parseRange, rangeReport, sessionReport } from "@/lib/reports";

export async function GET(req: NextRequest) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);

  if (params.session) {
    const report = await sessionReport(params.session);
    if (!report) return Response.json({ error: "Session not found." }, { status: 404 });
    const { session, rows } = report;
    const csv = toCsv(
      ["Full name", "Identifier", "Department", "Status", "Time marked", "Card UID"],
      rows.map((r) => [
        r.user.fullName,
        r.user.identifier,
        r.user.department,
        r.status,
        r.markedAt ? fmtTime(r.markedAt) : "",
        r.cardUid ?? "",
      ]),
    );
    const name = `${session.courseCode || "session"}-${session.opensAt.toISOString().slice(0, 10)}.csv`;
    return csvResponse(name, csv);
  }

  const filter = parseRange(params);
  const { rows, total } = await rangeReport(filter);
  const csv = toCsv(
    ["Full name", "Identifier", "Department", "Present", "Late", "Absent", "Sessions", "Attendance %"],
    rows.map((r) => [
      r.user.fullName,
      r.user.identifier,
      r.user.department,
      r.present,
      r.late,
      r.absent,
      total,
      r.percent,
    ]),
  );
  const scope = [filter.courseCode, filter.from, filter.to].filter(Boolean).join("_") || "all";
  return csvResponse(`attendance-${scope}.csv`, csv);
}
