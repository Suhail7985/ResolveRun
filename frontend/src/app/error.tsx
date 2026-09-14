"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-medium text-emerald-700">ResolveRun</p>
      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        The page failed to load. If this keeps happening, stop the frontend, delete the{" "}
        <code className="rounded bg-neutral-100 px-1">.next</code> folder, and run{" "}
        <code className="rounded bg-neutral-100 px-1">npm run dev:web</code> again.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium">
          Home
        </Link>
      </div>
    </div>
  );
}
