import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { clientIp, sha256 } from "./validation.ts";

export async function allowRequest(client: SupabaseClient, request: Request, scope: string, email = ""): Promise<boolean> {
  const identities = [`${scope}|ip|${clientIp(request)}`, ...(email ? [`${scope}|email|${email.toLowerCase()}`] : [])];
  for (const identity of identities) {
    const { data, error } = await client.rpc("consume_rate_limit", {
      p_bucket_key: await sha256(identity), p_limit: 8, p_window_seconds: 900,
    });
    if (error || data !== true) return false;
  }
  return true;
}
