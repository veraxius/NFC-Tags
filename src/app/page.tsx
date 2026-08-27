import Link from "next/link";
import { getSessionUser, isBeaurityAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    if (isBeaurityAdmin(user)) redirect("/ops");
    if (user.partnerRoles.length > 0) redirect("/partner");
    redirect("/journey");
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
        Beaurity EarthyDoing™
      </p>
      <h1 className="mt-3 text-5xl font-bold tracking-tight text-slate-900">
        JourneyPort<span className="text-emerald-600">™</span>
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Record. Verify. Grow. Every meaningful action becomes part of your
        trusted Journey — verified through NFC, partner confirmation, and the
        AIM Trust Layer.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-800">Self-Sustainability</span>
        <span className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-rose-800">Emotional Prosperity</span>
        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-800">Environmental Equity</span>
      </div>
      <div className="mt-10 flex gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white shadow hover:bg-emerald-800"
        >
          Start your Journey
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>
      <p className="mt-16 text-xs text-slate-400">
        Beaurity JourneyPort™ — Your Trusted Journey Through Life.
      </p>
    </main>
  );
}
