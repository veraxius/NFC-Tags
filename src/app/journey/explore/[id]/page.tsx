import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEarthyDoingDetail, PUBLICLY_VISIBLE_STATUSES } from "@/lib/earthyDoings";
import { EarthyDoingDetailView } from "@/components/EarthyDoingDetailView";

export const dynamic = "force-dynamic";

export default async function JourneyExploreDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const data = await getEarthyDoingDetail(id);
  if (!data || !PUBLICLY_VISIBLE_STATUSES.includes(data.doing.status)) notFound();

  return (
    <div className="space-y-4">
      <Link href="/journey/explore" className="text-xs font-medium text-[var(--color-pink)] hover:underline">
        ‹ Explore
      </Link>
      <EarthyDoingDetailView data={data} />
    </div>
  );
}
