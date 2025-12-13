import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PDFRequest {
  html: string;
  filename?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { html, filename = "document.pdf" }: PDFRequest = await req.json();

    if (!html) {
      console.error("No HTML content provided");
      return new Response(
        JSON.stringify({ error: "HTML content is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Generating PDF for:", filename);
    console.log("HTML length:", html.length);

    // Use a PDF generation service - we'll use html2pdf.app API
    // This is a free service that converts HTML to PDF
    const pdfResponse = await fetch("https://api.html2pdf.app/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: html,
        apiKey: Deno.env.get("HTML2PDF_API_KEY") || "free", // Free tier available
        format: "A4",
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      }),
    });

    if (!pdfResponse.ok) {
      // Fallback: Return HTML with print styles as alternative
      console.log("PDF service unavailable, returning HTML with print optimization");
      
      const printOptimizedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename.replace('.pdf', '')}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4; margin: 0; }
    }
  </style>
  <script>
    window.onload = function() { 
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</head>
<body>
${html}
</body>
</html>`;

      return new Response(
        JSON.stringify({ 
          success: true, 
          type: "html",
          html: printOptimizedHtml,
          message: "PDF service unavailable, returning printable HTML"
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get PDF as base64
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    console.log("PDF generated successfully, size:", pdfBuffer.byteLength);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type: "pdf",
        pdf: base64,
        filename: filename
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate PDF" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
