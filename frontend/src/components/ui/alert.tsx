type Tone = "info" | "warning" | "error" | "success";

const tone: Record<Tone, string> = {
  info: "border-neutral-200 bg-neutral-50 text-neutral-800",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  error: "border-red-200 bg-red-50 text-red-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function Alert({
  children,
  variant = "info",
  title,
}: {
  children: React.ReactNode;
  variant?: Tone;
  title?: string;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tone[variant]}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
