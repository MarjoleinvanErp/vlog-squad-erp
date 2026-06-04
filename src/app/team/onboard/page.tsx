import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data } = await sb
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (!data) redirect("/team");

  const team = data as {
    id: string;
    name: string;
    color: string;
    team_photo_url: string | null;
  };

  if (team.team_photo_url) {
    redirect("/team/map");
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 pb-10 pt-[calc(3rem+var(--st))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50vh] bg-[radial-gradient(ellipse_at_top,rgba(254,44,85,0.4),transparent_60%)]"
      />
      <OnboardingWizard teamColor={team.color} currentName={team.name} />
    </main>
  );
}
