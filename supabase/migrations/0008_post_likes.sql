-- ================================================================
-- Speurtocht Erp - Ouder-likes op posts
-- ================================================================
-- Ouders kunnen (met hun naam) een hartje geven op een inzending.
-- Eén like per naam per post. Alleen leuk, telt niet mee in de score.
-- ================================================================

create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  liker_name text not null check (char_length(liker_name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (submission_id, liker_name)
);

create index if not exists post_likes_submission_idx
  on post_likes (submission_id);

alter table post_likes enable row level security;

-- Anon read policy: nodig zodat Supabase Realtime row-events doorgeeft aan
-- de browser-clients (feed). Writes blijven via service role die RLS bypasst.
drop policy if exists "anon read post_likes" on post_likes;
create policy "anon read post_likes" on post_likes
  for select to anon using (true);

-- Realtime publication: teams zien likes live binnenkomen in de feed.
do $$
begin
  begin
    alter publication supabase_realtime add table public.post_likes;
  exception when duplicate_object then null;
  end;
end $$;
