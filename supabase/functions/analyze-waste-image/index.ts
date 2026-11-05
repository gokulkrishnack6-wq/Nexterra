// Supabase Edge Function: analyze-waste-image
// Multimodal AI Waste Classification using Google Gemini Vision
// Reads secret GEMINI_API_KEY securely from Supabase Environment (Deno.env)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Read Gemini API key securely from Supabase Secrets
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY');
    
    if (!geminiApiKey || geminiApiKey.length < 20 || geminiApiKey.includes('YOUR_ACTUAL')) {
      return new Response(
        JSON.stringify({
          error: 'Supabase secret GEMINI_API_KEY is not configured on this Edge Function.',
          hint: 'Set the secret in Supabase Dashboard (Settings > Edge Functions > Secrets) or run: supabase secrets set GEMINI_API_KEY=your_key'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Parse Request Body
    const body = await req.json().catch(() => null);
    if (!body || !body.imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: imageBase64' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { imageBase64, mimeType = 'image/jpeg' } = body;
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    if (cleanBase64.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid or empty image payload. Please provide a valid photo.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Detailed Structured Prompt for Multimodal Circular Economy Analysis
    const prompt = `
You are an expert waste classification and circular materials engineer for GreenLoop in Kerala, India.
Thoroughly examine the uploaded image pixels and perform real visual inspection of the material.

1. Inspect the visual characteristics: colors, texture, shape, labels, transparency, rigidity, and signs of use/wear.
2. Determine if the image is clear or ambiguous. If the image is blurry, too dark, out of focus, or contains a chaotic mix of unrecognizable items, set "is_ambiguous": true with a helpful "ambiguity_reason" advising how to retake a clearer photo.
3. Classify into one of these exact category slugs:
   - "organic" (Food scraps, peels, wet kitchen discards)
   - "agricultural" (Coconut husks, coir dust, paddy straw, farm residues)
   - "paper" (Cardboard boxes, packaging cartons, newsprint, office paper)
   - "plastics" (PET bottles, HDPE containers, LDPE film, crates)
   - "e-waste" (Circuit boards, cables, chargers, electronics, batteries)
   - "metals" (Aluminium cans, scrap iron, steel, copper wire)
   - "glass" (Glass bottles, pickle jars, broken cullet)
   - "textiles" (Old clothes, fabric scraps, tailoring remnants)
4. Provide a genuine recyclability score (1-100), realistic estimated batch weight range, specific safety/handling guidance, and practical reuse methods tailored to Kerala's decentralized ecosystem (composting, Haritha Karma Sena collection, upcycling, etc.).

Return ONLY a valid JSON object without any markdown code fence wrappers matching this exact schema:
{
  "detected_material": "Specific material name (e.g. Dry Coconut Husks, Corrugated Cardboard, PET Plastic Water Bottle)",
  "category_slug": "exact slug from the 8 categories above",
  "category_name": "Human-readable Category Title",
  "subcategory": "Specific subcategory or polymer/grade if applicable",
  "confidence": 92.5,
  "is_ambiguous": false,
  "ambiguity_reason": "",
  "visible_characteristics": [
    "Feature 1 observed in the image",
    "Feature 2 observed in the image"
  ],
  "suggested_action": "one of: composting, upcycling, recycling, safe_disposal, bio_methanation",
  "reasoning": "2-3 sentences explaining what is visually evident in the image.",
  "recyclability_score": 88,
  "estimated_weight_range": "e.g. 1 - 3 kg",
  "safety_guidance": [
    "Handling tip 1",
    "Handling tip 2"
  ],
  "circular_value_tips": [
    "Ecological reuse tip 1",
    "Carbon diversion impact"
  ],
  "potential_matches_summary": "Recommended local recipients (e.g. Local vermicomposters, Haritha Karma Sena MCF, Coir artisans)"
}
`;

    // 5. Call Google Gemini Vision Model (gemini-1.5-flash for speed & multimodal accuracy)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let parsedError = errorText;
      try {
        const errObj = JSON.parse(errorText);
        parsedError = errObj.error?.message || errorText;
      } catch (_) {
        // use raw errorText
      }

      console.error('Gemini API Error:', parsedError);
      return new Response(
        JSON.stringify({ 
          error: `Gemini API call failed (${geminiResponse.status}): ${parsedError}` 
        }),
        { 
          status: geminiResponse.status === 400 ? 400 : 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip any markdown code block wrappers
    const cleanedJson = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (!cleanedJson) {
      return new Response(
        JSON.stringify({ error: 'Gemini model did not return any content. Please try another photo.' }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const parsedResult = JSON.parse(cleanedJson);

    // Validate essential fields
    if (!parsedResult.detected_material || !parsedResult.category_slug) {
      return new Response(
        JSON.stringify({ error: 'AI analysis generated an incomplete classification schema.' }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 6. Return Clean Parsed JSON
    return new Response(
      JSON.stringify(parsedResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Edge Function Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error processing waste image.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

