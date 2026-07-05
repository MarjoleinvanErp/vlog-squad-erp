import Link from "next/link";
import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";
import { LikeButton } from "./like-button";

const TYPE_LABEL = {
  photo: "Drop",
  video: "Video",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
} as const;

const TYPE_COLOR = {
  photo: "text-pink",
  video: "text-pink",
  text: "text-cyan",
  multiple_choice: "text-yellow-400",
  arrival: "text-green-400",
} as const;

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

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
    photo_urls: string[] | null;
    status: "pending" | "approved" | "rejected";
    awarded_points: number | null;
    review_note: string | null;
    submitted_at: string;
  };
  const photoUrls = sub.photo_urls ?? [];

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

  // Likes ophalen; als de post_likes-tabel (nog) niet bestaat gewoon leeg.
  let likes: string[] = [];
  try {
    const { data: likeRows, error: likeError } = await sb
      .from("post_likes")
      .select("liker_name")
      .eq("submission_id", sub.id)
      .order("created_at", { ascending: true });
    if (!likeError) {
      likes = ((likeRows ?? []) as Array<{ liker_name: string }>).map(
        (l) => l.liker_name
      );
    }
  } catch {
    // tabel ontbreekt nog — like-knop werkt dan gewoon vanaf 0
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pb-10 pt-[calc(1.5rem+var(--st))]">
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
              timeZone: "Europe/Amsterdam",
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
        {photoUrls.length > 0 && (
          <div className="flex flex-col">
            {photoUrls.map((url, i) =>
              isVideoUrl(url) ? (
                <video
                  key={i}
                  src={url}
                  controls
                  playsInline
                  className="aspect-video w-full bg-black"
                />
              ) : (
                <div
                  key={i}
                  className="relative aspect-square w-full bg-black"
                >
                  <Image
                    src={url}
                    alt={`Foto ${i + 1}`}
                    fill
                    sizes="(max-width: 480px) 100vw, 480px"
                    className="object-cover"
                  />
                  {photoUrls.length > 1 && (
                    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                      {i + 1}/{photoUrls.length}
                    </span>
                  )}
                </div>
              )
            )}
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

      <LikeButton submissionId={sub.id} initialLikes={likes} />

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
            <p className="mt-2 text-sm text-fg-dim">
              &ldquo;{sub.review_note}&rdquo;
            </p>
          )}
          <p className="mt-3 text-xs text-fg-dim">Al beoordeeld</p>
        </section>
      )}
    </main>
  );
}
