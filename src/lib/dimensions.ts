// TriSilience dimension labels — kept in a plain (non "use client") module
// so Server Components can import them directly. Importing a plain data
// constant from src/components/ui.tsx (a "use client" file) into a Server
// Component silently resolves to undefined across the client boundary —
// components in ui.tsx that need this (e.g. DimensionBadge) still import
// it from here too, so there is exactly one definition.
export const DIMENSION_LABELS: Record<string, string> = {
  SELF_SUSTAINABILITY: "Self-Sustainability",
  EMOTIONAL_PROSPERITY: "Emotional Prosperity",
  ENVIRONMENTAL_EQUITY: "Environmental Equity",
};
