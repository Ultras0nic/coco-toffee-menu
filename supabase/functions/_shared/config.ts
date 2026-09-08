export function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  return Deno.env.get(name)?.trim() || fallback;
}

export const OWNER_EMAIL = optionalEnv("OWNER_EMAIL", "jericholi334677@gmail.com").toLowerCase();
export const SITE_URL = optionalEnv("SITE_URL", "https://ultras0nic.github.io/coco-toffee-menu").replace(/\/$/, "");
