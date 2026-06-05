import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { teamLogoutAction } from "../actions";
import { PushToggle } from "../push-toggle";

export default async function SquadProfilePage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data } = await sb
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (!data) redirect("/team");

  const t = data as {
    name: string;
    code: string;
    color: string;
    team_photo_url: string | null;
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pb-10 pt-[calc(1.5rem+var(--st))]">
      <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
        ← map
      </Link>

      <header className="flex flex-col items-center gap-4 text-center">
        {t.team_photo_url && (
          <div
            className="relative h-32 w-32 overflow-hidden rounded-full"
            style={{ outline: `3px solid ${t.color}`, outlineOffset: 3 }}
          >
            <Image
              src={t.team_photo_url}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-widest text-fg-muted">
            channel
          </p>
          <h1 className="text-3xl font-bold" style={{ color: t.color }}>
            @{t.name}
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-fg-dim">
            code · {t.code}
          </p>
        </div>
      </header>

      <PushToggle />

      <form action={teamLogoutAction}>
        <button
          type="submit"
          className="w-full rounded-2xl border border-border-strong bg-bg-card px-6 py-4 text-sm font-bold uppercase tracking-widest text-fg-muted hover:border-pink hover:text-pink"
        >
          Log uit
        </button>
      </form>
    </main>
  );
}
