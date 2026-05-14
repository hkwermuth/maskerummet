import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface YarnColor {
  replaces: string
  brand: string
  series: string
  colorName: string
  colorNameDa: string
  hex: string
  fiber: string
  weight: string
}

function getTextureHint(series: string): string {
  if (series === "Tilia") {
    return "soft fuzzy mohair halo, delicate and airy, slightly transparent kid mohair with silk sheen"
  } else if (series === "Bella Color") {
    return "variegated mohair with gentle color transitions, multicolored fuzzy halo, hand-dyed look"
  } else if (series === "Bella") {
    return "fluffy mohair halo, denser than silk blend, cozy and warm kid mohair texture"
  }
  return "soft yarn texture"
}

function buildPrompt(colors: YarnColor[]): string {
  if (colors.length === 1 && colors[0].replaces === "all colors") {
    // Single-color mode
    const c = colors[0]
    const texture = getTextureHint(c.series)
    return `Modify this knitting or crochet item to appear as if it were made with ${c.brand} ${c.series} yarn in the color "${c.colorNameDa}" (${c.colorName}).

Change the yarn color to closely match hex ${c.hex}.
The yarn should show the characteristic texture of ${c.fiber}: ${texture}.
Maintain the exact same shape, pattern, stitch structure, and garment design.
Keep the background and composition identical.
The result should look like a realistic, professionally photographed knitting project.
Photorealistic, soft natural lighting.`
  }

  // Multi-color mode — build color replacement instructions
  const replacements = colors.map((c) => {
    const texture = getTextureHint(c.series)
    return `- Replace the "${c.replaces}" colored yarn with ${c.brand} ${c.series} in "${c.colorNameDa}" (${c.colorName}), hex ${c.hex}. This yarn has ${c.fiber} fiber with ${texture}.`
  }).join("\n")

  return `Modify this knitting or crochet item by replacing specific yarn colors as described below. This is a multi-color project (like brioche, stripes, colorwork, or fair isle) where different colors need to be changed independently.

Color replacements:
${replacements}

IMPORTANT instructions:
- Change ONLY the specified colors. Each color replacement should affect only the yarn areas matching that original color.
- Maintain the exact same stitch pattern, stripe pattern, colorwork pattern, and garment construction.
- Preserve the contrast and pattern structure between the different colors.
- Keep the background, composition, lighting, and model identical.
- The result should look like a realistic, professionally photographed knitting project.
Photorealistic, soft natural lighting.`
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const { image, yarn } = await req.json()

    if (!image || !yarn?.colors || yarn.colors.length === 0) {
      return new Response(JSON.stringify({ error: "Missing image or yarn color data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const prompt = buildPrompt(yarn.colors)
    // Promptet indeholder farver brugeren har valgt — ikke fortroligt, men ingen
    // grund til at logge det i prod. Log kun antal farver for fejlfinding.
    console.log(`Generating with ${yarn.colors.length} colors`)

    const imageBytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0))
    const imageBlob = new Blob([imageBytes], { type: "image/png" })

    const formData = new FormData()
    formData.append("model", "gpt-image-1")
    formData.append("image", imageBlob, "input.png")
    formData.append("prompt", prompt)
    formData.append("size", "1024x1024")
    formData.append("quality", "high")

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text()
      console.error("OpenAI error:", openaiRes.status, errBody)
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${openaiRes.status}`, details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const result = await openaiRes.json()
    const generatedImage = result.data?.[0]?.b64_json || result.data?.[0]?.url

    return new Response(
      JSON.stringify({ image: generatedImage, format: result.data?.[0]?.b64_json ? "base64" : "url" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Edge function error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
