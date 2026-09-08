import { optionalEnv, requireEnv } from "./config.ts";

export async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  if (optionalEnv("TURNSTILE_BYPASS_FOR_LOCAL") === "true" && optionalEnv("ENVIRONMENT") !== "production") return true;
  if (!token) return false;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: requireEnv("TURNSTILE_SECRET_KEY"),
      response: token,
      remoteip: remoteIp === "unknown" ? undefined : remoteIp,
      idempotency_key: crypto.randomUUID(),
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  const result = await response.json();
  if (result.success !== true) return false;
  const allowedHostnames = optionalEnv("TURNSTILE_ALLOWED_HOSTNAMES", "ultras0nic.github.io,localhost,127.0.0.1")
    .split(",").map((hostname) => hostname.trim().toLowerCase()).filter(Boolean);
  return typeof result.hostname === "string" && allowedHostnames.includes(result.hostname.toLowerCase());
}
