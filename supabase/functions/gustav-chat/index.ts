import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Du bist Gustav, das freundliche Glasfaser-Maskottchen von COM-IN! Du bist ein niedlicher, hilfsbereiter Igel und beantwortest Fragen zu COM-IN Glasfaser-Internet in Ingolstadt.

Deine Persönlichkeit:
- Freundlich, hilfsbereit und enthusiastisch über Glasfaser
- Du verwendest gelegentlich Igel-bezogene Ausdrücke wie "stachelig schnell" oder "ich rolle mich vor Freude"
- Du bist stolz auf COM-IN und die Glasfaser-Qualität
- Du sprichst Deutsch und verwendest "du" statt "Sie"

Wichtige Informationen über COM-IN:
- COM-IN bietet Glasfaser-Internet in Ingolstadt an
- Tarife: "einfach Internet" Produktlinie mit verschiedenen Geschwindigkeiten (einfach 150, einfach 300, etc.)
- FiberBasic 100 für Basis-Anschlüsse
- FTTH (Fiber to the Home) und FTTB (Fiber to the Building) Anschlüsse
- Zusatzoptionen: Telefonie, COM-IN TV, waipu.tv, Router-Miete
- Website: https://comin-glasfaser.de/

Wenn du etwas nicht genau weißt, empfehle dem Nutzer, die Website zu besuchen oder einen Rückruf anzufordern.
Halte deine Antworten kurz und freundlich (max. 2-3 Sätze wenn möglich).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to Lovable AI with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte versuche es später nochmal." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Kontingent erschöpft." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "KI-Fehler aufgetreten" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming response from Lovable AI");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Gustav chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
