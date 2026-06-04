import Link from "next/link";

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 pt-20 pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(ellipse_at_top,rgba(254,44,85,0.35),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[40vh] bg-[radial-gradient(ellipse_at_bottom,rgba(37,244,238,0.18),transparent_60%)]"
      />

      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan">
          live · Erp
        </span>
        <h1 className="text-6xl font-bold leading-none tracking-tight">
          <span className="text-gradient">Vlog</span>
          <br />
          <span>Squad</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          De speurtocht-game waar je squad gaat voor de meeste likes.
        </p>
      </header>

      <nav className="flex flex-col gap-3">
        <Link
          href="/team"
          className="group relative overflow-hidden rounded-2xl bg-pink px-6 py-5 text-center text-lg font-bold text-white transition active:scale-[0.98]"
        >
          <span className="relative z-10">Open je channel</span>
          <span className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-r from-pink via-pink-soft to-pink opacity-0 transition group-hover:opacity-100" />
        </Link>
        <Link
          href="/ouder"
          className="rounded-2xl border border-border-strong bg-bg-card px-6 py-5 text-center text-lg font-semibold text-fg transition hover:border-cyan hover:text-cyan"
        >
          Ouder · manager
        </Link>
        <Link
          href="/admin"
          className="rounded-xl px-6 py-2 text-center text-xs uppercase tracking-widest text-fg-dim hover:text-fg-muted"
        >
          Admin
        </Link>
      </nav>
    </main>
  );
}
