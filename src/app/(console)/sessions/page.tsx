import type { Metadata } from "next";
import Link from "next/link";
import type { Types } from "mongoose";
import { closeSession } from "@/app/actions/sessions";
import { requireAdmin } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { fmtDateTime, fmtTime, sessionState } from "@/lib/format";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { Session } from "@/models/Session";
import {
  Badge,
  Empty,
  PageHeader,
  Panel,
  dangerButtonClass,
  statusTone,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { SessionForm } from "./SessionForm";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  await requireAdmin();
  await connectDb();

  const sessions = await Session.find().sort({ opensAt: -1 }).limit(200).lean();
  const counts = new Map<string, number>(
    (
      await AttendanceRecord.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { session: { $in: sessions.map((s) => s._id) } } },
        { $group: { _id: "$session", n: { $sum: 1 } } },
      ])
    ).map((r) => [String(r._id), r.n]),
  );
  const terminals = [...new Set(sessions.map((s) => s.terminalId))].sort();
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Sessions"
        description="A session fixes the course, the terminal and the window in which a tap counts."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="New session" className="self-start">
          <SessionForm terminals={terminals} />
        </Panel>

        <Panel title="All sessions" className="lg:col-span-2">
          {sessions.length === 0 ? (
            <Empty>No sessions yet. Create one to start taking attendance.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Session</th>
                    <th className={thClass}>Terminal</th>
                    <th className={thClass}>Window</th>
                    <th className={thClass}>Marked</th>
                    <th className={thClass}>State</th>
                    <th className={thClass}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((s) => {
                    const state = sessionState(s, now);
                    return (
                      <tr key={String(s._id)} className="hover:bg-slate-50">
                        <td className={tdClass}>
                          <Link href={`/sessions/${s._id}`} className="font-medium text-indigo-700 hover:underline">
                            {s.title}
                          </Link>
                          {s.courseCode && <div className="text-xs text-slate-500">{s.courseCode}</div>}
                        </td>
                        <td className={`${tdClass} font-mono text-xs`}>{s.terminalId}</td>
                        <td className={`${tdClass} whitespace-nowrap text-xs`}>
                          {fmtDateTime(s.opensAt)} – {fmtTime(s.closesAt)}
                        </td>
                        <td className={`${tdClass} tabular-nums`}>{counts.get(String(s._id)) ?? 0}</td>
                        <td className={tdClass}>
                          <Badge tone={statusTone[state]}>{state}</Badge>
                        </td>
                        <td className={`${tdClass} text-right`}>
                          {state === "open" && (
                            <form action={closeSession}>
                              <input type="hidden" name="sessionId" value={String(s._id)} />
                              <button className={dangerButtonClass}>Close now</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
