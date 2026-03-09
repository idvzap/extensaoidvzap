import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADVBOX_BASE = "https://app.advbox.com.br/api/v1";

async function parseResponse(res: Response, label: string) {
  if (res.status === 204) return { data: [] };
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON [${res.status}]: ${text.substring(0, 300)}`);
  }
  if (!res.ok) throw new Error(`${label} failed [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiToken = Deno.env.get("ADVBOX_API_TOKEN");
  if (!apiToken) {
    return new Response(
      JSON.stringify({ error: "ADVBOX_API_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeaders = {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { action, ...params } = await req.json();

    if (action === "settings") {
      const res = await fetch(`${ADVBOX_BASE}/settings`, { method: "GET", headers: authHeaders });
      return json(await parseResponse(res, "ADVBOX settings"));
    }

    if (action === "list") {
      const query = new URLSearchParams();
      if (params.date_start) query.set("date_start", params.date_start);
      if (params.date_end) query.set("date_end", params.date_end);
      if (params.user_id) query.set("user_id", params.user_id);
      if (params.lawsuit_id) query.set("lawsuit_id", params.lawsuit_id);
      if (params.limit) query.set("limit", String(params.limit));
      if (params.offset) query.set("offset", String(params.offset));

      const url = `${ADVBOX_BASE}/posts${query.toString() ? "?" + query.toString() : ""}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseResponse(res, "ADVBOX list tasks"));
    }

    if (action === "create") {
      const body: Record<string, unknown> = {
        from: params.from,
        guests: params.guests,
        tasks_id: params.tasks_id,
        lawsuits_id: params.lawsuits_id,
        start_date: params.start_date,
      };
      if (params.start_time) body.start_time = params.start_time;
      if (params.end_date) body.end_date = params.end_date;
      if (params.end_time) body.end_time = params.end_time;
      if (params.date_deadline) body.date_deadline = params.date_deadline;
      if (params.local) body.local = params.local;
      if (params.comments) body.comments = params.comments;
      if (params.urgent !== undefined) body.urgent = params.urgent;
      if (params.important !== undefined) body.important = params.important;
      if (params.display_schedule !== undefined) body.display_schedule = params.display_schedule;

      const res = await fetch(`${ADVBOX_BASE}/posts`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      return json(await parseResponse(res, "ADVBOX create task"));
    }

    // --- Andamentos / Movimentações ---

    if (action === "last_movements") {
      const query = new URLSearchParams();
      if (params.lawsuit_id) query.set("lawsuit_id", String(params.lawsuit_id));
      if (params.process_number) query.set("process_number", params.process_number);
      if (params.protocol_number) query.set("protocol_number", params.protocol_number);
      if (params.date_start) query.set("date_start", params.date_start);
      if (params.date_end) query.set("date_end", params.date_end);
      if (params.limit) query.set("limit", String(params.limit));
      if (params.offset) query.set("offset", String(params.offset));

      const url = `${ADVBOX_BASE}/last_movements${query.toString() ? "?" + query.toString() : ""}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseResponse(res, "ADVBOX last_movements"));
    }

    if (action === "movements") {
      if (!params.lawsuit_id) {
        return new Response(
          JSON.stringify({ error: "lawsuit_id is required for movements" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const query = new URLSearchParams();
      if (params.origin) query.set("origin", params.origin);

      const url = `${ADVBOX_BASE}/movements/${params.lawsuit_id}${query.toString() ? "?" + query.toString() : ""}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseResponse(res, "ADVBOX movements"));
    }

    if (action === "publications") {
      if (!params.lawsuit_id) {
        return new Response(
          JSON.stringify({ error: "lawsuit_id is required for publications" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const url = `${ADVBOX_BASE}/publications/${params.lawsuit_id}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseResponse(res, "ADVBOX publications"));
    }

    // --- Clientes / Customers ---

    if (action === "customers") {
      const query = new URLSearchParams();
      if (params.name) query.set("name", params.name);
      if (params.phone) query.set("phone", params.phone);
      if (params.identification) query.set("identification", params.identification);
      if (params.email) query.set("email", params.email);
      if (params.city) query.set("city", params.city);
      if (params.state) query.set("state", params.state);
      if (params.limit) query.set("limit", String(params.limit));
      if (params.offset) query.set("offset", String(params.offset));

      const url = `${ADVBOX_BASE}/customers${query.toString() ? "?" + query.toString() : ""}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseResponse(res, "ADVBOX customers"));
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: settings, list, create, last_movements, movements, publications, customers" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("ADVBOX error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
