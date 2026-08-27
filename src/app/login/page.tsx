"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Login failed");
      return;
    }
    router.push(params.get("next") ?? "/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="glass w-full max-w-md p-10">
        <Link href="/" className="text-[13px] font-medium text-[#0071e3] hover:underline">
          ‹ JourneyPort™
        </Link>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
          Sign in to JourneyPort™
        </h1>
        <p className="mt-1 text-[15px] text-[#86868b]">Your Trusted Journey Through Life.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#1d1d1f]">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-[12px] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] text-[#1d1d1f] outline-none transition-shadow focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#1d1d1f]">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-[12px] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] text-[#1d1d1f] outline-none transition-shadow focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
            />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-[13px] text-[#86868b]">
          New to JourneyPort?{" "}
          <Link href="/register" className="font-medium text-[#0071e3] hover:underline">
            Create your Journey identity
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
