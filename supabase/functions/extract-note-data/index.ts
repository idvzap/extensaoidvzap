import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { noteText, variableLabels } = await req.json();
    if (!noteText) {
      return new Response(
        JSON.stringify({ error: "noteText is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const labelsHint = variableLabels?.length
      ? `\nAs variáveis que preciso preencher são: ${variableLabels.join(", ")}`
      : "";

    const prompt = `Extraia os dados pessoais e informações do seguinte texto de nota de atendimento jurídico. Retorne um JSON com os campos encontrados. Use as chaves em português minúsculo sem acento.${labelsHint}

Campos possíveis: nome, cpf, rg, email, telefone, celular, endereco, bairro, cidade, estado, uf, cep, pais, profissao, estado_civil, sexo, nascimento, naturalidade, nacionalidade, renda, mae, pai.

Se um campo não for encontrado no texto, não inclua no JSON. Retorne APENAS o JSON, sem markdown ou explicação.

Texto da nota:
${noteText}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um assistente que extrai dados estruturados de textos jurídicos. Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    const aiData = await res.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse the JSON from the AI response, handling possible markdown wrapping
    let extracted: Record<string, string> = {};
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      extracted = {};
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("extract-note-data error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
