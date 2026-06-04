import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { ChallengeForm } from "./challenge-form";

const TYPE_LABEL = {
  photo: "Drop",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
} as const;

const TYPE_COLOR = {
  photo: "text-pink",
  text: "text-cyan",
  multiple_choice: "text-yellow-400",
  arrival: "text-green-400",
} as const;

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const { id } = await params;
  const sb = supabaseService();

  const { data: taskData } = await sb
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!taskData) notFound();

  const task = taskData as {
    id: string;
    title: string;
    description: string;
    type: "photo" | "text" | "multiple_choice" | "arrival";
    max_points: number;
    options: { choices: string[]; correct: number } | null;
    location_id: string | null;
  };

  if (task.type === "arrival") {
    redirect(task.location_id ? `/team/location/${task.location_id}` : "/team/map");
  }

  const { data: existing } = await sb
    .from("submissions")
    .select("id, status, awarded_points")
    .eq("team_id", teamId)
    .eq("task_id", id)
    .maybeSingle();

  const backHref = task.location_id
    ? `/team/location/${task.location_id}`
    : "/team/map";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pb-10 pt-[calc(1.5rem+var(--st))]">
      <Link href={backHref} className="text-sm text-fg-muted hover:text-fg">
        ← terug
      </Link>

      <header>
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${TYPE_COLOR[task.type]}`}
        >
          {TYPE_LABEL[task.type]} · max {task.max_points} likes
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">{task.title}</h1>
        <p className="mt-3 whitespace-pre-line text-fg-muted">
          {task.description}
        </p>
      </header>

      {existing ? (
        <section className="rounded-2xl border border-border-strong bg-bg-card p-6 text-center">
          <p className="text-sm text-fg-muted">Al ingediend</p>
          <p className="mt-1 text-lg font-bold">
            {(existing as { status: string }).status === "approved" &&
              `+${(existing as { awarded_points: number }).awarded_points} likes`}
            {(existing as { status: string }).status === "pending" && "In review"}
            {(existing as { status: string }).status === "rejected" && "Niet goedgekeurd"}
          </p>
        </section>
      ) : (
        <ChallengeForm task={task} />
      )}
    </main>
  );
}
