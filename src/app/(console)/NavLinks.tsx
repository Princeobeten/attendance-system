"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/users", label: "Users & cards" },
  { href: "/sessions", label: "Sessions" },
  { href: "/reports", label: "Reports" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? "page" : undefined}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
            isActive(l.href)
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <a
        href="/terminal"
        target="_blank"
        className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      >
        Open terminal ↗
      </a>
    </nav>
  );
}
