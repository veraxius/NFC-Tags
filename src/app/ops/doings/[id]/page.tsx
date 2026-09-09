import Link from "next/link";
import { notFound } from "next/navigation";
import { getEarthyDoingDetail } from "@/lib/earthyDoings";
import { EarthyDoingDetailView } from "@/components/EarthyDoingDetailView";

export const dynamic = "force-dynamic";

// Ops sees every status, not just the publicly-browsable ones — this is
// where "Publish/Pause/Cancel/Archive" decisions on /ops/doings get made
// from, so drafts and archived activities need to be reachable too.
export default async function OpsDoingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getEarthyDoingDetail(id);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <Link href="/ops/doings" className="text-xs font-medium text-[var(--color-pink)] hover:underline">
        ‹ Earthy Doings
      </Link>
      <EarthyDoingDetailView data={data} />
    </div>
  );
}
