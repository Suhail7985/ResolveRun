import { InputHTMLAttributes, LabelHTMLAttributes } from "react";

export function Label({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="text-sm font-medium text-neutral-700" {...props}>
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-emerald-500/0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
