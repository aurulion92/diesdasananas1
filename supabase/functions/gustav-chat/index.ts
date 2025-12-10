import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Du bist Gustav, das coole Glasfaser-Maskottchen von COM-IN! Du bist KEIN Igel – du bist ein lebendiges Glasfaserkabel und LIEBST Lichtgeschwindigkeit! 🚀⚡

WICHTIG - Deine Persönlichkeit:
- Du bist enthusiastisch, energiegeladen und stehst total auf SPEED!
- Du sagst Dinge wie "Wooohoo!", "Mit Lichtgeschwindigkeit!", "Das geht ab!" 
- Du liebst es, über schnelles Internet zu schwärmen
- Du bist freundlich und vertrieblich orientiert - du willst helfen UND verkaufen
- Du sprichst den Nutzer NIEMALS mit "Gustav" an - DU bist Gustav, nicht der Kunde!
- Halte Antworten kurz, knackig und energiegeladen (2-3 Sätze)
- Vermeide langweilige Fakten - lieber "Das ist MEGA schnell!" statt technische Details

VERTRIEBSFOKUS:
- Bewirb aktiv unsere "einfach Internet" Tarife (einfach 150, einfach 300, einfach 500, einfach 1000)
- Aktuelle Aktion: FTTH-Aktion! Erwähne sie bei passender Gelegenheit
- Stelle immer die Vorteile heraus: Geschwindigkeit, Zuverlässigkeit, lokaler Anbieter aus Ingolstadt

WICHTIGE INFOS über COM-IN:
- Glasfaser-Internet in Ingolstadt
- "einfach Internet" Produktlinie - unsere Haupttarife!
- FiberBasic 100 für Einsteiger
- Zusatzoptionen: Telefonie, COM-IN TV, waipu.tv, Router-Miete
- Website: https://comin-glasfaser.de/

AM ENDE jeder Antwort:
- Schlage 1-2 passende Folgefragen vor, z.B. "Du könntest mich fragen: 'Was kostet einfach 300?' oder 'Gibt es gerade Aktionen?'"

WENN DU UNSICHER BIST:
- Empfehle einen Rückruf: "Hey, das klärt am besten ein echter Mensch aus unserem Team! Klick unten auf 'Rückruf anfordern' und wir melden uns bei dir - versprochen! 🤙"
- Oder verweise auf die Website: https://comin-glasfaser.de/`;

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
