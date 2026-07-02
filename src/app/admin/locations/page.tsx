import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import type { TaskType } from "@/lib/supabase/types";
import { AdminShell, Card, buttonDanger } from "../admin-layout";
import { CreateLocationForm } from "./location-form";
import { deleteLocationAction } from "./actions";

const TYPE_LABEL: Record<TaskType, string> = {
  photo: "Drop",
  video: "Video",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
};

// Canonieke volgorde voor het samenvatten van types per locatie
const TYPE_ORDER: TaskType[] = [
  "photo",
  "video",
  "text",
  "multiple_choice",
  "arrival",
];

type Loc = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  radius_meters: number;
  arrival_points: number;
};

export default async function AdminLocationsPage() {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const sb = supabaseService();
  const [{ data: locsData }, { data: tasksData }] = await Promise.all([
    sb
      .from("locations")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    sb
      .from("tasks")
      .select("id, location_id, type")
      .eq("event_id", eventId),
  ]);

  const locations = (locsData ?? []) as Loc[];
  const tasks = (tasksData ?? []) as Array<{
    id: string;
    location_id: string | null;
    type: TaskType;
  }>;

  // Groepeer types per location_id, dedupe
  const typesByLocation = new Map<string, Set<TaskType>>();
  const countByLocation = new Map<string, number>();
  for (const t of tasks) {
    if (!t.location_id) continue;
    countByLocation.set(
      t.location_id,
      (countByLocation.get(t.location_id) ?? 0) + 1
    );
    const set = typesByLocation.get(t.location_id) ?? new Set<TaskType>();
    set.add(t.type);
    typesByLocation.set(t.location_id, set);
  }

  return (
    <AdminShell title="Drops · Locaties" badge="admin · locaties">
      <Card>
        {locations.length === 0 ? (
          <p className="text-fg-muted">
            Nog geen locaties. Voeg er hieronder een toe.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {locations.map((l) => (
              <li
                key={l.id}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/admin/locations/${l.id}`}
                  className="min-w-0 flex-1 rounded-lg px-2 py-1 -mx-2 transition hover:bg-bg-elev"
                >
                  <p className="font-bold">{l.name}</p>
                  <p className="font-mono text-xs text-fg-muted">
                    {l.lat.toFixed(5)}, {l.lng.toFixed(5)} · {l.radius_meters}m ·{" "}
                    <span className="text-pink">{l.arrival_points} likes</span>
                  </p>
                  <ChallengeSummary
                    count={countByLocation.get(l.id) ?? 0}
                    types={typesByLocation.get(l.id) ?? new Set()}
                  />
                  {l.description && (
                    <p className="mt-1 truncate text-sm text-fg-dim">
                      {l.description}
                    </p>
                  )}
                </Link>
                <form action={deleteLocationAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <button type="submit" className={buttonDanger}>
                    delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {locations.length > 0 && (
          <p className="mt-3 text-xs text-fg-dim">
            Tap een locatie om te wijzigen.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold">Locatie toevoegen</h2>
        <CreateLocationForm />
      </Card>
    </AdminShell>
  );
}

function ChallengeSummary({
  count,
  types,
}: {
  count: number;
  types: Set<TaskType>;
}) {
  if (count === 0) {
    return (
      <p className="mt-1 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-400">
        ⚠ geen challenges
      </p>
    );
  }
  const orderedLabels = TYPE_ORDER.filter((t) => types.has(t)).map(
    (t) => TYPE_LABEL[t]
  );
  return (
    <p className="mt-1 text-xs text-fg-muted">
      {count} challenge{count === 1 ? "" : "s"} · {orderedLabels.join(", ")}
    </p>
  );
}
