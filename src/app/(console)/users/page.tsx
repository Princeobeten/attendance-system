import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Card } from "@/models/Card";
import { User } from "@/models/User";
import {
  Badge,
  Empty,
  PageHeader,
  Panel,
  buttonClass,
  inputClass,
  secondaryButtonClass,
  statusTone,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";

export const metadata: Metadata = { title: "Users & cards" };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  await requireAdmin();
  const { q } = await searchParams;
  const search = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  await connectDb();
  const filter = search
    ? {
        $or: ["fullName", "identifier", "department"].map((f) => ({
          [f]: { $regex: escapeRegex(search), $options: "i" },
        })),
      }
    : {};
  const users = await User.find(filter).sort({ fullName: 1 }).limit(500).lean();
  const cards = await Card.find({ status: "active", user: { $in: users.map((u) => u._id) } }).lean();
  const cardByUser = new Map(cards.map((c) => [String(c.user), c]));

  return (
    <>
      <PageHeader
        title="Users & cards"
        description="Everyone on the register and the card each one holds."
        actions={
          <Link href="/users/new" className={buttonClass}>
            Register user
          </Link>
        }
      />

      <Panel>
        <form className="flex gap-2 border-b border-slate-200 px-5 py-3">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search by name, identifier or department"
            aria-label="Search users"
            className={`${inputClass} max-w-md`}
          />
          <button className={secondaryButtonClass}>Search</button>
        </form>

        {users.length === 0 ? (
          <Empty>
            {search ? `No user matches “${search}”.` : "No users yet. Register the first one."}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Identifier</th>
                  <th className={thClass}>Department</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Card</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const card = cardByUser.get(String(u._id));
                  return (
                    <tr key={String(u._id)} className="hover:bg-slate-50">
                      <td className={tdClass}>
                        <Link href={`/users/${u._id}`} className="font-medium text-indigo-700 hover:underline">
                          {u.fullName}
                        </Link>
                      </td>
                      <td className={`${tdClass} font-mono text-xs`}>{u.identifier}</td>
                      <td className={tdClass}>{u.department}</td>
                      <td className={`${tdClass} capitalize`}>{u.role}</td>
                      <td className={tdClass}>
                        {card ? (
                          <span className="font-mono text-xs">{card.cardUid}</span>
                        ) : (
                          <span className="text-xs text-slate-400">No card</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        <Badge tone={statusTone[u.status]}>{u.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
