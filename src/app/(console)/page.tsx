import Link from "next/link";
import type { Types } from "mongoose";
import { requireAdmin } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { fmtTime, fmtTimeSeconds } from "@/lib/format";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { Card } from "@/models/Card";
import { Session } from "@/models/Session";
import { TapLog } from "@/models/TapLog";
import { User } from "@/models/User";
import {
  Badge,
  Empty,
  PageHeader,
  Panel,
  Stat,
  outcomeLabel,
  statusTone,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";

export default async function DashboardPage() {
  await requireAdmin();
  await connectDb();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [users, activeCards, openSessions, tapsToday, acceptedToday, recentTaps] = await Promise.all([
    User.countDocuments({ role: { $ne: "administrator" } }),
    Card.countDocuments({ status: "active" }),
    Session.find({ opensAt: { $lte: now }, closesAt: { $gte: now } }).sort({ opensAt: 1 }).lean(),
    TapLog.countDocuments({ at: { $gte: startOfDay } }),
    TapLog.countDocuments({ at: { $gte: startOfDay }, outcome: "accepted" }),
    TapLog.find()
      .sort({ at: -1 })
      .limit(15)
      .populate<{ user: { fullName: string; identifier: string } | null }>("user", "fullName identifier")
      .populate<{ session: { title: string } | null }>("session", "title")
      .lean(),
  ]);

  const markedBySession = new Map<string, number>(
    (
      await AttendanceRecord.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { session: { $in: openSessions.map((s) => s._id) } } },
        { $group: { _id: "$session", n: { $sum: 1 } } },
      ])
    ).map((r) => [String(r._id), r.n]),
  );

  const refusedToday = tapsToday - acceptedToday;

  return (
    <>
      <PageHeader title="Dashboard" description="The register and today's activity at every terminal." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Registered users" value={users} hint="Students and staff" />
        <Stat label="Active cards" value={activeCards} hint="Each bound to one user" />
        <Stat label="Accepted taps today" value={acceptedToday} />
        <Stat
          label="Refused taps today"
          value={refusedToday}
          hint={refusedToday ? "See recent taps below" : "None"}
        />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <Panel
          title="Open now"
          actions={
            <Link href="/sessions" className="text-sm text-indigo-600 hover:underline">
              Manage
            </Link>
          }
        >
          {openSessions.length === 0 ? (
            <Empty>No session is open at any terminal.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openSessions.map((s) => (
                <li key={String(s._id)}>
                  <Link href={`/sessions/${s._id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">{s.title}</span>
                      <span className="text-sm tabular-nums text-slate-600">
                        {markedBySession.get(String(s._id)) ?? 0} marked
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {s.courseCode ? `${s.courseCode} · ` : ""}Terminal {s.terminalId} · until{" "}
                      {fmtTime(s.closesAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent taps" className="lg:col-span-2">
          {recentTaps.length === 0 ? (
            <Empty>No taps yet. Open the terminal and present a card.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Time</th>
                    <th className={thClass}>Who</th>
                    <th className={thClass}>Terminal</th>
                    <th className={thClass}>Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTaps.map((t) => (
                    <tr key={String(t._id)}>
                      <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{fmtTimeSeconds(t.at)}</td>
                      <td className={tdClass}>
                        {t.user ? (
                          <>
                            <div className="font-medium text-slate-900">{t.user.fullName}</div>
                            <div className="text-xs text-slate-500">{t.user.identifier}</div>
                          </>
                        ) : (
                          <span className="font-mono text-xs text-slate-500">{t.cardUid}</span>
                        )}
                      </td>
                      <td className={tdClass}>{t.terminalId}</td>
                      <td className={tdClass}>
                        <Badge tone={statusTone[t.outcome]}>{outcomeLabel[t.outcome]}</Badge>
                        {t.outcome !== "accepted" && (
                          <div className="mt-0.5 text-xs text-slate-500">{t.message}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
