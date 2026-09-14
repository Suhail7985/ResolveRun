import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ResolveRun",
    template: "%s · ResolveRun",
  },
  description:
    "ResolveRun — Don't blindly retry what you can't prove failed. HTTP job automation with UNKNOWN outcome handling.",
  applicationName: "ResolveRun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
