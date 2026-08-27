import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth";
import { Card, Table, Badge } from "@/components/ui";
import { CONFIG_VERSION, MODEL_VERSION, SIGNAL_WEIGHTS, THRESHOLDS } from "@/lib/aim/config";

export const dynamic = "force-dynamic";

// TRS 39 — SYSTEM. Platform configuration surface: verification policies,
// the AIM configuration in force, TriSilience taxonomy, and role definitions
// (TRS §38). Read-only here — changing security-relevant configuration is a
// Super Administrator action and is not exposed as a one-click control.

export default async function OpsSystem() {
  const session = await requireUser();

  const [policies, dimensionCounts, roleCounts, partnerUserCounts] = await Promise.all([
    db.verificationPolicy.findMany({ orderBy: { createdAt: "asc" } }),
    db.triSilienceClassification.groupBy({ by: ["dimension"], _count: true }),
    db.user.groupBy({ by: ["platformRole"], _count: true }),
    db.partnerUser.groupBy({ by: ["role"], _count: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">System</h1>
        <p className="mt-1 text-sm text-[#86868b]">
          Platform configuration in force. Signed in as{" "}
          <span className="font-medium">{session.platformRole}</span>.
        </p>
      </div>

      <Card title="Verification policies">
        <p className="mb-3 text-xs text-[#86868b]">
          The verification model is configurable rather than hard-coded
          (Architecture doc §11). Each Earthy Doing references a policy.
        </p>
        <Table headers={["Policy", "Version", "NFC", "Partner confirm", "AIM", "Default"]}>
          {policies.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2.5">
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 font-mono text-xs text-[#86868b]">{p.publicId}</span>
              </td>
              <td className="px-4 py-2.5 text-[#86868b]">{p.version}</td>
              <td className="px-4 py-2.5">{p.requiresNfc ? "required" : "optional"}</td>
              <td className="px-4 py-2.5">{p.requiresPartnerConfirm ? "required" : "optional"}</td>
              <td className="px-4 py-2.5">{p.requiresAim ? "required" : "optional"}</td>
              <td className="px-4 py-2.5">
                {p.isDefault ? <Badge status="active" /> : <span className="text-[#86868b]">—</span>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="AIM Trust Layer configuration">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-[#86868b]">Config version</dt>
          <dd className="font-mono">{CONFIG_VERSION}</dd>
          <dt className="text-[#86868b]">Model version</dt>
          <dd className="font-mono">{MODEL_VERSION}</dd>
          <dt className="text-[#86868b]">Credible threshold</dt>
          <dd>confidence ≥ {THRESHOLDS.credible}</dd>
          <dt className="text-[#86868b]">Not credible threshold</dt>
          <dd>confidence ≤ {THRESHOLDS.notCredible}</dd>
        </dl>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#86868b]">
            Supported signals and weights
          </p>
          <ul className="space-y-1 text-sm">
            {Object.entries(SIGNAL_WEIGHTS).map(([signal, weight]) => (
              <li key={signal} className="flex justify-between border-b border-black/[0.05] py-1">
                <span className="font-mono text-xs">{signal}</span>
                <span className="text-[#86868b]">{weight}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#86868b]">
            AIM assesses the credibility of an event claim — never a person&apos;s
            human value (TRS §47).
          </p>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="TriSilience taxonomy">
          <ul className="space-y-2 text-sm">
            {["SELF_SUSTAINABILITY", "EMOTIONAL_PROSPERITY", "ENVIRONMENTAL_EQUITY"].map((d) => {
              const row = dimensionCounts.find((c) => c.dimension === d);
              return (
                <li key={d} className="flex justify-between border-b border-black/[0.05] py-1">
                  <span>{d.replace(/_/g, " ")}</span>
                  <span className="text-[#86868b]">
                    {row?._count ?? 0} classified activities
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Roles in use">
          <ul className="space-y-2 text-sm">
            {roleCounts.map((r) => (
              <li
                key={r.platformRole}
                className="flex justify-between border-b border-black/[0.05] py-1"
              >
                <span className="font-mono text-xs">{r.platformRole}</span>
                <span className="text-[#86868b]">{r._count} users</span>
              </li>
            ))}
            {partnerUserCounts.map((r) => (
              <li key={r.role} className="flex justify-between border-b border-black/[0.05] py-1">
                <span className="font-mono text-xs">partner_{r.role}</span>
                <span className="text-[#86868b]">{r._count} assignments</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {!isSuperAdmin(session) && (
        <p className="text-xs text-[#86868b]">
          Security policies, API configuration and role definitions are managed
          by a Super Administrator (TRS §4.5).
        </p>
      )}
    </div>
  );
}
