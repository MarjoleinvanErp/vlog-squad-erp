import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { AdminShell, Card, buttonDanger } from "../admin-layout";
import { CreateTeamForm } from "./team-form";
import { deleteTeamAction } from "./actions";

type Squad = {
  id: string;
  name: string;
  code: string;
  color: string;
};

export default async function AdminTeamsPage() {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const sb = supabaseService();
  const { data } = await sb
    .from("teams")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const teams = (data ?? []) as Squad[];

  return (
    <AdminShell title="Squads" badge="admin · squads">
      <Card>
        {teams.length === 0 ? (
          <p className="text-fg-muted">Nog geen squads. Voeg er hieronder een toe.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 rounded-full"
                    style={{ background: t.color }}
                  />
                  <div>
                    <p className="font-bold">@{t.name}</p>
                    <p className="text-xs font-mono uppercase tracking-widest text-fg-muted">
                      code · {t.code}
                    </p>
                  </div>
                </div>
                <form action={deleteTeamAction}>
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
        <h2 className="mb-4 text-lg font-bold">Squad toevoegen</h2>
        <CreateTeamForm />
      </Card>
    </AdminShell>
  );
}
