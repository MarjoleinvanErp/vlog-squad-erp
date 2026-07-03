"use server";

import { revalidatePath } from "next/cache";
import { normalizeCode } from "@/lib/auth/codes";
import { setRecapSession } from "@/lib/auth/session";

export type RecapLoginState = { error: string | null };

const FALLBACK_CODE = "S&B2026";

export async function recapLoginAction(
  _prev: RecapLoginState,
  formData: FormData
): Promise<RecapLoginState> {
  const input = normalizeCode(String(formData.get("code") ?? ""));
  const expected = normalizeCode(process.env.RECAP_CODE ?? FALLBACK_CODE);

  if (!input || input !== expected) {
    return { error: "Dat codewoord klopt niet — vraag het aan de organisatie" };
  }

  await setRecapSession();
  revalidatePath("/recap");
  return { error: null };
}
