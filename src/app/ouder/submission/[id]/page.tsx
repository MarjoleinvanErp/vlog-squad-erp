import Link from "next/link";
import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

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

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const { id } = await params;
  const sb = supabaseService();

  const { data: subData } = await sb
    .from("submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!subData) notFound();

  const sub = subData as {
    id: string;
    team_id: string;
    task_id: string;
    text_answer: string | null;
    choice_index: number | null;
    photo_url: string | null;
    status: "pending" | "approved" | "rejected";
    awarded_points: number | null;
    review_note: string | null;
    submitted_at: string;
  };

  const [{ data: teamData }, { data: taskData }] = await Promise.all([
    sb.from("teams").select("*").eq("id", sub.team_id).maybeSingle(),
    sb.from("tasks").select("*").eq("id", sub.task_id).maybeSingle(),
  ]);

  if (!teamData || !taskData) notFound();

  const team = teamData as {
    name: string;
    color: string;
    team_photo_url: string | null;
    event_id: string;
  };

  if (team.event_id !== eventId) notFound();

  const task = taskData as {
    title: string;
    description: string;
    type: keyof typeof TYPE_LABEL;
    max_points: number;
    options: { choices: string[]; correct: number } | null;
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pt-6 pb-10">
      <Link
        href="/ouder/dashboard"
        className="text-sm text-fg-muted hover:text-fg"
      >
        ← dashboard
      </Link>

      <header className="flex items-center gap-3">
        {team.team_photo_url ? (
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
            <Image
              src={team.team_photo_url}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
              style={{ outline: `2px solid ${team.color}`, outlineOffset: 1 }}
            />
          </div>
        ) : (
          <div
            className="h-12 w-12 flex-shrink-0 rounded-full"
            style={{ background: team.color }}
          />
        )}
        <div className="min-w-0">
          <p className="font-bold" style={{ color: team.color }}>
            @{team.name}
          </p>
          <p className="text-xs text-fg-dim">
            {new Date(sub.submitted_at).toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${TYPE_COLOR[task.type]}`}
        >
          {TYPE_LABEL[task.type]} · max {task.max_points} likes
        </p>
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <p className="whitespace-pre-line text-sm text-fg-muted">
          {task.description}
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-bg-card">
        {sub.photo_url && (
          <div className="relative aspect-square w-full bg-black">
            <Image
              src={sub.photo_url}
              alt=""
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        )}
        {sub.text_answer && (
          <p className="whitespace-pre-line p-5 text-base">{sub.text_answer}</p>
        )}
        {task.type === "multiple_choice" && sub.choice_index != null && task.options && (
          <div className="p-5">
            <p className="text-sm font-bold">
              Gekozen: {task.options.choices[sub.choice_index]}
            </p>
            <p className="mt-1 text-xs text-fg-dim">
              Juist antwoord: {task.options.choices[task.options.correct]}
            </p>
          </div>
        )}
      </section>

      {sub.status === "pending" ? (
        <ReviewForm submissionId={sub.id} maxPoints={task.max_points} />
      ) : (
        <section className="rounded-2xl border border-border-strong bg-bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-fg-muted">
            Status
          </p>
          <p className="mt-1 text-2xl font-bold">
            {sub.status === "approved" ? (
              <span className="text-cyan">+{sub.awarded_points} likes</span>
            ) : (
              <span className="text-fg-muted">Afgewezen</span>
            )}
          </p>
          {sub.review_note && (
            <p className="mt-2 text-sm text-fg-dim">"{sub.review_note}"</p>
          )}
          <p className="mt-3 text-xs text-fg-dim">Al beoordeeld</p>
        </section>
      )}
    </main>
  );
}
