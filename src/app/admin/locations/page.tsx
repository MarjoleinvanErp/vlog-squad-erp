import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { AdminShell, Card, buttonDanger } from "../admin-layout";
import { CreateLocationForm } from "./location-form";
import { deleteLocationAction } from "./actions";

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
  const { data } = await sb
    .from("locations")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const locations = (data ?? []) as Loc[];

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
