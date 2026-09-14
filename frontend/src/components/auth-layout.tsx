import Link from "next/link";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-neutral-950 p-12 text-white lg:flex">
        <Link href="/" className="text-lg font-semibold">ResolveRun</Link>
        <div>
          <p className="text-3xl font-semibold leading-snug">
            Job automation with honest failure handling
          </p>
          <p className="mt-4 text-neutral-400">
            When a timeout might mean success, we mark it{" "}
            <span className="text-amber-400">UNKNOWN</span> — not a blind retry.
          </p>
        </div>
        <p className="text-sm text-neutral-600">© ResolveRun</p>
      </div>
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <Link href="/" className="mb-8 text-sm text-neutral-500 hover:text-neutral-900 lg:hidden">
          ← Back to home
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
