// Supabase Edge Function: analyze-waste-image
// Multimodal Circular Waste Material Classifier using Google Gemini Vision
// Reads GEMINI_API_KEY securely from Supabase Environment Secrets (Deno.env.get("GEMINI_API_KEY"))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Supported image MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]);

// Maximum image size: 10 MB (approx 14,000,000 Base64 characters)
const MAX_BASE64_LENGTH = 14 * 1024 * 1024;

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 3. Authenticate request using Supabase Auth (Bearer Token or API Key)
    const authHeader = req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey');

    if (!authHeader && !apikeyHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized: Missing Authorization or apikey header.',
          hint: 'Include Supabase authorization header when invoking the function.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Read Gemini API key securely from Supabase Secret
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey || geminiApiKey.trim().length < 20) {
      return new Response(
        JSON.stringify({
          error: 'Supabase secret GEMINI_API_KEY is not configured on this Edge Function.',
          hint: 'Save the secret in Supabase Dashboard (Settings > Edge Functions > Secrets) or run: supabase secrets set GEMINI_API_KEY=your_key'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parse and Validate Request Payload
    const body = await req.json().catch(() => null);
    if (!body || !body.imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: imageBase64 in request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageBase64, mimeType = 'image/jpeg' } = body;
    const cleanMime = (mimeType || 'image/jpeg').toLowerCase().split(';')[0].trim();

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
      return new Response(
        JSON.stringify({ 
          error: `Unsupported image format: "${cleanMime}". Allowed formats: JPEG, PNG, WebP, HEIC.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract raw base64 data
    const cleanBase64 = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // Validate file size and minimum content
    if (cleanBase64.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Image data is empty or corrupted. Please capture or upload a valid photo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cleanBase64.length > MAX_BASE64_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Image size exceeds the 10 MB maximum limit. Please compress or resize the photo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Detailed Prompt Enforcing Genuine Physical Material Inspection & Waste Classification Rules
    const prompt = `
You are an expert circular economy material inspector and waste classification engineer for GreenLoop in Kerala, India.
Thoroughly examine the uploaded image pixels and perform real visual inspection of the photographed object.

CRITICAL INSPECTION & CLASSIFICATION RULES:
1. DISTINGUISH DISCARDED MATERIAL FROM NEW COMMERCIAL PRODUCTS:
   - Carefully inspect whether the item is actual discarded waste/scrap/byproduct (used, empty, worn, torn, crushed, peeled, trimmed, residue) OR a brand-new pristine product, store retail display, promotional advertisement, or an active intact device in current use.
   - Set "is_discarded_waste": true ONLY if it genuinely shows signs of being discarded, scrap, or surplus material.
   - If it is a new product or advertisement, set "is_discarded_waste": false, set "item_type": "new_product_or_ad", and honestly explain in "product_vs_waste_notes".
   - Do NOT assume an item is waste merely because it is made of recyclable material.

2. CLASSIFY INTO ONE OF THESE 12 MAIN CATEGORIES:
   1. Plastic
   2. Paper and cardboard
   3. Glass
   4. Metal
   5. Organic and food waste
   6. Electronic waste
   7. Textile
   8. Rubber
   9. Wood
   10. Construction waste
   11. Mixed waste
   12. Other

3. MAP TO GREENLOOP MARKETPLACE CATEGORY SLUG:
   - "plastics" (for Plastic)
   - "paper" (for Paper and cardboard)
   - "glass" (for Glass)
   - "metals" (for Metal)
   - "organic" (for Organic and food waste)
   - "agricultural" (for farm/plant residues like coconut husks, straw, coir)
   - "e-waste" (for Electronic waste)
   - "textiles" (for Textile)
   - "other" (for Rubber, Wood, Construction waste, Mixed waste, or Other)

4. MULTIPLE MATERIALS & AMBIGUITY:
   - If the image contains multiple materials (e.g., cardboard carton with plastic bubble wrap and metal staples), identify them separately in "material_breakdown".
   - If the image is blurry, out of focus, too dark, or too far away to identify materials with reasonable confidence, set "is_ambiguous": true with a clear "ambiguity_reason" advising how to retake a clearer photo.
   - Express uncertainty honestly. Never invent chemical composition or recycling standards.

5. PRACTICAL CIRCULAR PATHWAYS FOR KERALA:
   - Tailor reuse recommendations and recycling methods to Kerala's decentralized waste framework (Haritha Karma Sena MCF collection, Clean Kerala Company aggregation, vermicomposting, bio-methanation, terrace gardening, upcycling, safe authorized disposal).

Return ONLY a valid JSON object without markdown code blocks, matching this exact schema:
{
  "detected_material": "Accurate material name (e.g. Empty PET Water Bottle, Discarded Corrugated Carton, Kitchen Vegetable Peels, Dry Coconut Husks)",
  "main_category": "Exact name from the 12 categories above",
  "category_slug": "exact slug from the 9 GreenLoop slugs above",
  "category_name": "Human-readable Category Title",
  "subcategory": "Specific polymer, grade, or subcategory if discernible",
  "confidence": 92.5,
  "is_discarded_waste": true,
  "item_type": "discarded_waste",
  "product_vs_waste_notes": "Sentence explaining visual evidence confirming whether item is discarded scrap or a new product.",
  "estimated_condition": "e.g. Clean/Dry, Light Residue, Crushed, Heavily Soiled, Brand New",
  "recovery_status": "reusable",
  "is_ambiguous": false,
  "ambiguity_reason": "",
  "multiple_materials_detected": false,
  "material_breakdown": [
    { "material": "PET #1 Plastic", "estimated_percentage": 95 },
    { "material": "HDPE #2 Bottle Cap", "estimated_percentage": 5 }
  ],
  "visible_characteristics": [
    "Transparent clear body",
    "Embossed recycling triangle with #1 code",
    "Visible signs of emptying and slight crumpling"
  ],
  "suggested_action": "one of: composting, upcycling, recycling, safe_disposal, bio_methanation",
  "reasoning": "2-3 sentences based strictly on the visual evidence in the image.",
  "recyclability_score": 90,
  "estimated_weight_range": "e.g. 20 - 40 g",
  "reuse_recommendations": [
    "Planter seedling pot",
    "Drip irrigation emitter"
  ],
  "recycling_methods": [
    "Rinse with clean water, crush, and hand over to Haritha Karma Sena for mechanical shredding and rPET yarn conversion."
  ],
  "safety_warnings": [
    "Do not incinerate or burn openly (releases toxic dioxins and furans)."
  ],
  "circular_value_tips": [
    "High market demand by recycling aggregators in Kerala."
  ],
  "potential_matches_summary": "Local Haritha Karma Sena MCF collection centres, polymer pelletizers, or upcycling artisans."
}
`;

    // 7. Invoke Gemini Vision API via Google Generative Language REST Endpoint
    // Using gemini-1.5-flash for fast multimodal image understanding
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      let errMsg = `Gemini API returned status ${geminiResponse.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch (_) {
        errMsg = errText || errMsg;
      }

      console.error('Gemini Vision API Error:', errMsg);

      if (geminiResponse.status === 400 && errMsg.includes('API_KEY_INVALID')) {
        return new Response(
          JSON.stringify({ error: 'The GEMINI_API_KEY saved in Supabase Secrets is invalid or expired. Please verify your Gemini API key in Google AI Studio.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (geminiResponse.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
        return new Response(
          JSON.stringify({ error: 'Gemini API quota or rate limit exceeded. Please wait a moment before trying again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI analysis service error: ${errMsg}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if wrapped by the model
    const cleanedJsonText = candidateText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (!cleanedJsonText) {
      return new Response(
        JSON.stringify({ error: 'AI model did not return analysis content. Please try another image.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(cleanedJsonText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', candidateText);
      return new Response(
        JSON.stringify({ error: 'AI analysis returned an unparseable response format. Please retry with a clearer photo.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize and validate essential output properties
    if (!parsedResult.detected_material || !parsedResult.category_slug) {
      return new Response(
        JSON.stringify({ error: 'AI analysis produced an incomplete result structure. Please capture another angle.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure backwards compatibility with frontend AIScanResult interface
    parsedResult.confidence = typeof parsedResult.confidence === 'number' 
      ? Math.min(100, Math.max(0, parsedResult.confidence)) 
      : 85;

    parsedResult.recyclability_score = typeof parsedResult.recyclability_score === 'number'
      ? Math.min(100, Math.max(0, parsedResult.recyclability_score))
      : 75;

    // Map reuse_recommendations and recycling_methods to frontend fields
    if (!parsedResult.safety_guidance && parsedResult.safety_warnings) {
      parsedResult.safety_guidance = parsedResult.safety_warnings;
    }
    if (!parsedResult.circular_value_tips && parsedResult.reuse_recommendations) {
      parsedResult.circular_value_tips = parsedResult.reuse_recommendations;
    }

    // 8. Return Genuine Structured Result
    return new Response(
      JSON.stringify(parsedResult),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' 
        } 
      }
    );

  } catch (err: any) {
    console.error('Edge function unhandled exception:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Edge Function processing error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
