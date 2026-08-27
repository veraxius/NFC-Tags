"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
        consentTerms: form.get("consentTerms") === "on",
        consentDataProcessing: form.get("consentDataProcessing") === "on",
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Registration failed");
      return;
    }
    router.push("/journey");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Create your Journey identity</h1>
      <p className="mt-1 text-sm text-slate-500">
        Record. Verify. Grow. — Beaurity JourneyPort™
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
            <input name="firstName" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
            <input name="lastName" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password (min. 8 characters)</label>
          <input name="password" type="password" minLength={8} required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" name="consentTerms" required className="mt-1" />
          I accept the JourneyPort Terms of Service (v1.0).
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" name="consentDataProcessing" required className="mt-1" />
          I consent to the processing of my participation data to create and
          verify my Journey Milestones (v1.0).
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-emerald-700 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create my JourneyPort"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-500">
        Already a member?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
