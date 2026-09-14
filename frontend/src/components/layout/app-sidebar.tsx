"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAndLeave } from "@/lib/session";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "◫" },
  { href: "/jobs", label: "Jobs", icon: "⚙" },
  { href: "/executions", label: "Executions", icon: "↻" },
  { href: "/profile", label: "Profile", icon: "◎" },
];

export function AppSidebar({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    await logoutAndLeave();
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-800 bg-neutral-950 text-neutral-100 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center border-b border-neutral-800 px-5">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            ResolveRun
          </Link>
        </div>
        <p className="px-5 py-3 text-xs leading-relaxed text-neutral-500">
          Don&apos;t blindly retry what you can&apos;t prove failed.
        </p>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-neutral-800 font-medium text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                }`}
              >
                <span className="text-xs opacity-70" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-800 p-4">
          <p className="truncate text-xs text-neutral-500">{email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <span className="font-semibold">ResolveRun</span>
        </header>
        <main className="flex-1 p-4 md:p-8 lg:max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
