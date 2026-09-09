"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { pinSvg } from "@/lib/mapPin";

type Suggestion = { displayName: string; shortName: string; lat: number; lng: number };
type Picked = { name: string; address: string; lat: number; lng: number };

// Search-anywhere-in-the-world location picker: type an address, pick a
// suggestion (via OpenStreetMap's free Nominatim geocoder — no API key), see
// the pin drop on a live map, then drag it to the exact spot. Everything the
// server needs travels as hidden inputs on the enclosing form, so this stays
// a normal progressive form submit — no client-side fetch to save.
export function LocationPicker({
  namePrefix = "location",
  defaultTimezone,
}: {
  namePrefix?: string;
  defaultTimezone?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [timezone, setTimezone] = useState(defaultTimezone ?? "");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);

  // Best-effort default: the browser's own timezone. Just a starting point —
  // the venue may be elsewhere, so it stays a plain editable text field.
  useEffect(() => {
    if (!defaultTimezone) {
      try {
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      } catch {
        setTimezone("UTC");
      }
    }
  }, [defaultTimezone]);

  // Selecting a suggestion fills the search box with its full address (so
  // the field shows what was actually picked) — but that's a programmatic
  // change to `query`, not a new thing the user is typing, so it must not
  // re-trigger a search and pop the dropdown back open a moment later.
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(query)}`,
          { headers: { Accept: "application/json" } }
        );
        const data: { display_name: string; lat: string; lon: string }[] = await res.json();
        setSuggestions(
          data.map((r) => ({
            displayName: r.display_name,
            shortName: r.display_name.split(",")[0],
            lat: Number(r.lat),
            lng: Number(r.lon),
          }))
        );
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function choose(s: Suggestion) {
    setPicked({ name: s.shortName, address: s.displayName, lat: s.lat, lng: s.lng });
    skipNextSearchRef.current = true;
    setQuery(s.displayName);
    setSuggestions([]);
    setOpen(false);
  }

  // Mount the map only once a location is picked, then keep it alive across
  // re-picks — smoother than tearing it down and rebuilding on every choice.
  useEffect(() => {
    if (!picked || !mapContainerRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;

      const icon = L.divIcon({
        html: pinSvg(),
        className: "",
        iconSize: [30, 40],
        iconAnchor: [15, 38],
      });

      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current, { scrollWheelZoom: true }).setView([picked.lat, picked.lng], 15);
        mapRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([picked.lat, picked.lng], { icon, draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          setPicked((prev) => (prev ? { ...prev, lat, lng } : prev));
        });
        markerRef.current = marker;
      } else {
        mapRef.current.flyTo([picked.lat, picked.lng], 15, { duration: 0.6 });
        markerRef.current?.setLatLng([picked.lat, picked.lng]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run the mount/fly logic when the picked *place* changes, not on
    // every pixel of a drag (that's handled by the marker itself above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.name]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const inputClass =
    "w-full rounded-2xl border border-[var(--color-warmgray)] px-3 py-2 focus:border-[var(--color-pink)] focus:outline-none";

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search an address, place, or city — anywhere"
          className={inputClass}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">
            Searching…
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[var(--color-warmgray)] bg-white shadow-lg">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(s)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-alt)]"
                >
                  <p className="font-medium text-[var(--color-text)]">{s.shortName}</p>
                  <p className="truncate text-xs text-[var(--color-text-secondary)]">{s.displayName}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {picked && (
        <div className="space-y-2">
          <div
            ref={mapContainerRef}
            className="h-64 w-full overflow-hidden rounded-2xl border border-[var(--color-warmgray)] transition-opacity duration-300"
          />
          <p className="text-xs text-[var(--color-text-secondary)]">
            Not quite right? Drag the pin to the exact spot — it saves the new position.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Location name</label>
              <input
                name={`${namePrefix}Name`}
                value={picked.name}
                onChange={(e) => setPicked({ ...picked, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Timezone</label>
              <input
                name={`${namePrefix}Timezone`}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <input type="hidden" name={`${namePrefix}Address`} value={picked.address} />
          <input type="hidden" name={`${namePrefix}Lat`} value={picked.lat} />
          <input type="hidden" name={`${namePrefix}Lng`} value={picked.lng} />
        </div>
      )}
    </div>
  );
}
