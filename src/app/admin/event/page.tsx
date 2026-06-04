import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { AdminShell, Card } from "../admin-layout";
import { EventForm } from "./event-form";

export default async function AdminEventPage() {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const sb = supabaseService();
  const { data } = await sb
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!data) redirect("/ouder");

  const event = data as {
    id: string;
    name: string;
    starts_at: string;
    ends_at: string;
    admin_code: string;
    active: boolean;
    start_lat: number | null;
    start_lng: number | null;
  };

  return (
    <AdminShell title="Event-instellingen">
      <Card>
        <EventForm event={event} />
      </Card>
    </AdminShell>
  );
}
