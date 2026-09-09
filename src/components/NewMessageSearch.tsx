"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";

type Person = {
  id: string;
  displayName: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  avatarPosition: string | null;
};

// The "New message" search box on the inbox — type a name, get a live
// dropdown of matching people, click through to their profile to send the
// first message. Same debounced-fetch shape as LocationPicker.
export function NewMessageSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/internal/users/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data?.people ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-pink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-pink-hover)]"
      >
        + New message
      </button>
    );
  }

  return (
    <div className="relative w-64 shrink-0 sm:w-72">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search people by name…"
        className="w-full rounded-full border border-[var(--color-warmgray)] bg-white px-4 py-2.5 text-sm focus:border-[var(--color-pink)] focus:outline-none"
      />
      {loading && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">…</span>
      )}
      {query.trim().length >= 2 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[var(--color-warmgray)] bg-white shadow-lg">
          {results.length === 0 && !loading ? (
            <li className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">No one found.</li>
          ) : (
            results.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/profile/${p.id}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--color-bg-alt)]"
                >
                  <Avatar src={p.avatarUrl} position={p.avatarPosition} name={p.displayName ?? p.firstName} size={28} />
                  {p.displayName ?? `${p.firstName} ${p.lastName}`}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
