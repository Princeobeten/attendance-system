import { logout } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { CardIcon } from "@/components/icons";
import { NavLinks } from "./NavLinks";

export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:flex md:w-60 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <CardIcon />
          </div>
          <span className="font-semibold text-slate-900">NFC Attendance</span>
        </div>
        <NavLinks />
        <div className="mt-auto hidden border-t border-slate-200 px-5 py-4 md:block">
          <div className="text-sm font-medium text-slate-900">{admin.fullName}</div>
          <div className="text-xs text-slate-500">{admin.identifier}</div>
          <form action={logout} className="mt-3">
            <button className="text-sm text-slate-600 hover:text-slate-900">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-4 py-8 sm:px-8 md:ml-60">
        <div className="mx-auto max-w-6xl">{children}</div>
        <form action={logout} className="mt-10 border-t border-slate-200 pt-4 md:hidden">
          <span className="text-sm text-slate-500">Signed in as {admin.fullName}. </span>
          <button className="text-sm font-medium text-indigo-600">Sign out</button>
        </form>
      </main>
    </div>
  );
}
