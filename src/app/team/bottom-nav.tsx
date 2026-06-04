import Link from "next/link";

export type TeamTab = "map" | "quests" | "feed" | "ranking";

const ITEMS: { key: TeamTab; label: string; href: string }[] = [
  { key: "map", label: "Map", href: "/team/map" },
  { key: "quests", label: "Quests", href: "/team/quests" },
  { key: "feed", label: "Feed", href: "/team/feed" },
  { key: "ranking", label: "Ranking", href: "/team/ranking" },
];

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
          className={`py-5 text-center text-xs font-bold uppercase tracking-widest ${
            active === it.key ? "text-pink" : "text-fg-muted hover:text-fg"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
