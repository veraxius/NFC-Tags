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

  const inputClass =
    "w-full rounded-[12px] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] text-[var(--color-text)] outline-none transition-shadow focus:border-[var(--color-pink)] focus:ring-2 focus:ring-[var(--color-pink)]/20";
  const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--color-text)]";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="glass w-full max-w-md p-10">
        <Link href="/" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
          ‹ JourneyPort™
        </Link>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Create your Journey identity
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Record. Verify. Grow. — Beaurity JourneyPort™
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>First name</label>
              <input name="firstName" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input name="lastName" required className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Password (min. 8 characters)</label>
            <input name="password" type="password" minLength={8} required className={inputClass} />
          </div>
          <label className="flex items-start gap-2 text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
            <input type="checkbox" name="consentTerms" required className="mt-1 accent-[var(--color-pink)]" />
            I accept the JourneyPort Terms of Service (v1.0).
          </label>
          <label className="flex items-start gap-2 text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
            <input type="checkbox" name="consentDataProcessing" required className="mt-1 accent-[var(--color-pink)]" />
            I consent to the processing of my participation data to create and
            verify my Journey Milestones (v1.0).
          </label>
          {error && <p className="text-[13px] text-[var(--color-plum)]">{error}</p>}
          <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? "Creating…" : "Create my JourneyPort"}
          </button>
        </form>
        <p className="mt-6 text-[13px] text-[var(--color-text-secondary)]">
          Already a member?{" "}
          <Link href="/login" className="font-medium text-[var(--color-pink)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
