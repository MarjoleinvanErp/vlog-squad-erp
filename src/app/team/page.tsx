import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { TeamLoginForm } from "./team-login-form";

export default async function TeamPage() {
  const teamId = await getTeamSession();
  if (teamId) {
    redirect("/team/map");
  }
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 pb-10 pt-[calc(3rem+var(--st))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50vh] bg-[radial-gradient(ellipse_at_top,rgba(254,44,85,0.4),transparent_60%)]"
      />

      <header className="flex flex-col gap-6">
        <Link
          href="/"
          className="text-sm text-fg-muted hover:text-fg"
        >
          ← terug
        </Link>
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan">
            squad login
          </span>
          <h1 className="text-5xl font-bold leading-none tracking-tight">
            Open je
            <br />
            <span className="text-gradient">channel</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Type de code in die je hebt gekregen.
          </p>
        </div>
      </header>

      <TeamLoginForm />
    </main>
  );
}
