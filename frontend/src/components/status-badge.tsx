const styles: Record<string, string> = {
  QUEUED: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  RUNNING: "bg-blue-50 text-blue-800 ring-blue-200",
  SUCCEEDED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FAILED: "bg-red-50 text-red-800 ring-red-200",
  UNKNOWN: "bg-amber-50 text-amber-900 ring-amber-300",
  VERIFYING: "bg-violet-50 text-violet-800 ring-violet-200",
  RETRYING: "bg-orange-50 text-orange-800 ring-orange-200",
  CANCELLED: "bg-neutral-100 text-neutral-500 ring-neutral-200",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = styles[status] ?? styles.QUEUED;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status === "UNKNOWN" ? "⚠ UNKNOWN" : status}
    </span>
  );
}
