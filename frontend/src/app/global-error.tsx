"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">ResolveRun failed to load</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Stop the frontend, delete frontend/.next, then run npm run dev:web.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
