import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-medium text-emerald-700">ResolveRun</p>
      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Page not found</h1>
      <p className="mt-2 text-sm text-neutral-500">That URL does not exist.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        Back to home
      </Link>
    </div>
  );
}
