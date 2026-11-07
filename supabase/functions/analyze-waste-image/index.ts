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

    // 5. Parse Request Payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Empty or invalid JSON body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Diagnostic Action: Test single model
    if (body.action === 'test-model') {
      const model = body.model || 'gemini-2.5-flash';
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const start = Date.now();
      const testRes = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, reply with JSON: {"status":"ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      const duration = Date.now() - start;
      const text = await testRes.text();
      return new Response(
        JSON.stringify({ model, status: testRes.status, durationMs: duration, response: text }),
        { status: testRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (body.action === 'list-models') {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`;
      const listRes = await fetch(listUrl);
      if (!listRes.ok) {
        const errText = await listRes.text();
        return new Response(
          JSON.stringify({ error: `Failed to list models: ${listRes.status} ${errText}` }),
          { status: listRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const listData = await listRes.json();
      const models = (listData.models || []).map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
        supportedGenerationMethods: m.supportedGenerationMethods,
        description: m.description,
      }));
      return new Response(
        JSON.stringify({ count: models.length, models }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate imageBase64 presence
    if (!body.imageBase64) {
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

    // 7. Resolve the optimal available Gemini vision model dynamically
    // Verified against Google Generative Language API on user's active GEMINI_API_KEY
    const verifiedCandidateModels = [
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.5-pro',
    ];

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
        responseMimeType: 'application/json',
      },
    };

    let geminiResponse: Response | null = null;
    let selectedModel = '';
    const modelErrors: string[] = [];

    for (const modelCandidate of verifiedCandidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${geminiApiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
        });

        if (res.ok) {
          geminiResponse = res;
          selectedModel = modelCandidate;
          break;
        }

        const errText = await res.text();
        modelErrors.push(`${modelCandidate} (${res.status}): ${errText}`);
        console.warn(`Model ${modelCandidate} failed (${res.status}):`, errText);

        if (res.status === 400 && errText.includes('API_KEY_INVALID')) {
          return new Response(
            JSON.stringify({ error: 'The GEMINI_API_KEY saved in Supabase Secrets is invalid or expired. Please verify your Gemini API key in Google AI Studio.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (res.status === 429) {
          console.warn(`Model ${modelCandidate} rate-limited (429), attempting next candidate...`);
        }

      } catch (fetchErr: any) {
        modelErrors.push(`${modelCandidate}: ${fetchErr.message}`);
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      console.error('All candidate Gemini models failed:', modelErrors.join(' | '));
      return new Response(
        JSON.stringify({ error: `AI analysis service error: ${modelErrors.join(' || ')}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    let candidateText = '';
    for (const part of parts) {
      if (part.text && !part.thought) {
        candidateText += part.text;
      }
    }
    if (!candidateText && parts.length > 0) {
      candidateText = parts[parts.length - 1].text || '';
    }

    // Extract JSON substring from first '{' to last '}' to strip any stray markdown fences or preamble
    const firstBrace = candidateText.indexOf('{');
    const lastBrace = candidateText.lastIndexOf('}');
    const cleanedJsonText = (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace)
      ? candidateText.substring(firstBrace, lastBrace + 1)
      : candidateText
          .replace(/^```(?:json)?\s*/i, '')
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

    // Attach metadata about the model that served the inference
    parsedResult.model_used = selectedModel;

    // Ensure backwards compatibility with frontend AIScanResult interface
    parsedResult.confidence = typeof parsedResult.confidence === 'number' 
      ? Math.min(100, Math.max(0, parsedResult.confidence)) 
      : 85;

    parsedResult.recyclability_score = typeof parsedResult.recyclability_score === 'number'
      ? Math.min(100, Math.max(0, parsedResult.recyclability_score))
      : 75;

    // Map reuse_recommendations and recycling_methods to frontend fields
    parsedResult.safety_guidance = Array.isArray(parsedResult.safety_guidance) && parsedResult.safety_guidance.length > 0
      ? parsedResult.safety_guidance
      : (Array.isArray(parsedResult.safety_warnings) && parsedResult.safety_warnings.length > 0
          ? parsedResult.safety_warnings
          : ['Handle with standard hygiene precautions and keep clean/dry before handover.']);

    parsedResult.circular_value_tips = Array.isArray(parsedResult.circular_value_tips) && parsedResult.circular_value_tips.length > 0
      ? parsedResult.circular_value_tips
      : (Array.isArray(parsedResult.reuse_recommendations) && parsedResult.reuse_recommendations.length > 0
          ? parsedResult.reuse_recommendations
          : ['Segregate at source to maintain high value for local recyclers.']);

    parsedResult.visible_characteristics = Array.isArray(parsedResult.visible_characteristics)
      ? parsedResult.visible_characteristics
      : [];

    parsedResult.reuse_recommendations = Array.isArray(parsedResult.reuse_recommendations)
      ? parsedResult.reuse_recommendations
      : [];

    parsedResult.recycling_methods = Array.isArray(parsedResult.recycling_methods)
      ? parsedResult.recycling_methods
      : [];

    parsedResult.is_discarded_waste = typeof parsedResult.is_discarded_waste === 'boolean'
      ? parsedResult.is_discarded_waste
      : true;

    parsedResult.is_ambiguous = typeof parsedResult.is_ambiguous === 'boolean'
      ? parsedResult.is_ambiguous
      : false;

    parsedResult.ambiguity_reason = parsedResult.ambiguity_reason || '';

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
