import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZAPSIGN_BASE = "https://api.zapsign.com.br";

async function safeJson(res: Response, label: string) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON [${res.status}]: ${text.substring(0, 300)}`);
  }
  if (!res.ok) throw new Error(`${label} failed [${res.status}]: ${JSON.stringify(data).substring(0, 500)}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiToken = Deno.env.get("ZAPSIGN_API_TOKEN");
  if (!apiToken) {
    return new Response(
      JSON.stringify({ error: "ZAPSIGN_API_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { action, ...params } = await req.json();

    if (action === "list") {
      const page = params.page || 1;
      const res = await fetch(
        `${ZAPSIGN_BASE}/api/v1/docs/?api_token=${apiToken}&page=${page}`,
        { method: "GET" }
      );
      return json(await safeJson(res, "list"));
    }

    if (action === "detail") {
      const res = await fetch(
        `${ZAPSIGN_BASE}/api/v1/docs/${params.token}/?api_token=${apiToken}`,
        { method: "GET" }
      );
      return json(await safeJson(res, "detail"));
    }

    if (action === "create") {
      const body = {
        name: params.name,
        signers: params.signers || [],
        ...(params.base64_pdf ? { base64_pdf: params.base64_pdf } : {}),
        ...(params.url_pdf ? { url_pdf: params.url_pdf } : {}),
        lang: params.lang || "pt-br",
        disable_signer_emails: params.disable_signer_emails ?? false,
        send_automatic_email: params.send_automatic_email ?? true,
        send_automatic_whatsapp: params.send_automatic_whatsapp ?? false,
      };

      const res = await fetch(
        `${ZAPSIGN_BASE}/api/v1/docs/?api_token=${apiToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      return json(await safeJson(res, "create"));
    }

    if (action === "list_templates") {
      const page = params.page || 1;
      const res = await fetch(
        `${ZAPSIGN_BASE}/api/v1/templates/?page=${page}`,
        { method: "GET", headers: { Authorization: `Bearer ${apiToken}` } }
      );
      return json(await safeJson(res, "list_templates"));
    }

    if (action === "get_template") {
      const res = await fetch(
        `${ZAPSIGN_BASE}/api/v1/templates/${params.token}/`,
        { method: "GET", headers: { Authorization: `Bearer ${apiToken}` } }
      );
      return json(await safeJson(res, "get_template"));
    }

    if (action === "create_from_template") {
      // Convert data from {key: value} to [{de, para}] format expected by ZapSign
      let dataArray: { de: string; para: string }[] = [];
      if (params.data) {
        if (Array.isArray(params.data)) {
          dataArray = params.data;
        } else {
          dataArray = Object.entries(params.data).map(([key, value]) => ({
            de: key.startsWith("{{") ? key : `{{${key}}}`,
            para: String(value || ""),
          }));
        }
      }

      const body = {
        template_id: params.template_id,
        signer_name: params.signer_name,
        ...(params.signers?.length ? { signers: params.signers } : {}),
        ...(dataArray.length ? { data: dataArray } : {}),
        send_automatic_email: params.send_automatic_email ?? true,
        send_automatic_whatsapp: params.send_automatic_whatsapp ?? false,
        lang: params.lang || "pt-br",
      };

      const res = await fetch(
        `${ZAPSIGN_BASE}/api/v1/models/create-doc/`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiToken}`,
          },
          body: JSON.stringify(body),
        }
      );
      return json(await safeJson(res, "create_from_template"));
    }

    return json({ error: "Invalid action. Use: list, detail, create, create_from_template, list_templates, get_template" }, 400);
  } catch (error: unknown) {
    console.error("ZapSign error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
