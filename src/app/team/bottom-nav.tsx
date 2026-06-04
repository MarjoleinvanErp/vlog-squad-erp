"use client";

import Link, { useLinkStatus } from "next/link";

export type TeamTab = "map" | "quests" | "feed" | "ranking";

const ITEMS: { key: TeamTab; label: string; href: string }[] = [
  { key: "map", label: "Map", href: "/team/map" },
  { key: "quests", label: "Quests", href: "/team/quests" },
  { key: "feed", label: "Feed", href: "/team/feed" },
  { key: "ranking", label: "Ranking", href: "/team/ranking" },
];

function NavLabel({ label, active }: { label: string; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`relative inline-block ${
        active ? "text-pink" : "text-fg-muted"
      } ${pending ? "opacity-60" : ""}`}
    >
      {label}
      {pending && (
        <span
          aria-hidden
          className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 animate-pulse rounded-full bg-pink"
        />
      )}
    </span>
  );
}

export function TeamBottomNav({
  active,
  fixed = false,
}: {
  active: TeamTab;
  fixed?: boolean;
}) {
  const base = "grid grid-cols-4 border-t border-border bg-bg-card";
  const cls = fixed
    ? `${base} fixed inset-x-0 bottom-0 mx-auto max-w-md z-30`
    : base;
  return (
    <nav
      className={cls}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {ITEMS.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          prefetch
          className="py-5 text-center text-xs font-bold uppercase tracking-widest transition-colors active:bg-pink/15"
          style={{ touchAction: "manipulation" }}
        >
          <NavLabel label={it.label} active={active === it.key} />
        </Link>
      ))}
    </nav>
  );
}
