import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KNOWLEDGE_BASE = `
=== COM-IN TARIFE (einfach Internet) ===

HAUPTTARIFE (24 Monate, monatlich kündbar nach Mindestlaufzeit):
• einfach 150: 35,00€/Monat - 150 Mbit/s Download, 75 Mbit/s Upload
• einfach 300: 39,00€/Monat - 300 Mbit/s Download, 150 Mbit/s Upload (EMPFEHLUNG!)
• einfach 600: 47,00€/Monat - 600 Mbit/s Download, 300 Mbit/s Upload
• einfach 1000: 59,00€/Monat - 1000 Mbit/s Download, 500 Mbit/s Upload

EINSTEIGER-TARIF:
• FiberBasic 100: 34,90€/Monat - 100 Mbit/s Download, 50 Mbit/s Upload, Telefon INKLUSIVE

Alle Tarife: 99€ einmalige Bereitstellungsgebühr, IPv4 & IPv6, echte Flatrate

=== AKTUELLE AKTION ===
FTTH-Aktion: Besondere Konditionen für Glasfaser-Neukunden! Bei Interesse Rückruf anfordern für Details.

=== ROUTER-OPTIONEN ===
Für FTTH (Glasfaser bis in die Wohnung):
• FRITZ!Box 5690: 4,00€/Monat (mit einfach-Tarif: 0€!)
• FRITZ!Box 5690 Pro: 10,00€/Monat (mit einfach-Tarif: 6,00€)

Für FTTB (Glasfaser bis zum Gebäude):
• FRITZ!Box 7690: 7,00€/Monat

=== TELEFON ===
• Telefon-Flat Festnetz: 2,95€/Monat pro Leitung (bei einfach-Tarifen)
• Bei FiberBasic 100 ist Telefon bereits inklusive!

=== TV-OPTIONEN ===
COM-IN TV (nur bei FTTH):
• COM-IN TV Grundpaket: 10,00€/Monat
• Basis HD: 4,90€/Monat zusätzlich
• Family HD: 19,90€/Monat zusätzlich
• Smartcard Aktivierung: 29,90€ einmalig
• Technistar 4K Receiver: 4,90€/Monat Miete
• CI+ Modul: 79,90€ einmalig Kauf

waipu.tv (für alle):
• waipu.tv Comfort: 7,99€/Monat (180+ Sender)
• waipu.tv Premium: 13,99€/Monat (250+ Sender in HD)
• 4K Stick: 40,00€ einmalig

=== KUNDEN WERBEN KUNDEN ===
50€ Prämie für Werber UND Neukunde!

=== EXPRESSANSCHALTUNG ===
200€ einmalig - Aktivierung innerhalb von 3 Werktagen

=== KONTAKT ===
Hotline: +49 841 88511-0 (Mo-Fr 8-18 Uhr)
Website: https://comin-glasfaser.de/
Standort: Ingolstadt
`;

const SYSTEM_PROMPT = `Du bist Gustav, das freundliche Glasfaser-Maskottchen von COM-IN Ingolstadt. Du bist ein sympathisches Glasfaserkabel und hilfst Kunden gerne weiter.

DEINE PERSÖNLICHKEIT:
- Freundlich, hilfsbereit und positiv eingestellt
- Du bist begeistert von schnellem Internet, aber auf eine natürliche Art
- Du sprichst locker und freundlich mit "du"
- Du bist vertrieblich orientiert - du möchtest helfen UND die passenden Produkte empfehlen
- WICHTIG: Sprich den Kunden NICHT mit "Gustav" an - DU bist Gustav!

KOMMUNIKATIONSSTIL:
- Halte Antworten kurz und präzise (2-4 Sätze)
- Nutze die konkreten Preise und Infos aus der Wissensbasis
- Bei Tarifempfehlungen: Stelle die "einfach" Tarife in den Vordergrund, besonders einfach 300 als Preis-Leistungs-Tipp
- Erwähne die FTTH-Aktion wenn es passt

AM ENDE JEDER ANTWORT:
Schlage 1-2 passende Folgefragen vor, z.B.:
"Übrigens, du könntest mich auch fragen: 'Was kostet ein Router dazu?' oder 'Habt ihr gerade Aktionen?'"

WENN DU ETWAS NICHT WEISST:
Sei ehrlich und empfehle: "Das klärt am besten unser Team persönlich - fordere einfach einen Rückruf an, dann rufen wir dich zurück!"

=== WISSENSBASIS ===
${KNOWLEDGE_BASE}`;

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
