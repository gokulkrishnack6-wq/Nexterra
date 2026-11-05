import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIScanResult } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * AI Waste Scanner Service
 * Connects the frontend camera and image upload interface to the secure
 * Supabase Edge Function: `analyze-waste-image`.
 *
 * The Gemini API key is kept secure inside the Supabase backend secret (GEMINI_API_KEY)
 * and is NEVER exposed in the frontend client or Vite environment variables.
 */

// Optional session key (only if the user explicitly enters a key in UI for quick local testing)
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    const sessionKey = window.sessionStorage.getItem('greenloop_user_gemini_key');
    if (sessionKey && sessionKey.trim().length > 20) {
      return sessionKey.trim();
    }
  }
  return '';
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
  return Boolean(getGeminiApiKey());
}

/**
 * Main Waste Image Analysis Entrypoint
 * Invokes the Supabase Edge Function `analyze-waste-image`.
 */
export async function analyzeWasteImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<AIScanResult> {
  if (!imageBase64 || imageBase64.length < 10) {
    throw new Error('Invalid image data. Please capture or upload a valid photo.');
  }

  // Strip data:image/...;base64, prefix if present
  const cleanBase64 = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  // 1. Primary Route: Secure Supabase Edge Function
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-waste-image', {
        body: {
          imageBase64: cleanBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      });

      if (!error && data && data.detected_material) {
        return data as AIScanResult;
      }

      if (error) {
        let errorDetail = error.message || 'Edge Function call failed';

        // Check if context has error JSON payload from the function
        if ((error as any).context && typeof (error as any).context.json === 'function') {
          try {
            const errJson = await (error as any).context.json();
            if (errJson?.error) {
              errorDetail = errJson.error;
            }
            if (errJson?.hint) {
              errorDetail += ` — ${errJson.hint}`;
            }
          } catch (_) {
            // Keep default errorDetail
          }
        }

        // If a local session key is provided in UI, fallback to client-side call
        const sessionKey = getGeminiApiKey();
        if (sessionKey) {
          console.warn('Edge Function unreachable, falling back to session key:', errorDetail);
          return await analyzeDirectWithClient(cleanBase64, mimeType, sessionKey);
        }

        // Friendly guidance if the edge function is not deployed yet or secrets are missing
        if (
          errorDetail.includes('404') ||
          errorDetail.includes('FunctionsFetchError') ||
          errorDetail.includes('Failed to send a request') ||
          errorDetail.includes('Failed to fetch')
        ) {
          throw new Error(
            'The Supabase Edge Function "analyze-waste-image" is not deployed yet. Please deploy it using: npx supabase functions deploy analyze-waste-image --project-ref czytsaajiicpivjkrbey'
          );
        }

        throw new Error(errorDetail);
      }
    } catch (err: any) {
      const sessionKey = getGeminiApiKey();
      if (sessionKey) {
        return await analyzeDirectWithClient(cleanBase64, mimeType, sessionKey);
      }
      throw err;
    }
  }

  // 2. Secondary Route: Client-side with user session key if Supabase is unconfigured
  const sessionKey = getGeminiApiKey();
  if (sessionKey) {
    return await analyzeDirectWithClient(cleanBase64, mimeType, sessionKey);
  }

  throw new Error(
    'Gemini Vision API key is not configured. Please ensure the Supabase Edge Function "analyze-waste-image" has secret GEMINI_API_KEY set, or enter your key in Scanner Settings.'
  );
}

/**
 * Client-side fallback analyzer using GoogleGenerativeAI SDK
 * (used when testing locally with a session key)
 */
async function analyzeDirectWithClient(
  cleanBase64: string,
  mimeType: string,
  apiKey: string
): Promise<AIScanResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
    }
  });

  const prompt = `
You are an expert waste classification and circular materials engineer for GreenLoop in Kerala.
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
  "detected_material": "Specific material name",
  "category_slug": "exact slug from the 8 categories above",
  "category_name": "Human-readable Category Title",
  "subcategory": "Specific subcategory or polymer/grade if applicable",
  "confidence": 92.0,
  "is_ambiguous": false,
  "ambiguity_reason": "",
  "visible_characteristics": [
    "Feature 1 observed in the image",
    "Feature 2 observed in the image"
  ],
  "suggested_action": "one of: composting, upcycling, recycling, safe_disposal, bio_methanation",
  "reasoning": "2-3 sentences based on what is visually evident in the image.",
  "recyclability_score": 85,
  "estimated_weight_range": "e.g. 1 - 3 kg",
  "safety_guidance": [
    "Handling tip 1",
    "Handling tip 2"
  ],
  "circular_value_tips": [
    "Ecological reuse tip 1",
    "Carbon diversion impact"
  ],
  "potential_matches_summary": "Recommended local recipients"
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

    const cleanedJson = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: AIScanResult = JSON.parse(cleanedJson);

    if (!parsed.detected_material || !parsed.category_slug) {
      throw new Error('AI analysis produced an incomplete result. Please try another image.');
    }

    return parsed;
  } catch (err: any) {
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
      throw new Error('Invalid Gemini API Key. Please verify your Gemini API key in Supabase secrets or scanner settings.');
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini API rate limit or quota exceeded. Please wait a moment.');
    }
    if (err.name === 'SyntaxError') {
      throw new Error('Could not parse AI response. The model did not return a structured JSON response. Please retake the photo.');
    }
    throw new Error(err.message || 'Failed to analyze image with Gemini AI.');
  }
}
