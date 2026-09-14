"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
];

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              ResolveRun
            </Link>
            <p className="hidden text-sm text-slate-500 sm:block">
              Don&apos;t blindly retry what you can&apos;t prove failed.
            </p>
            <nav className="flex gap-4 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    pathname.startsWith(item.href)
                      ? "font-medium text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {email && <span className="text-slate-600">{email}</span>}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
