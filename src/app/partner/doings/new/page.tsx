import { requireUser } from "@/lib/auth";
import { resolvePartnerFor } from "@/lib/partner";
import { createEarthyDoingAction } from "@/lib/actions";
import { OrganicCard, Headline } from "@/components/organic";

export const dynamic = "force-dynamic";

export default async function NewDoing() {
  const user = await requireUser();
  const partner = await resolvePartnerFor(user);
  const today = new Date().toISOString().slice(0, 10);
  const inputClass =
    "w-full rounded-2xl border border-[var(--color-warmgray)] px-3 py-2 focus:border-[var(--color-pink)] focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-[var(--color-text-secondary)]";

  return (
    <div className="mx-auto max-w-xl">
      <Headline className="text-3xl">Create an Earthy Doing</Headline>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">for {partner.name}</p>
      <OrganicCard className="mt-6 p-6">
        <form action={createEarthyDoingAction} className="space-y-4">
          <input type="hidden" name="partnerId" value={partner.id} />
          <div>
            <label className={labelClass}>What&apos;s it called?</label>
            <input name="title" required placeholder="e.g. Miami Beach Cleanup" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tell people what to expect</label>
            <textarea name="description" rows={3} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" className={inputClass}>
                <option value="environmental">Environmental</option>
                <option value="community">Community</option>
                <option value="education">Education</option>
                <option value="health">Health & Wellbeing</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Spots available (optional)</label>
              <input name="capacity" type="number" min={1} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Starts</label>
              <input
                name="startAt"
                type="datetime-local"
                required
                defaultValue={`${today}T09:00`}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ends</label>
              <input
                name="endAt"
                type="datetime-local"
                required
                defaultValue={`${today}T17:00`}
                className={inputClass}
              />
            </div>
          </div>
          <fieldset>
            <legend className={labelClass}>What kind of impact is this?</legend>
            <div className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="dimensions" value="SELF_SUSTAINABILITY" className="accent-[var(--color-pink)]" />
                Self-Sustainability — growth, health, resilience
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="dimensions" value="EMOTIONAL_PROSPERITY" className="accent-[var(--color-pink)]" />
                Emotional Prosperity — connection, community
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="dimensions"
                  value="ENVIRONMENTAL_EQUITY"
                  defaultChecked
                  className="accent-[var(--color-pink)]"
                />
                Environmental Equity — protecting and restoring
              </label>
            </div>
          </fieldset>
          <button className="w-full rounded-full bg-[var(--color-pink)] py-2.5 font-semibold text-white hover:bg-[var(--color-pink-hover)]">
            Publish it
          </button>
        </form>
      </OrganicCard>
    </div>
  );
}
