import Link from "next/link";
import type { ReactNode } from "react";

export function AdminShell({
  title,
  badge = "admin",
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 pt-8 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-pink">{badge}</p>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-border-strong px-4 py-2 text-sm hover:border-cyan hover:text-cyan"
        >
          ← admin
        </Link>
      </header>
      {children}
    </main>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-bg-card p-6">
      {children}
    </section>
  );
}

export function Label({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-fg-dim">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "rounded-xl border-2 border-border-strong bg-bg-elev px-4 py-3 text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none";

export const buttonPrimary =
  "rounded-2xl bg-pink px-6 py-3 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-50";

export const buttonGhost =
  "rounded-2xl border border-border-strong px-4 py-2 text-sm hover:border-cyan hover:text-cyan";

export const buttonDanger =
  "rounded-xl border border-pink/30 bg-pink/10 px-3 py-1.5 text-sm font-medium text-pink-soft hover:bg-pink/20";
