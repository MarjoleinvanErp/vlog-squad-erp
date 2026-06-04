import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { AdminShell, Card, buttonDanger } from "../../admin-layout";
import { LocationForm, type LocationFormValue } from "../location-form";
import { deleteLocationAction } from "../actions";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const { id } = await params;
  const sb = supabaseService();
  const { data } = await sb
    .from("locations")
    .select("*")
    .eq("id", id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!data) notFound();

  const location = data as LocationFormValue;

  return (
    <AdminShell title={location.name} badge="admin · locatie wijzigen">
      <Link
        href="/admin/locations"
        className="text-sm text-fg-muted hover:text-fg"
      >
        ← terug naar locaties
      </Link>

      <Card>
        <LocationForm location={location} />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Locatie verwijderen</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Wis deze locatie + alle bezoeken eraan.
            </p>
          </div>
          <form action={deleteLocationAction}>
            <input type="hidden" name="id" value={location.id} />
            <button type="submit" className={buttonDanger}>
              delete
            </button>
          </form>
        </div>
      </Card>
    </AdminShell>
  );
}
