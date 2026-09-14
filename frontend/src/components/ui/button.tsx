import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm",
  secondary: "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50",
  ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
