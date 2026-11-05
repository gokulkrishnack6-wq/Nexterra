import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIScanResult } from '../types';

// Read API key from env or sessionStorage if user provided it directly
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    const sessionKey = window.sessionStorage.getItem('greenloop_user_gemini_key');
    if (sessionKey && sessionKey.trim().length > 20) {
      return sessionKey.trim();
    }
  }
  return (
    import.meta.env.VITE_GEMINI_API_KEY || 
    (import.meta.env as any).GEMINI_API_KEY || 
    ''
  );
}

export function setGeminiSessionKey(key: string) {
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    if (key && key.trim().length > 20) {
      window.sessionStorage.setItem('greenloop_user_gemini_key', key.trim());
    } else {
      window.sessionStorage.removeItem('greenloop_user_gemini_key');
    }
  }
}

export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && !key.includes('your-gemini') && key.length > 20);
}

/**
 * Genuine Multimodal AI Waste Material Classifier using Google Gemini Vision
 * Analyzes the actual base64 pixel data of the image.
 * Will throw genuine errors if the API key is unconfigured or if the image cannot be processed.
 */
export async function analyzeWasteImage(
  imageBase64: string, 
  mimeType: string = 'image/jpeg'
): Promise<AIScanResult> {
  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey.length < 20 || apiKey.includes('your-gemini')) {
    throw new Error(
      'Gemini Vision API key is not configured. Please configure VITE_GEMINI_API_KEY in .env or enter your key in scanner settings to analyze real photos.'
    );
  }

  if (!imageBase64 || imageBase64.length < 50) {
    throw new Error('Invalid image data. Please capture or upload a valid photo.');
  }

  // Strip data:image/...;base64, prefix if present
  const cleanBase64 = imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;

  const genAI = new GoogleGenerativeAI(apiKey);
  // Prefer gemini-1.5-flash for speed and multimodal vision accuracy
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
    }
  });

  const prompt = `
You are an expert waste classification and circular materials engineer.
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
4. Provide genuine estimated recyclability score (1-100), realistic estimated batch weight range, specific safety/handling guidance, and practical reuse methods for Kerala's decentralized ecosystem (composting, Haritha Karma Sena collection, upcycling, etc.).

Return ONLY a valid JSON object matching this schema without any markdown code fence wrappers:
{
  "detected_material": "Specific material name (e.g. Dry Coconut Husks, Corrugated Cardboard, Polyethylene Terephthalate Bottle)",
  "category_slug": "exact slug from the 8 categories above",
  "category_name": "Human-readable Category Title",
  "subcategory": "Specific subcategory or polymer/grade if applicable",
  "confidence": 88.5,
  "is_ambiguous": false,
  "ambiguity_reason": "",
  "visible_characteristics": [
    "Feature 1 observed in the image",
    "Feature 2 observed in the image"
  ],
  "suggested_action": "one of: composting, upcycling, recycling, safe_disposal, bio_methanation",
  "reasoning": "2-3 sentences based on what is visually evident in the image.",
  "recyclability_score": 85,
  "estimated_weight_range": "e.g. 2 - 5 kg",
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

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    const rawText = response.text().trim();
    
    // Clean markdown code blocks if the model wrapped it in ```json ... ```
    const cleanedJson = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: AIScanResult = JSON.parse(cleanedJson);

    // Validate essential fields
    if (!parsed.detected_material || !parsed.category_slug) {
      throw new Error('AI analysis produced an incomplete result. Please try another image.');
    }

    return parsed;
  } catch (err: any) {
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
      throw new Error('Invalid Gemini API Key. Please verify your Gemini API key in .env or scanner settings.');
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini API rate limit or quota exceeded. Please wait a moment or check your API quota.');
    }
    if (err.name === 'SyntaxError') {
      throw new Error('Could not parse AI response. The model did not return a structured JSON response. Please retake the photo.');
    }
    throw new Error(err.message || 'Failed to analyze image with Gemini AI.');
  }
}
