import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { Badge, Card, Table, DimensionBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

// TRS 42 — SCREEN 03 MEMBER DETAIL
// Tabs: PROFILE | JOURNEY | DEVICES | VERIFICATIONS | CONSENT | AUDIT
// "Administrators SHALL see only data appropriate to their permissions" —
// and administrative access to personal information is itself logged
// (Architecture doc §15).

const TABS = ["profile", "journey", "devices", "verifications", "consent", "audit"] as const;
type Tab = (typeof TABS)[number];

export default async function MemberDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await requireUser();
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "profile";

  const member = await db.user.findFirst({
    where: { OR: [{ id }, { journeyIdentity: { publicId: id } }] },
    include: {
      journeyIdentity: true,
      devices: { orderBy: { createdAt: "desc" } },
      consents: { orderBy: { createdAt: "desc" } },
      privacyPreferences: true,
    },
  });
  if (!member) notFound();

  // Architecture doc §15: "Administrative access to personal information
  // should itself be logged."
  await audit({
    actorType: isSuperAdmin(admin) ? "super_admin" : "beaurity_admin",
    actorId: admin.id,
    action: "admin.member_record_accessed",
    objectType: "user",
    objectId: member.id,
    reason: `tab:${tab}`,
  });

  const [milestones, participations, verifications, auditEvents] = await Promise.all([
    tab === "journey"
      ? db.journeyMilestone.findMany({
          where: { userId: member.id },
          orderBy: { earnedAt: "desc" },
          include: { earthyDoing: { include: { partner: true, classifications: true } } },
        })
      : Promise.resolve([]),
    tab === "journey"
      ? db.participation.findMany({
          where: { userId: member.id },
          orderBy: { checkInAt: "desc" },
          include: { earthyDoing: true },
        })
      : Promise.resolve([]),
    tab === "verifications"
      ? db.verification.findMany({
          where: { participation: { userId: member.id } },
          orderBy: { createdAt: "desc" },
          include: {
            participation: { include: { earthyDoing: true } },
            aimAssessment: true,
          },
        })
      : Promise.resolve([]),
    tab === "audit"
      ? db.auditEvent.findMany({
          where: {
            OR: [
              { actorId: member.id },
              { objectType: "user", objectId: member.id },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ops/members" className="text-[13px] font-medium text-[var(--color-pink)] hover:underline">
          ‹ Members
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            {member.displayName ?? `${member.firstName} ${member.lastName}`}
          </h1>
          <Badge status={member.status} />
        </div>
        <p className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
          {member.journeyIdentity?.publicId}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/ops/members/${id}?tab=${t}`}
            className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
              t === tab
                ? "border-[var(--color-pink)] bg-[var(--color-pink)] text-white"
                : "border-black/10 text-[var(--color-text)] hover:bg-black/[0.04]"
            }`}
          >
            {t.toUpperCase()}
          </Link>
        ))}
      </nav>

      {tab === "profile" && (
        <Card title="Profile">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <dt className="text-[var(--color-text-secondary)]">Journey ID</dt>
            <dd className="font-mono">{member.journeyIdentity?.publicId ?? "—"}</dd>
            <dt className="text-[var(--color-text-secondary)]">Email</dt>
            <dd>
              {member.email}{" "}
              {member.emailVerified ? (
                <span className="text-[var(--color-mint-ink)]">✓ verified</span>
              ) : (
                <span className="text-[var(--color-gold-ink)]">unverified</span>
              )}
            </dd>
            <dt className="text-[var(--color-text-secondary)]">Joined</dt>
            <dd>{member.createdAt.toLocaleString()}</dd>
            <dt className="text-[var(--color-text-secondary)]">Last login</dt>
            <dd>{member.lastLoginAt?.toLocaleString() ?? "—"}</dd>
            <dt className="text-[var(--color-text-secondary)]">Platform role</dt>
            <dd>{member.platformRole}</dd>
            <dt className="text-[var(--color-text-secondary)]">Profile visibility</dt>
            <dd>{member.journeyIdentity?.profileVisibility ?? "—"}</dd>
          </dl>
        </Card>
      )}

      {tab === "journey" && (
        <div className="space-y-5">
          <Card title="Verified milestones">
            {milestones.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No milestones yet.</p>
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium">{m.earthyDoing.title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {m.earthyDoing.partner.name} · {m.earnedAt.toLocaleDateString()}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.earthyDoing.classifications.map((c) => (
                          <DimensionBadge key={c.id} dimension={c.dimension} />
                        ))}
                      </div>
                    </div>
                    <Badge status={m.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="All participations">
            {participations.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No participations recorded.</p>
            ) : (
              <ul className="divide-y divide-black/[0.05] text-sm">
                {participations.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {p.earthyDoing.title}
                      <span className="ml-2 font-mono text-xs text-[var(--color-text-secondary)]">{p.publicId}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      {p.checkInAt.toLocaleDateString()}
                      <Badge status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "devices" && (
        <Table headers={["Device ID", "Type", "Status", "Issued", "Activated", "Last tap"]}>
          {member.devices.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-2.5 font-mono text-xs font-semibold">{d.publicDeviceId}</td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{d.deviceType}</td>
              <td className="px-4 py-2.5"><Badge status={d.status} /></td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{d.issuedAt?.toLocaleDateString() ?? "—"}</td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{d.activatedAt?.toLocaleDateString() ?? "—"}</td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{d.lastUsedAt?.toLocaleString() ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "verifications" && (
        <Table headers={["Earthy Doing", "Status", "AIM", "Created", "Verified"]}>
          {verifications.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-2.5">
                <Link href={`/ops/verifications/${v.id}`} className="text-[var(--color-pink)] hover:underline">
                  {v.participation.earthyDoing.title}
                </Link>
              </td>
              <td className="px-4 py-2.5"><Badge status={v.status} /></td>
              <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                {v.aimAssessment
                  ? `${v.aimAssessment.assessmentResult} · ${((v.aimAssessment.confidence ?? 0) * 100).toFixed(0)}%`
                  : "—"}
              </td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{v.createdAt.toLocaleDateString()}</td>
              <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{v.verifiedAt?.toLocaleDateString() ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "consent" && (
        <div className="space-y-5">
          <Card title="Consent history (append-only)">
            {member.consents.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No consent records.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {member.consents.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <Badge status={c.granted ? "active" : "revoked"} />
                    <span className="font-medium">{c.consentType}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      v{c.policyVersion} · {c.createdAt.toLocaleString()} · via {c.source}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Privacy preferences">
            {member.privacyPreferences.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">Defaults in effect.</p>
            ) : (
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {member.privacyPreferences.map((p) => (
                  <div key={p.id} className="contents">
                    <dt className="text-[var(--color-text-secondary)]">{p.key}</dt>
                    <dd>{p.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </div>
      )}

      {tab === "audit" && (
        <Table headers={["Time", "Actor", "Action", "Object", "Reason"]}>
          {auditEvents.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap px-4 py-2 text-xs text-[var(--color-text-secondary)]">
                {e.createdAt.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-xs">{e.actorType}</td>
              <td className="px-4 py-2 font-mono text-xs font-medium">{e.action}</td>
              <td className="px-4 py-2 text-xs text-[var(--color-text-secondary)]">{e.objectType}</td>
              <td className="px-4 py-2 text-xs text-[var(--color-text-secondary)]">{e.reason ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
