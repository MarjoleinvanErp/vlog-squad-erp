import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { AdminShell, Card, buttonDanger } from "../../admin-layout";
import { TaskForm, type TaskFormValue } from "../task-form";
import { deleteTaskAction } from "../actions";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const { id } = await params;
  const sb = supabaseService();
  const [{ data: taskData }, { data: locsData }] = await Promise.all([
    sb
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("event_id", eventId)
      .maybeSingle(),
    sb
      .from("locations")
      .select("id, name")
      .eq("event_id", eventId)
      .order("name"),
  ]);

  if (!taskData) notFound();

  const task = taskData as TaskFormValue;
  const locations = (locsData ?? []) as { id: string; name: string }[];

  return (
    <AdminShell title={task.title} badge="admin · challenge wijzigen">
      <Link
        href="/admin/tasks"
        className="text-sm text-fg-muted hover:text-fg"
      >
        ← terug naar challenges
      </Link>

      <Card>
        <TaskForm task={task} locations={locations} />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Challenge verwijderen</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Wis deze challenge + alle inzendingen erop.
            </p>
          </div>
          <form action={deleteTaskAction}>
            <input type="hidden" name="id" value={task.id} />
            <button type="submit" className={buttonDanger}>
              delete
            </button>
          </form>
        </div>
      </Card>
    </AdminShell>
  );
}
