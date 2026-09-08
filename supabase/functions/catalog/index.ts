import { isAllowedOrigin, optionsResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/db.ts";
import { failure, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET") return failure(request, 405, "BAD_REQUEST", "Method not allowed");
  if (!isAllowedOrigin(request)) return failure(request, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed");

  try {
    const client = serviceClient();
    const { data, error } = await client
      .from("products")
      .select("id,name,pricing_mode,sort_order,offers(id,offer_key,label,quantity_units,amount_cents,sort_order)")
      .eq("active", true)
      .eq("offers.active", true)
      .order("sort_order")
      .order("sort_order", { referencedTable: "offers" });
    if (error) throw error;

    return json(request, {
      schemaVersion: 1,
      currency: "USD",
      products: (data || []).map((product) => ({
        id: product.id,
        name: product.name,
        mode: product.pricing_mode,
        offers: (product.offers || []).map((offer: Record<string, unknown>) => ({
          id: offer.id,
          key: offer.offer_key,
          label: offer.label,
          units: offer.quantity_units,
          priceCents: offer.amount_cents,
        })),
      })),
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "catalog_failed", message: error instanceof Error ? error.message : "unknown" }));
    return failure(request, 503, "SERVICE_UNAVAILABLE", "Catalog is temporarily unavailable");
  }
});
