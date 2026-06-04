const TEAM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const ADMIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomFrom(alphabet: string, length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function generateTeamCode(): string {
  return randomFrom(TEAM_ALPHABET, 4);
}

export function generateAdminCode(): string {
  return randomFrom(ADMIN_ALPHABET, 8);
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
