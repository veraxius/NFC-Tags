"use client";

import { useState } from "react";
import { OrganicCard } from "@/components/organic";

type EnrollData = { secret: string; otpauthUrl: string };

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnroll() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/auth/2fa/enroll", { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Couldn't start enrollment");
      return;
    }
    setEnroll(json.data);
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/auth/2fa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "That code didn't work");
      return;
    }
    setEnabled(true);
    setEnroll(null);
    setCode("");
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "That code didn't work");
      return;
    }
    setEnabled(false);
    setCode("");
  }

  if (enabled) {
    return (
      <OrganicCard className="p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--color-mint)]" />
          <p className="text-sm font-semibold text-[var(--color-text)]">Two-factor authentication is on</p>
        </div>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          You&#39;ll be asked for a code from your authenticator app every time you sign in.
        </p>
        <form onSubmit={disable} className="mt-5 space-y-3">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
            Enter a current code to turn it off
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            className="w-full rounded-[12px] border border-black/10 bg-white/70 px-3.5 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-[var(--color-pink)] focus:ring-2 focus:ring-[var(--color-pink)]/20"
          />
          {error && <p className="text-xs text-[var(--color-plum)]">{error}</p>}
          <button
            disabled={loading || code.length !== 6}
            className="w-full rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-black/[0.04] disabled:opacity-50"
          >
            {loading ? "Checking…" : "Turn off two-factor authentication"}
          </button>
        </form>
      </OrganicCard>
    );
  }

  if (enroll) {
    return (
      <OrganicCard className="p-6">
        <p className="text-sm font-semibold text-[var(--color-text)]">Scan or enter this key</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Add it to Google Authenticator, 1Password, or any TOTP app — paste this URL if your app accepts a link, or
          enter the key below manually.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Setup key
            </p>
            <p className="mt-1 select-all break-all rounded-[12px] bg-[var(--color-bg-alt)] px-3 py-2.5 font-mono text-sm text-[var(--color-text)]">
              {enroll.secret}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Setup link
            </p>
            <p className="mt-1 select-all break-all rounded-[12px] bg-[var(--color-bg-alt)] px-3 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
              {enroll.otpauthUrl}
            </p>
          </div>
        </div>
        <form onSubmit={confirmEnroll} className="mt-5 space-y-3">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
            Enter the 6-digit code your app is now showing
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            className="w-full rounded-[12px] border border-black/10 bg-white/70 px-3.5 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-[var(--color-pink)] focus:ring-2 focus:ring-[var(--color-pink)]/20"
          />
          {error && <p className="text-xs text-[var(--color-plum)]">{error}</p>}
          <button disabled={loading || code.length !== 6} className="btn-primary w-full disabled:opacity-50">
            {loading ? "Checking…" : "Confirm and turn on"}
          </button>
        </form>
      </OrganicCard>
    );
  }

  return (
    <OrganicCard className="p-6">
      <p className="text-sm font-semibold text-[var(--color-text)]">Two-factor authentication is off</p>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Add a second step at sign-in with any authenticator app — recommended for admin accounts.
      </p>
      {error && <p className="mt-3 text-xs text-[var(--color-plum)]">{error}</p>}
      <button onClick={startEnroll} disabled={loading} className="btn-primary mt-5 w-full disabled:opacity-50">
        {loading ? "Starting…" : "Set up two-factor authentication"}
      </button>
    </OrganicCard>
  );
}
