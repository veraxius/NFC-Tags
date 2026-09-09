import { db } from "./db";

// A Location is scoped to one partner and optionally carries coordinates —
// coordinates are what let an Earthy Doing show up on the global map. Kept
// deliberately tiny: creation only, no update/delete yet, since the only
// caller today is "pick a spot while creating an Earthy Doing."
export async function createLocation(params: {
  partnerId: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
}) {
  return db.location.create({
    data: {
      partnerId: params.partnerId,
      name: params.name,
      address: params.address ?? null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      timezone: params.timezone,
    },
  });
}
