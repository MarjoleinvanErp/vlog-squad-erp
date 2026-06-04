import Link from "next/link";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const sb = supabaseService();
  const { data: event } = await sb
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) redirect("/ouder");

  const e = event as { name: string };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 pt-8 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-pink">admin</p>
          <h1 className="text-2xl font-bold">{e.name}</h1>
        </div>
        <Link
          href="/ouder/dashboard"
          className="rounded-full border border-border-strong px-4 py-2 text-sm hover:border-cyan hover:text-cyan"
        >
          ← Manager
        </Link>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        <AdminCard title="Event" href="/admin/event" description="Naam, tijden, no-go zones" />
        <AdminCard title="Squads" href="/admin/teams" description="Squad-codes, kleuren, leden" />
        <AdminCard title="Drops · Locaties" href="/admin/locations" description="Plekken op de kaart + likes" />
        <AdminCard title="Challenges" href="/admin/tasks" description="Dance, Aesthetic, POV, ..." />
      </section>
    </main>
  );
}

function AdminCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-border bg-bg-card p-6 transition hover:border-pink hover:glow-pink"
    >
      <h2 className="text-lg font-bold transition group-hover:text-pink">
        {title}
      </h2>
      <p className="mt-1 text-sm text-fg-muted">{description}</p>
    </Link>
  );
}
