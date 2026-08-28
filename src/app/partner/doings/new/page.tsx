import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { createEarthyDoingAction } from "@/lib/actions";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewDoing() {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Create Earthy Doing</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">for {partner.name}</p>
      <Card className="mt-6">
        <form action={createEarthyDoingAction} className="space-y-4">
          <input type="hidden" name="partnerId" value={partner.id} />
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Title</label>
            <input name="title" required placeholder="e.g. Miami Beach Cleanup" className="w-full rounded-lg border border-[var(--color-warmgray)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
            <textarea name="description" rows={3} className="w-full rounded-lg border border-[var(--color-warmgray)] px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Category</label>
              <select name="category" className="w-full rounded-lg border border-[var(--color-warmgray)] px-3 py-2">
                <option value="environmental">Environmental</option>
                <option value="community">Community</option>
                <option value="education">Education</option>
                <option value="health">Health & Wellbeing</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Capacity (optional)</label>
              <input name="capacity" type="number" min={1} className="w-full rounded-lg border border-[var(--color-warmgray)] px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Starts</label>
              <input name="startAt" type="datetime-local" required defaultValue={`${today}T09:00`} className="w-full rounded-lg border border-[var(--color-warmgray)] px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Ends</label>
              <input name="endAt" type="datetime-local" required defaultValue={`${today}T17:00`} className="w-full rounded-lg border border-[var(--color-warmgray)] px-3 py-2" />
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">TriSilience dimensions</legend>
            <div className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="dimensions" value="SELF_SUSTAINABILITY" /> Self-Sustainability
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="dimensions" value="EMOTIONAL_PROSPERITY" /> Emotional Prosperity
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="dimensions" value="ENVIRONMENTAL_EQUITY" defaultChecked /> Environmental Equity
              </label>
            </div>
          </fieldset>
          <button className="w-full rounded-lg bg-[var(--color-pink)] py-2.5 font-semibold text-white hover:bg-[var(--color-pink-hover)]">
            Publish Earthy Doing
          </button>
        </form>
      </Card>
    </div>
  );
}
