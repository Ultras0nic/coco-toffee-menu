import { corsHeaders } from "./cors.ts";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "ORIGIN_NOT_ALLOWED"
  | "SPAM_CHECK_FAILED"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYMENT_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE";

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function failure(
  request: Request,
  status: number,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
  context?: Record<string, unknown>,
): Response {
  return json(request, { ok: false, error: { code, message, ...(fields ? { fields } : {}) }, ...context }, status);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64_000) throw new Error("Request body is too large");
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON object required");
  return value as Record<string, unknown>;
}
