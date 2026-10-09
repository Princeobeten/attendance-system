import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { parseRange, rangeReport } from "@/lib/reports";
import { Session } from "@/models/Session";
import {
  Empty,
  Field,
  PageHeader,
  Panel,
  buttonClass,
  inputClass,
  secondaryButtonClass,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requireAdmin();
  const filter = parseRange(await searchParams);
  const { sessions, rows, total } = await rangeReport(filter);
  const courses = (await Session.distinct("courseCode")).filter(Boolean).sort();

  const query = new URLSearchParams();
  if (filter.courseCode) query.set("course", filter.courseCode);
  if (filter.from) query.set("from", filter.from);
  if (filter.to) query.set("to", filter.to);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Attendance per user across every session for a course, a date range, or both."
        actions={
          <a href={`/api/export?${query}`} className={buttonClass}>
            Export CSV
          </a>
        }
      />

      <Panel className="mb-6">
        <form className="grid gap-4 p-5 sm:grid-cols-4 sm:items-end">
          <Field label="Course" htmlFor="course">
            <select id="course" name="course" defaultValue={filter.courseCode ?? ""} className={inputClass}>
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From" htmlFor="from">
            <input id="from" name="from" type="date" defaultValue={filter.from} className={inputClass} />
          </Field>
          <Field label="To" htmlFor="to">
            <input id="to" name="to" type="date" defaultValue={filter.to} className={inputClass} />
          </Field>
          <div className="flex gap-2">
            <button className={buttonClass}>Apply</button>
            <Link href="/reports" className={secondaryButtonClass}>
              Reset
            </Link>
          </div>
        </form>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={`Attendance summary · ${total} session${total === 1 ? "" : "s"}`} className="lg:col-span-2">
          {total === 0 ? (
            <Empty>No sessions match this filter.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>Identifier</th>
                    <th className={`${thClass} text-right`}>Present</th>
                    <th className={`${thClass} text-right`}>Late</th>
                    <th className={`${thClass} text-right`}>Absent</th>
                    <th className={`${thClass} text-right`}>Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={String(r.user._id)}>
                      <td className={tdClass}>
                        <Link href={`/users/${r.user._id}`} className="font-medium text-slate-900 hover:underline">
                          {r.user.fullName}
                        </Link>
                        <div className="text-xs text-slate-500">{r.user.department}</div>
                      </td>
                      <td className={`${tdClass} font-mono text-xs`}>{r.user.identifier}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{r.present}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{r.late}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{r.absent}</td>
                      <td className={`${tdClass} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                            <div
                              className={`h-full ${r.percent >= 75 ? "bg-emerald-500" : r.percent >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${r.percent}%` }}
                            />
                          </div>
                          <span className="w-10 tabular-nums">{r.percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Sessions included" className="self-start">
          {sessions.length === 0 ? (
            <Empty>None.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={String(s._id)}>
                  <Link href={`/sessions/${s._id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">{s.title}</div>
                    <div className="text-xs text-slate-500">
                      {s.courseCode ? `${s.courseCode} · ` : ""}
                      {fmtDateTime(s.opensAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
