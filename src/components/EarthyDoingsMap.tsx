"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { pinSvg } from "@/lib/mapPin";

export type MappedDoing = {
  id: string;
  publicId: string;
  title: string;
  partnerName: string;
  status: string;
  startAt: string; // ISO
  lat: number;
  lng: number;
};

// Global map of every Earthy Doing that has a location on file — one pin per
// activity, always in Beaurity's own pink so the map reads as one brand, not
// a status legend. Built with Leaflet + OpenStreetMap tiles: no API key, no
// per-load cost, matches the CDN-free "bundle your own JS" rule the rest of
// this app follows.
export function EarthyDoingsMap({ doings }: { doings: MappedDoing[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([20, 0], 2.3);
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
        popupAnchor: [0, -34],
      });

      const markers: import("leaflet").Marker[] = [];
      for (const d of doings) {
        const marker = L.marker([d.lat, d.lng], { icon }).addTo(map);
        const date = new Date(d.startAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        marker.bindPopup(
          `<div style="font-family:inherit;min-width:160px">
            <p style="margin:0 0 2px;font-weight:600">${escapeHtml(d.title)}</p>
            <p style="margin:0 0 2px;font-size:12px;color:#6B625B">${escapeHtml(d.partnerName)}</p>
            <p style="margin:0 0 6px;font-size:12px;color:#6B625B">${date} &middot; ${escapeHtml(d.status)}</p>
            <a href="/ops/doings/${d.id}" style="font-size:12px;font-weight:600;color:#e6007e">View activity &rarr;</a>
          </div>`
        );
        markers.push(marker);
      }

      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 6 });
        // A hair closer than a plain fitBounds gives, same center — purely
        // a "feels a little less far away" nudge, not a real reframe.
        map.setZoom(map.getZoom() + 0.3, { animate: false });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [doings]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-[20px]" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
