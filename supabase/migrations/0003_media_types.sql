-- ================================================================
-- Speurtocht Erp — Media types (photo count + video)
-- ================================================================
-- Project: ztccdrzjlwhxseixpmjc
-- Apply via: Dashboard → SQL Editor (kopieer/plak deze hele file)
--
-- BELANGRIJK: Voer dit ALLEEN uit in het Supabase project
-- ztccdrzjlwhxseixpmjc. Check dashboard URL voordat je 'Run' klikt.
--
-- Voegt 'video' toe als task_type, geeft photo-tasks min/max aantal
-- foto's, video-tasks min/max seconden, en zet submissions over van
-- photo_url (text) naar photo_urls (text[]).
-- ================================================================

-- ===== Enum: 'video' =====
-- Postgres staat ALTER TYPE ADD VALUE buiten transactie toe (12+).
-- IF NOT EXISTS is idempotent.
alter type task_type add value if not exists 'video';

-- ===== tasks: media-config kolommen =====
alter table tasks add column if not exists min_photos int;
alter table tasks add column if not exists max_photos int;
alter table tasks add column if not exists min_seconds int;
alter table tasks add column if not exists max_seconds int;

-- Bestaande photo-tasks: exact 1 foto (huidige gedrag).
update tasks
set min_photos = 1, max_photos = 1
where type = 'photo' and min_photos is null and max_photos is null;

-- ===== submissions: photo_url -> photo_urls (array) =====
alter table submissions add column if not exists photo_urls text[] not null default '{}';

-- Backfill: bestaande photo_url naar 1-element array (alleen als nog niet gevuld).
update submissions
set photo_urls = array[photo_url]
where photo_url is not null
  and (photo_urls is null or array_length(photo_urls, 1) is null);

-- Drop oude kolom.
alter table submissions drop column if exists photo_url;
