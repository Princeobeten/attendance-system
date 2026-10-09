import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { closeSession, deleteSession } from "@/app/actions/sessions";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, fmtTime, sessionState } from "@/lib/format";
import { sessionReport } from "@/lib/reports";
import {
  Badge,
  Empty,
  PageHeader,
  Panel,
  Stat,
  buttonClass,
  dangerButtonClass,
  statusTone,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";

export const metadata: Metadata = { title: "Session records" };

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const report = await sessionReport(id);
  if (!report) notFound();

  const { session, rows, counts } = report;
  const state = sessionState(session);
  const marked = counts.present + counts.late;

  return (
    <>
      <PageHeader
        title={session.title}
        description={
          <>
            {session.courseCode && <>{session.courseCode} · </>}Terminal{" "}
            <span className="font-mono">{session.terminalId}</span> · {fmtDateTime(session.opensAt)} –{" "}
            {fmtTime(session.closesAt)}
            {session.lateAfterMinutes != null && <> · late after {session.lateAfterMinutes} min</>} ·{" "}
            <Link href="/sessions" className="text-indigo-600 hover:underline">
              All sessions
            </Link>
          </>
        }
        actions={
          <>
            <Badge tone={statusTone[state]}>{state}</Badge>
            {state === "open" && (
              <form action={closeSession}>
                <input type="hidden" name="sessionId" value={String(session._id)} />
                <button className={dangerButtonClass}>Close now</button>
              </form>
            )}
            {marked === 0 && (
              <form action={deleteSession}>
                <input type="hidden" name="sessionId" value={String(session._id)} />
                <button className={dangerButtonClass}>Delete</button>
              </form>
            )}
            <a href={`/api/export?session=${session._id}`} className={buttonClass}>
              Export CSV
            </a>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Present" value={counts.present} />
        <Stat label="Late" value={counts.late} />
        <Stat label="Absent" value={counts.absent} />
      </div>

      <Panel title="Register">
        {rows.length === 0 ? (
          <Empty>No users are registered yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Identifier</th>
                  <th className={thClass}>Department</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Time</th>
                  <th className={thClass}>Card presented</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={String(r.user._id)}>
                    <td className={tdClass}>
                      <Link href={`/users/${r.user._id}`} className="font-medium text-slate-900 hover:underline">
                        {r.user.fullName}
                      </Link>
                    </td>
                    <td className={`${tdClass} font-mono text-xs`}>{r.user.identifier}</td>
                    <td className={tdClass}>{r.user.department}</td>
                    <td className={tdClass}>
                      <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{r.markedAt ? fmtTime(r.markedAt) : "—"}</td>
                    <td className={`${tdClass} font-mono text-xs`}>{r.cardUid ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
