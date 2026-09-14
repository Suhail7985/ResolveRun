"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { api, User } from "@/lib/api";
import { postAuthPath } from "@/lib/auth-redirect";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-account";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await api<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data) router.push(postAuthPath(res.data));
    else router.push("/dashboard");
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <AuthLayout title="Sign in to ResolveRun" subtitle="Access your jobs and execution history">
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold">Reviewer demo account</p>
        <p className="mt-2 font-mono text-xs">
          Email: {DEMO_EMAIL}
          <br />
          Password: {DEMO_PASSWORD}
        </p>
        <button
          type="button"
          onClick={fillDemo}
          className="mt-3 text-xs font-medium text-emerald-800 underline"
        >
          Fill demo credentials
        </button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        No account?{" "}
        <Link href="/register" className="font-medium text-neutral-900 underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
