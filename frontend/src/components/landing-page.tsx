import Link from "next/link";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            ResolveRun
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#about" className="hover:text-slate-900">About</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Job automation for HTTP workloads
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Run scheduled jobs safely — know when a retry could do harm
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              <strong className="font-semibold text-slate-800">ResolveRun</strong> is a platform
              where you create HTTP jobs (API calls), run them on a schedule or on demand, and track
              every execution. Unlike basic cron tools, it distinguishes a real failure from an{" "}
              <strong className="text-amber-800">unknown outcome</strong> so you do not accidentally
              run the same payment or order twice.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Create an account
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-20 border-b border-slate-100 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">What is ResolveRun?</h2>
            <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  ResolveRun helps teams automate recurring or on-demand HTTP tasks: syncing data,
                  calling webhooks, health checks, and integrations. You define the URL, method,
                  headers, and optional cron schedule. The platform queues work, runs it on
                  background workers, and stores a full history you can audit later.
                </p>
                <p>
                  Each job has a <strong className="text-slate-800">risk level</strong> (low,
                  medium, or high). That level controls how aggressive automatic retries are when
                  something goes wrong — especially when the network drops and you cannot tell if the
                  remote server already completed the action.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
                <h3 className="font-semibold text-slate-900">Our tagline</h3>
                <p className="mt-3 text-lg font-medium italic text-slate-700">
                  &ldquo;Don&apos;t blindly retry what you can&apos;t prove failed.&rdquo;
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  A timeout is not always a failure. For important side effects, guessing wrong is
                  worse than pausing and letting a human decide.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-slate-100 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">The problem we solve</h2>
            <p className="mt-4 max-w-3xl text-slate-600">
              Many job runners treat every timeout as <span className="font-mono text-sm">FAILED</span>{" "}
              and retry automatically. That is dangerous when the request already succeeded.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-red-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase text-red-700">Naive systems</p>
                <p className="mt-2 font-medium text-slate-900">POST /payment → timeout → retry</p>
                <p className="mt-2 text-sm text-slate-600">
                  The customer may be charged twice. Logs only say &ldquo;failed&rdquo; and &ldquo;retried.&rdquo;
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase text-emerald-700">ResolveRun</p>
                <p className="mt-2 font-medium text-slate-900">POST /payment → timeout → UNKNOWN</p>
                <p className="mt-2 text-sm text-slate-600">
                  Auto-retry is blocked. You verify or explicitly choose to retry with full context.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-b border-slate-100 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Features</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Everything you need to operate HTTP jobs in one place — from creation to execution
              history.
            </p>
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Job dashboard",
                  body: "See active jobs, recent runs, failures, and executions that need your attention.",
                },
                {
                  title: "Cron scheduling",
                  body: "Run jobs on a schedule (UTC). Manual “Run now” anytime.",
                },
                {
                  title: "Real workers",
                  body: "Jobs run asynchronously via a queue — not fake UI-only simulations.",
                },
                {
                  title: "Execution timeline",
                  body: "Queued, claimed by worker, HTTP result, retries, and human-readable reasons.",
                },
                {
                  title: "Smart retries",
                  body: "Exponential backoff for transient errors; no infinite retry loops.",
                },
                {
                  title: "Verify before retry",
                  body: "Optional GET check after UNKNOWN to see if the original action already succeeded.",
                },
              ].map((item) => (
                <li key={item.title} className="rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-slate-100 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">How it works</h2>
            <ol className="mt-12 space-y-8">
              {[
                {
                  step: "1",
                  title: "Sign up and sign in",
                  body: "Create a free account. Your jobs and executions are private to your user account.",
                },
                {
                  step: "2",
                  title: "Create an HTTP job",
                  body: "Set URL, method, timeout, risk level, and optional cron schedule.",
                },
                {
                  step: "3",
                  title: "Run or schedule",
                  body: "Workers pick up queued executions and call your endpoint. Status updates in the UI.",
                },
                {
                  step: "4",
                  title: "Review outcomes",
                  body: "Succeeded, failed with retry policy, or UNKNOWN with a clear explanation and next steps.",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-6">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
                    aria-hidden
                  >
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-slate-600">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Ready to try ResolveRun?</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Sign up in seconds. Use built-in demo endpoints to see success, retries, and UNKNOWN
              behavior without touching production APIs.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-slate-900 px-8 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Get started — it&apos;s free
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 px-8 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:flex-row md:justify-between">
          <div>
            <p className="font-bold text-slate-900">ResolveRun</p>
            <p className="mt-2 max-w-sm text-sm text-slate-600">
              Reliable HTTP job automation with honest failure handling.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <p className="font-semibold text-slate-900">Product</p>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li><a href="#about" className="hover:text-slate-900">About</a></li>
                <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-slate-900">How it works</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Account</p>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li><Link href="/login" className="hover:text-slate-900">Sign in</Link></li>
                <li><Link href="/register" className="hover:text-slate-900">Sign up</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-4 text-center text-xs text-slate-500">
          © 2026 ResolveRun. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
