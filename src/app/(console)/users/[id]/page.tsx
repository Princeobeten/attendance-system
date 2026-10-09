import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { setCardStatus, setUserStatus } from "@/app/actions/users";
import { requireAdmin } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { Card } from "@/models/Card";
import { User } from "@/models/User";
import {
  Badge,
  Empty,
  PageHeader,
  Panel,
  dangerButtonClass,
  secondaryButtonClass,
  statusTone,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { IssueCardForm } from "./IssueCardForm";

export const metadata: Metadata = { title: "User" };

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectDb();
  const user = await User.findById(id).lean();
  if (!user) notFound();

  const [cards, records] = await Promise.all([
    Card.find({ user: user._id }).sort({ issuedAt: -1 }).lean(),
    AttendanceRecord.find({ user: user._id })
      .sort({ markedAt: -1 })
      .limit(25)
      .populate<{ session: { _id: string; title: string; courseCode?: string } | null }>(
        "session",
        "title courseCode",
      )
      .lean(),
  ]);
  const activeCard = cards.find((c) => c.status === "active");
  const isSelf = String(user._id) === admin.id;

  return (
    <>
      <PageHeader
        title={user.fullName}
        description={
          <>
            <span className="font-mono">{user.identifier}</span> · {user.department} ·{" "}
            <span className="capitalize">{user.role}</span> ·{" "}
            <Link href="/users" className="text-indigo-600 hover:underline">
              All users
            </Link>
          </>
        }
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={statusTone[user.status]}>{user.status}</Badge>
            {!isSelf && (
              <form action={setUserStatus}>
                <input type="hidden" name="userId" value={String(user._id)} />
                <input
                  type="hidden"
                  name="status"
                  value={user.status === "active" ? "suspended" : "active"}
                />
                <button className={user.status === "active" ? dangerButtonClass : secondaryButtonClass}>
                  {user.status === "active" ? "Suspend account" : "Reactivate account"}
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Panel title="Active card">
            {activeCard ? (
              <div className="space-y-4 p-5">
                <div>
                  <div className="font-mono text-lg text-slate-900">{activeCard.cardUid}</div>
                  <div className="text-xs text-slate-500">Issued {fmtDateTime(activeCard.issuedAt)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["lost", "revoked"] as const).map((status) => (
                    <form key={status} action={setCardStatus}>
                      <input type="hidden" name="cardId" value={String(activeCard._id)} />
                      <input type="hidden" name="status" value={status} />
                      <button className={dangerButtonClass}>
                        {status === "lost" ? "Report lost" : "Revoke"}
                      </button>
                    </form>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  A revoked or lost card stops working at once. It stays on record, so the attendance it
                  recorded can still be explained.
                </p>
              </div>
            ) : (
              <div className="p-5">
                <IssueCardForm userId={String(user._id)} />
              </div>
            )}
          </Panel>

          <Panel title="Card history">
            {cards.length === 0 ? (
              <Empty>No card has been issued.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cards.map((c) => (
                  <li key={String(c._id)} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <div className="font-mono text-sm">{c.cardUid}</div>
                      <div className="text-xs text-slate-500">
                        Issued {fmtDateTime(c.issuedAt)}
                        {c.revokedAt && ` · ended ${fmtDateTime(c.revokedAt)}`}
                      </div>
                    </div>
                    <Badge tone={statusTone[c.status]}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Recent attendance" className="lg:col-span-2">
          {records.length === 0 ? (
            <Empty>No attendance recorded yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Session</th>
                    <th className={thClass}>Marked</th>
                    <th className={thClass}>Card</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr key={String(r._id)}>
                      <td className={tdClass}>
                        {r.session ? (
                          <Link href={`/sessions/${r.session._id}`} className="text-indigo-700 hover:underline">
                            {r.session.title}
                          </Link>
                        ) : (
                          "Deleted session"
                        )}
                        {r.session?.courseCode && (
                          <span className="ml-2 text-xs text-slate-500">{r.session.courseCode}</span>
                        )}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{fmtDateTime(r.markedAt)}</td>
                      <td className={`${tdClass} font-mono text-xs`}>{r.cardUid}</td>
                      <td className={tdClass}>
                        <Badge tone={statusTone[r.status]}>{r.status}</Badge>
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
