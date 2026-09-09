"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { pinSvg } from "@/lib/mapPin";

// A read-only, single-pin map for an Earthy Doing's detail view — same pin,
// same tiles as the picker and the global map, just nothing to drag or search.
export function SingleLocationMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([lat, lng], 14);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: pinSvg(),
        className: "",
        iconSize: [30, 40],
        iconAnchor: [15, 38],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(map);
      if (label) marker.bindPopup(label);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label]);

  return <div ref={containerRef} className="h-64 w-full rounded-2xl" />;
}
