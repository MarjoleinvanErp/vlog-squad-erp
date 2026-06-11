import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { AdminShell, Card, buttonDanger } from "../admin-layout";
import { CreateTaskForm } from "./task-form";
import { deleteTaskAction } from "./actions";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  type: "photo" | "video" | "text" | "multiple_choice" | "arrival";
  max_points: number;
  location_id: string | null;
  min_photos: number | null;
  max_photos: number | null;
  min_seconds: number | null;
  max_seconds: number | null;
};

type LocationRow = {
  id: string;
  name: string;
};

const TYPE_LABEL: Record<TaskRow["type"], string> = {
  photo: "Drop",
  video: "Video",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
};

const TYPE_COLOR: Record<TaskRow["type"], string> = {
  photo: "text-pink",
  video: "text-pink",
  text: "text-cyan",
  multiple_choice: "text-yellow-400",
  arrival: "text-green-400",
};

function mediaHint(t: TaskRow): string | null {
  if (t.type === "photo") {
    const max = t.max_photos ?? 1;
    const min = t.min_photos ?? max;
    if (min === max) return `${max} foto${max === 1 ? "" : "'s"}`;
    return `${min}–${max} foto's`;
  }
  if (t.type === "video") {
    const max = t.max_seconds ?? 10;
    const min = t.min_seconds ?? 1;
    if (min === max) return `${max}s video`;
    return `${min}–${max}s video`;
  }
  return null;
}

export default async function AdminTasksPage() {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const sb = supabaseService();
  const [{ data: tasksData }, { data: locsData }] = await Promise.all([
    sb
      .from("tasks")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    sb
      .from("locations")
      .select("id, name")
      .eq("event_id", eventId)
      .order("name"),
  ]);

  const tasks = (tasksData ?? []) as TaskRow[];
  const locations = (locsData ?? []) as LocationRow[];
  const locNameById = new Map(locations.map((l) => [l.id, l.name]));

  return (
    <AdminShell title="Challenges" badge="admin · challenges">
      <Card>
        {tasks.length === 0 ? (
          <p className="text-fg-muted">
            Nog geen challenges. Voeg er hieronder een toe.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-widest ${TYPE_COLOR[t.type]}`}
                    >
                      {TYPE_LABEL[t.type]}
                    </span>
                    <span className="text-xs text-fg-dim">
                      · {t.max_points} likes
                    </span>
                    {mediaHint(t) && (
                      <span className="text-xs text-fg-dim">
                        · {mediaHint(t)}
                      </span>
                    )}
                    {t.location_id && (
                      <span className="text-xs text-fg-dim">
                        · {locNameById.get(t.location_id) ?? "?"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-bold">{t.title}</p>
                  <p className="mt-1 text-sm text-fg-muted line-clamp-2">
                    {t.description}
                  </p>
                </div>
                <form action={deleteTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className={buttonDanger}>
                    delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold">Challenge toevoegen</h2>
        <CreateTaskForm locations={locations} />
      </Card>
    </AdminShell>
  );
}
