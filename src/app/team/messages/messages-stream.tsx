"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type MessageRow = {
  id: string;
  body: string;
  created_at: string;
};

const SEEN_KEY = (teamId: string) => `speur:messages-seen-at:${teamId}`;

export function MessagesStream({
  eventId,
  teamId,
  initial,
}: {
  eventId: string;
  teamId: string;
  initial: MessageRow[];
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initial);

  // Markeer alle huidige berichten als gezien zodra de pagina openstaat.
  useEffect(() => {
    localStorage.setItem(SEEN_KEY(teamId), new Date().toISOString());
  }, [teamId, messages.length]);

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`broadcast-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "broadcast_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow | null;
          if (!row) return;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [row, ...prev]
          );
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [eventId]);

  if (messages.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center text-fg-muted">
        Nog geen berichten van de ouders.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {messages.map((m) => (
        <li
          key={m.id}
          className="rounded-2xl border border-border bg-bg-card p-4"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan">
              ouders
            </span>
            <span className="text-[10px] uppercase tracking-widest text-fg-muted">
              {new Date(m.created_at).toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-base">{m.body}</p>
        </li>
      ))}
    </ol>
  );
}
