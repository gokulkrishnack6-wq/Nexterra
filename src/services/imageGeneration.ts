/**
 * GreenLoop AI Waste Listing Image Generation Service
 *
 * Automatically synthesizes realistic, high-fidelity illustrative photographs
 * for waste materials when users publish listings without an uploaded photo.
 *
 * Security & Reliability:
 * - Server-side Edge Function invocation via Supabase.
 * - Zero private API keys exposed to the client.
 * - Stores generated images to Supabase Storage ('listing-images').
 * - Preserves user uploaded photos (never overwrites).
 * - Graceful fallback to verified category assets on failure (never blocks publishing).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { WasteListing } from '../types';

export interface GenerateListingImageParams {
  title: string;
  category_id?: string;
  category_slug?: string;
  material_type?: string;
  description?: string;
  listing_id?: string;
  user_id?: string;
}

export interface GeneratedImageResult {
  success: boolean;
  image_url: string;
  is_ai_image: boolean;
  provider: string;
  storage_path?: string;
  prompt_used?: string;
  is_fallback?: boolean;
}

// Verified high-definition circular material assets tailored for Kerala's 9 categories
export const CATEGORY_ILLUSTRATIVE_FALLBACKS: Record<string, string> = {
  plastics: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
  paper: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80',
  organic: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  agricultural: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  metals: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
  glass: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  'e-waste': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
  textiles: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80',
  other: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
};

/**
 * Builds a realistic photographic prompt tailored for circular waste materials.
 * Enforces clean neutral backgrounds, realistic material textures, and zero text/watermarks.
 */
export function buildWasteImagePrompt(
  title: string,
  materialType?: string,
  category?: string
): string {
  const cleanTitle = title.trim();
  const cleanMaterial = (materialType || '').trim();

  return [
    `A realistic authentic photograph of clean ${cleanTitle}`,
    cleanMaterial && cleanMaterial.toLowerCase() !== cleanTitle.toLowerCase()
      ? `(${cleanMaterial})`
      : '',
    'collected recyclable waste material',
    'clean neutral concrete or wooden surface background',
    'studio diffuse natural lighting',
    'sharp clear focus',
    'high quality realistic texture',
    'centered composition',
    'no text',
    'no labels',
    'no watermarks',
    'no logos',
    'no humans'
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Checks whether a listing's primary image was AI-generated.
 */
export function isAiGeneratedImage(listing: Partial<WasteListing> | null | undefined): boolean {
  if (!listing) return false;
  if (listing.is_ai_image) return true;
  if (!listing.images || listing.images.length === 0) return false;

  const firstImg = listing.images[0];
  if (typeof firstImg !== 'string') return false;

  return (
    firstImg.includes('ai-generated') ||
    firstImg.includes('/ai-generated/') ||
    firstImg.includes('pollinations.ai') ||
    firstImg.includes('image.pollinations')
  );
}

/**
 * Main Image Generation Entrypoint:
 * Coordinates Edge Function generation, FLUX.1 fallback, Supabase Storage persistence,
 * and resilient category fallback assets.
 */
export async function generateListingImage(
  params: GenerateListingImageParams
): Promise<GeneratedImageResult> {
  const {
    title,
    category_id,
    category_slug,
    material_type,
    description,
    listing_id,
    user_id,
  } = params;

  const targetCategory = category_slug || category_id || 'other';

  // 1. Primary Route: Supabase Edge Function 'generate-listing-image'
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-image', {
        body: {
          title,
          category: targetCategory,
          material_type,
          description,
          listing_id,
          user_id,
        },
      });

      if (!error && data?.image_url) {
        return {
          success: true,
          image_url: data.image_url,
          is_ai_image: true,
          provider: data.provider || 'flux-edge',
          storage_path: data.storage_path,
          prompt_used: data.prompt_used,
          is_fallback: Boolean(data.is_fallback),
        };
      }
    } catch (_) {
      // Continue to dual-function route
    }

    // Secondary Route: 'analyze-waste-image' with action 'generate-listing-image'
    try {
      const { data, error } = await supabase.functions.invoke('analyze-waste-image', {
        body: {
          action: 'generate-listing-image',
          title,
          category: targetCategory,
          material_type,
          description,
          listing_id,
        },
      });

      if (!error && data?.image_url) {
        return {
          success: true,
          image_url: data.image_url,
          is_ai_image: true,
          provider: data.provider || 'flux-edge',
          storage_path: data.storage_path,
          prompt_used: data.prompt_used,
          is_fallback: Boolean(data.is_fallback),
        };
      }
    } catch (_) {
      // Continue to direct high-fidelity client route
    }
  }

  // 2. Direct High-Fidelity Client Route via FLUX.1 Pipeline
  // (Zero API key required, zero credential leakage, 100% realistic photographic outputs)
  try {
    const fullPrompt = buildWasteImagePrompt(title, material_type, targetCategory);
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.abs(
      (title + targetCategory).split('').reduce(
        (acc, char) => (acc << 5) - acc + char.charCodeAt(0),
        0
      )
    ) % 1000000;

    const directGenerationUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&model=flux&nologo=true&seed=${seed}`;

    // Attempt to persist the image into Supabase Storage if authenticated client is available
    if (isSupabaseConfigured && typeof window !== 'undefined') {
      try {
        const fetchRes = await fetch(directGenerationUrl);
        if (fetchRes && fetchRes.ok) {
          const blob = await fetchRes.blob();
          if (blob.size > 1000) {
            const safeId =
              listing_id ||
              (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `item-${Date.now()}`);
            const filePath = `ai-generated/${safeId}-${Date.now()}.jpg`;

            const { error: uploadErr } = await supabase.storage
              .from('listing-images')
              .upload(filePath, blob, {
                contentType: 'image/jpeg',
                upsert: true,
                cacheControl: '31536000',
              });

            if (!uploadErr) {
              const { data: pubData } = supabase.storage
                .from('listing-images')
                .getPublicUrl(filePath);

              if (pubData?.publicUrl) {
                return {
                  success: true,
                  image_url: pubData.publicUrl,
                  is_ai_image: true,
                  provider: 'flux-schnell',
                  storage_path: filePath,
                  prompt_used: fullPrompt,
                };
              }
            }
          }
        } else {
          // If response not ok, throw so outer catch triggers resilient category fallback
          throw new Error(`Generation endpoint returned status: ${fetchRes?.status}`);
        }
      } catch (storageErr) {
        console.warn('Storage upload or generation fetch error, applying category fallback:', storageErr);
        throw storageErr;
      }
    }

    // Direct generative URL (instantly viewable and accessible by all users)
    return {
      success: true,
      image_url: directGenerationUrl,
      is_ai_image: true,
      provider: 'flux-schnell',
      prompt_used: fullPrompt,
    };
  } catch (clientErr) {
    console.warn('Direct image generation failed, applying curated category fallback:', clientErr);
  }

  // 3. Resilient Category Fallback: Never leave a listing without a valid image
  const normCat = targetCategory.toLowerCase().replace(/^cat-/, '');
  const fallbackUrl = CATEGORY_ILLUSTRATIVE_FALLBACKS[normCat] || CATEGORY_ILLUSTRATIVE_FALLBACKS.other;

  return {
    success: false,
    image_url: fallbackUrl,
    is_ai_image: true,
    is_fallback: true,
    provider: 'category-fallback',
  };
}
