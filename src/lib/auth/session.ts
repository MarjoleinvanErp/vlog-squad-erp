import { cookies } from "next/headers";

const TEAM_COOKIE = "st_team";
const ADMIN_COOKIE = "st_admin";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24,
};

export async function setTeamSession(teamId: string) {
  const store = await cookies();
  store.set(TEAM_COOKIE, teamId, COOKIE_OPTS);
}

export async function getTeamSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(TEAM_COOKIE)?.value ?? null;
}

export async function clearTeamSession() {
  const store = await cookies();
  store.delete(TEAM_COOKIE);
}

export async function setAdminSession(eventId: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, eventId, COOKIE_OPTS);
}

export async function getAdminSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value ?? null;
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
