import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IDVZAP_BASE = "https://vdapi.idvzap.com.br";
const API_ID = "0c2fae5f-147f-42a9-b660-036423e5761f";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiToken = Deno.env.get("IDVZAP_API_TOKEN");
  if (!apiToken) {
    return new Response(
      JSON.stringify({ error: "IDVZAP_API_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${apiToken}`,
  };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  async function parseRes(res: Response, label: string) {
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`${label} returned non-JSON [${res.status}]: ${text.substring(0, 300)}`); }
    if (!res.ok) throw new Error(`${label} failed [${res.status}]: ${JSON.stringify(data).substring(0, 500)}`);
    return data;
  }

  try {
    const { action, ...params } = await req.json();

    // List contacts
    if (action === "listContacts") {
      const query = new URLSearchParams();
      if (params.pageNumber) query.set("pageNumber", String(params.pageNumber));
      if (params.searchParam) query.set("searchParam", params.searchParam);
      if (params.walletId) query.set("walletId", String(params.walletId));
      if (params.tagId) query.set("tagId", String(params.tagId));

      const url = `${IDVZAP_BASE}/v2/api/external/${API_ID}/listContacts${query.toString() ? "?" + query.toString() : ""}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseRes(res, "listContacts"));
    }

    // Get contact extra info
    if (action === "getContactExtraInfo") {
      if (!params.contactId) return json({ error: "contactId is required" }, 400);
      const url = `${IDVZAP_BASE}/v2/api/external/${API_ID}/getContactExtraInfo?contactId=${params.contactId}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseRes(res, "getContactExtraInfo"));
    }

    // List tickets
    if (action === "listTickets") {
      const query = new URLSearchParams();
      if (params.pageNumber) query.set("pageNumber", String(params.pageNumber));
      if (params.status) query.set("status", params.status);
      if (params.searchParam) query.set("searchParam", params.searchParam);
      if (params.queuesIds) query.set("queuesIds", params.queuesIds);
      if (params.whatsappIds) query.set("whatsappIds", params.whatsappIds);
      if (params.selectedUser) query.set("selectedUser", params.selectedUser);

      const url = `${IDVZAP_BASE}/v2/api/external/${API_ID}/listTickets${query.toString() ? "?" + query.toString() : ""}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseRes(res, "listTickets"));
    }

    // List messages from a ticket
    if (action === "listMessages") {
      if (!params.ticketId) return json({ error: "ticketId is required" }, 400);
      const query = new URLSearchParams();
      query.set("ticketId", String(params.ticketId));
      if (params.pageNumber) query.set("pageNumber", String(params.pageNumber));

      const url = `${IDVZAP_BASE}/v2/api/external/${API_ID}/listMessages?${query.toString()}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseRes(res, "listMessages"));
    }

    // List notes from a ticket
    if (action === "listNotes") {
      if (!params.ticketId) return json({ error: "ticketId is required" }, 400);
      const url = `${IDVZAP_BASE}/v2/api/external/${API_ID}/listNotes?ticketId=${params.ticketId}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      return json(await parseRes(res, "listNotes"));
    }

    // Search contacts (POST)
    if (action === "searchContacts") {
      const body: Record<string, unknown> = {};
      if (params.searchParam) body.searchParam = params.searchParam;
      if (params.page) body.page = params.page;
      if (params.limit) body.limit = params.limit;
      if (params.tagId) body.tagId = params.tagId;

      const url = `${IDVZAP_BASE}/v2/api/external/${API_ID}/contacts/search`;
      const res = await fetch(url, { method: "POST", headers: authHeaders, body: JSON.stringify(body) });
      return json(await parseRes(res, "searchContacts"));
    }

    return json({ error: "Invalid action. Use: listContacts, getContactExtraInfo, listTickets, listMessages, listNotes, searchContacts" }, 400);
  } catch (error: unknown) {
    console.error("IDVZap error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
