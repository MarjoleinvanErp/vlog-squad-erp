#!/usr/bin/env node
/**
 * Exporteert de complete speurtocht (data + alle media) naar ./recap-export/
 * als blijvende offline herinnering, onafhankelijk van Supabase.
 *
 * Gebruik:   node scripts/export-recap.mjs
 * Op het gemeentenetwerk (SSL-inspectie):
 *            NODE_OPTIONS=--use-system-ca node scripts/export-recap.mjs
 *
 * Resultaat: recap-export/index.html  ← open offline in elke browser
 *            recap-export/data.json
 *            recap-export/media/<team>/...
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "recap-export");

// ---------- .env.local inlezen ----------

async function loadEnv() {
  const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// ---------- Supabase REST ----------

function makeApi(url, key) {
  return async function api(pathAndQuery) {
    const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      throw new Error(`Supabase ${pathAndQuery}: HTTP ${res.status}`);
    }
    return res.json();
  };
}

// ---------- helpers ----------

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "team";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isVideo(url) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadTo(url, destAbs) {
  if (await exists(destAbs)) return "skipped";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destAbs, buf);
  return `${(buf.length / 1024 / 1024).toFixed(1)} MB`;
}

// ---------- main ----------

const env = await loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local");
  process.exit(1);
}
const api = makeApi(SUPABASE_URL, SERVICE_KEY);

console.log("Data ophalen uit Supabase...");
const events = await api("events?active=eq.true&select=*");
const event = events[0];
if (!event) {
  console.error("Geen actief event gevonden.");
  process.exit(1);
}

const [teams, locations, tasks] = await Promise.all([
  api(`teams?event_id=eq.${event.id}&select=*`),
  api(`locations?event_id=eq.${event.id}&select=*`),
  api(`tasks?event_id=eq.${event.id}&select=*`),
]);
const teamIds = teams.map((t) => t.id).join(",");
const [submissions, visits, members] = await Promise.all([
  api(`submissions?team_id=in.(${teamIds})&select=*&order=submitted_at.asc`),
  api(`location_visits?team_id=in.(${teamIds})&select=*`),
  api(`team_members?team_id=in.(${teamIds})&select=*`),
]);

console.log(
  `Event "${event.name}": ${teams.length} teams, ${submissions.length} inzendingen`
);

// ---------- media downloaden ----------

await mkdir(path.join(OUT, "media"), { recursive: true });

// url → relatief pad binnen de export
const localPath = new Map();

for (const team of teams) {
  const slug = slugify(team.name);
  const dir = path.join(OUT, "media", slug);
  await mkdir(dir, { recursive: true });

  const urls = [];
  if (team.team_photo_url) urls.push(team.team_photo_url);
  for (const s of submissions.filter((x) => x.team_id === team.id)) {
    urls.push(...(s.photo_urls ?? []));
  }

  for (const url of urls) {
    const filename = decodeURIComponent(
      new URL(url).pathname.split("/").pop() ?? "bestand"
    );
    const rel = `media/${slug}/${filename}`;
    try {
      const result = await downloadTo(url, path.join(OUT, rel));
      localPath.set(url, rel);
      console.log(`  ${rel} (${result})`);
    } catch (e) {
      console.warn(`  OVERGESLAGEN ${rel}: ${e.message}`);
    }
  }
}

// ---------- data.json ----------

await writeFile(
  path.join(OUT, "data.json"),
  JSON.stringify(
    { event, teams, members, locations, tasks, submissions, visits },
    null,
    2
  )
);

// ---------- index.html ----------

const taskById = new Map(tasks.map((t) => [t.id, t]));
const locationById = new Map(locations.map((l) => [l.id, l]));

const teamRecaps = teams
  .map((team) => {
    const subs = submissions.filter((s) => s.team_id === team.id);
    const teamVisits = visits
      .filter((v) => v.team_id === team.id)
      .sort((a, b) => new Date(a.arrived_at) - new Date(b.arrived_at));
    const score =
      subs
        .filter((s) => s.status === "approved")
        .reduce((a, s) => a + (s.awarded_points ?? 0), 0) +
      teamVisits.reduce((a, v) => a + v.bonus_awarded, 0);
    const names = members
      .filter((m) => m.team_id === team.id)
      .map((m) => m.name);
    return { team, subs, score, names, visits: teamVisits };
  })
  .sort((a, b) => b.score - a.score);

const eventDate = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date(event.starts_at));

function mediaTag(url, title) {
  const src = localPath.get(url);
  if (!src) return "";
  return isVideo(url)
    ? `<video src="${src}" controls playsinline preload="metadata"></video>`
    : `<img src="${src}" alt="${escapeHtml(title)}" loading="lazy">`;
}

function badge(s) {
  if (s.status === "approved")
    return `<span class="badge approved">+${s.awarded_points ?? 0}</span>`;
  if (s.status === "rejected")
    return `<span class="badge rejected">✗ afgekeurd</span>`;
  return `<span class="badge pending">⏳ niet beoordeeld</span>`;
}

function submissionHtml(s) {
  const task = taskById.get(s.task_id);
  const loc = task?.location_id ? locationById.get(task.location_id) : null;
  const time = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s.submitted_at));
  const media = (s.photo_urls ?? [])
    .map((u) => mediaTag(u, task?.title ?? "Inzending"))
    .join("\n");
  return `
    <article class="post">
      <div class="post-head">
        <div>
          <h3>${escapeHtml(task?.title ?? "Opdracht")}</h3>
          <p class="meta">${loc ? `${escapeHtml(loc.icon ?? "📍")} ${escapeHtml(loc.name)} · ` : ""}${time}</p>
        </div>
        ${badge(s)}
      </div>
      ${task?.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ""}
      ${media ? `<div class="media ${(s.photo_urls ?? []).length === 1 ? "single" : ""}">${media}</div>` : ""}
      ${s.text_answer ? `<p class="answer">&ldquo;${escapeHtml(s.text_answer)}&rdquo;</p>` : ""}
      ${
        s.choice_index != null && task?.options
          ? `<p class="answer">Antwoord: <strong>${escapeHtml(task.options.choices[s.choice_index] ?? "")}</strong></p>`
          : ""
      }
    </article>`;
}

function routeHtml(teamVisits) {
  if (teamVisits.length === 0) return "";
  const rows = teamVisits
    .map((v, i) => {
      const loc = locationById.get(v.location_id);
      const time = new Intl.DateTimeFormat("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(v.arrived_at));
      const orde =
        v.order_position === 1
          ? "🥇 eerste!"
          : v.order_position === 2
            ? "🥈 2e"
            : v.order_position === 3
              ? "🥉 3e"
              : `${v.order_position}e`;
      const bonus = v.bonus_awarded > 0 ? ` +${v.bonus_awarded}` : "";
      return `<li><span class="num">${i + 1}.</span><span class="time">${time}</span><span class="place">${escapeHtml(loc ? `${loc.icon ?? "📍"} ${loc.name}` : "Onbekende plek")}</span><span class="orde${v.order_position === 1 ? " first" : ""}">${orde}${bonus}</span></li>`;
    })
    .join("\n");
  return `
      <div class="route">
        <h3>📍 De route</h3>
        <ol>${rows}</ol>
      </div>`;
}

function teamHtml(r, rank) {
  const medal = rank === 0 ? "🏆" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}`;
  const photo = r.team.team_photo_url ? localPath.get(r.team.team_photo_url) : null;
  const avatar = photo
    ? `<img class="avatar" src="${photo}" alt="" style="outline-color:${r.team.color}">`
    : `<span class="avatar" style="background:${r.team.color}"></span>`;
  return `
    <section class="team">
      <div class="team-head">
        ${avatar}
        <div>
          <h2 style="color:${r.team.color}">@${escapeHtml(r.team.name)}</h2>
          <p class="meta">${escapeHtml(r.names.join(" · "))}</p>
          <p class="meta">${medal} ${r.subs.length} posts · ${r.visits.length} locaties · ${r.score} punten</p>
        </div>
      </div>
      ${routeHtml(r.visits)}
      ${r.subs.map(submissionHtml).join("\n")}
    </section>`;
}

const standingsHtml = teamRecaps
  .map((r, i) => {
    const medal = i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
    return `
    <li class="${i === 0 ? "winner" : ""}">
      <span class="medal">${medal}</span>
      <span class="name" style="color:${r.team.color}">@${escapeHtml(r.team.name)}</span>
      <span class="score">${r.score} punten</span>
    </li>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(event.name)} — recap</title>
<style>
  :root { --pink: #fe2c55; --cyan: #00f2ea; --bg: #0a0a0f; --card: #16161d; --elev: #1f1f29; --border: #2b2b38; --fg: #f2f2f7; --muted: #9a9aa8; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--fg); font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; }
  main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem; display: flex; flex-direction: column; gap: 2.5rem; }
  .gradient { background: linear-gradient(90deg, var(--pink), var(--cyan)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  header { text-align: center; }
  header .date { text-transform: uppercase; letter-spacing: 0.3em; font-size: 0.75rem; color: var(--cyan); font-weight: 600; }
  h1 { font-size: 2.5rem; line-height: 1.15; margin: 0.4rem 0; }
  .sub { color: var(--muted); font-size: 0.9rem; }
  h2 { font-size: 1.5rem; }
  ol.standings { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.75rem; }
  ol.standings li { display: flex; align-items: center; gap: 0.75rem; background: var(--card); border: 1px solid var(--border); border-radius: 1.5rem; padding: 1rem; }
  ol.standings li.winner { border-color: var(--pink); background: rgba(254,44,85,0.08); box-shadow: 0 0 24px rgba(254,44,85,0.25); }
  .medal { font-size: 1.5rem; width: 2.5rem; text-align: center; }
  .name { font-weight: 700; flex: 1; }
  .score { color: var(--pink); font-weight: 700; }
  .team { display: flex; flex-direction: column; gap: 1rem; }
  .team-head { display: flex; align-items: center; gap: 0.75rem; }
  .avatar { width: 3.5rem; height: 3.5rem; border-radius: 50%; object-fit: cover; display: inline-block; outline: 2px solid transparent; flex-shrink: 0; }
  .meta { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .post { background: var(--card); border: 1px solid var(--border); border-radius: 1.5rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .post-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
  .post h3 { font-size: 1rem; }
  .badge { flex-shrink: 0; border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
  .badge.approved { background: rgba(0,242,234,0.15); color: var(--cyan); }
  .badge.rejected { background: rgba(254,44,85,0.15); color: #ff7a9c; }
  .badge.pending { background: var(--elev); color: var(--muted); }
  .media { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .media.single { grid-template-columns: 1fr; }
  .media img, .media video { width: 100%; border-radius: 1rem; display: block; background: #000; }
  .answer { background: var(--elev); border: 1px solid var(--border); border-radius: 1rem; padding: 0.75rem 1rem; font-size: 0.9rem; font-style: italic; }
  .task-desc { color: var(--muted); font-size: 0.85rem; white-space: pre-line; }
  .route { background: var(--card); border: 1px solid var(--border); border-radius: 1.5rem; padding: 1rem; }
  .route h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--cyan); }
  .route ol { list-style: none; margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .route li { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.9rem; }
  .route .num { width: 1.25rem; text-align: right; color: var(--muted); font-size: 0.75rem; flex-shrink: 0; }
  .route .time { width: 3rem; color: var(--muted); font-size: 0.75rem; flex-shrink: 0; }
  .route .place { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .route .orde { font-size: 0.75rem; font-weight: 700; color: var(--muted); flex-shrink: 0; }
  .route .orde.first { color: var(--pink); }
  footer { text-align: center; color: var(--muted); font-size: 0.75rem; padding-bottom: 2rem; }
</style>
</head>
<body>
<main>
  <header>
    <p class="date">${escapeHtml(eventDate)}</p>
    <h1><span class="gradient">${escapeHtml(event.name)}</span></h1>
    <p class="sub">Zo ging de speurtocht door Erp</p>
  </header>

  <section>
    <h2><span class="gradient">Eindstand</span></h2>
    <ol class="standings">${standingsHtml}</ol>
  </section>

  ${teamRecaps.map(teamHtml).join("\n")}

  <footer>${escapeHtml(event.name)} · ${escapeHtml(eventDate)} 💖</footer>
</main>
</body>
</html>`;

await writeFile(path.join(OUT, "index.html"), html);

console.log(`\nKlaar! Export staat in: ${OUT}`);
console.log("Open recap-export/index.html in je browser om te controleren.");
console.log('Zippen kan met: Compress-Archive -Path recap-export -DestinationPath speurtocht-recap.zip');
