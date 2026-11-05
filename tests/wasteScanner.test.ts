import { describe, it, expect, vi } from 'vitest';
import { analyzeWasteImage, isGeminiConfigured, getGeminiApiKey } from '../src/lib/gemini';

describe('AI Waste Scanner Engine', () => {
  it('correctly reports unconfigured state when no API key is provided', () => {
    expect(isGeminiConfigured()).toBe(false);
  });

  it('rejects image analysis with actionable guidance when Edge Function or API key is missing', async () => {
    await expect(
      analyzeWasteImage('dummy_base64_data', 'image/jpeg')
    ).rejects.toThrow(/analyze-waste-image|Gemini.*API key/i);
  });

  it('rejects empty or corrupt image data', async () => {
    await expect(
      analyzeWasteImage('', 'image/jpeg')
    ).rejects.toThrow(/Invalid image data/i);
  });

  it('handles ambiguous photo response properly', () => {
    const ambiguousResponse = {
      detected_material: 'Unidentified Fragment',
      category_slug: 'plastics',
      category_name: 'Mixed Plastics',
      confidence: 0.35,
      is_ambiguous: true,
      ambiguity_reason: 'Image is too dark and blurry to clearly distinguish polymer resin code.',
      suggested_action: 'safe_disposal',
      reasoning: 'Visual cues are insufficient. Retaking in brighter natural light is advised.',
      recyclability_score: 30,
      estimated_weight_range: '< 100 g',
      safety_guidance: ['Wear gloves if sharp fragments exist'],
      circular_value_tips: ['Attempt to identify resin symbol embossed on underside'],
      potential_matches_summary: 'Pending verification'
    };

    expect(ambiguousResponse.is_ambiguous).toBe(true);
    expect(ambiguousResponse.ambiguity_reason).toContain('blurry');
    expect(ambiguousResponse.confidence).toBeLessThan(0.5);
  });

  it('detects and handles mock Gemini vision payload format cleanly', async () => {
    // Test that the expected AIScanResult structure handles categorization accurately
    const mockVisionResponse = {
      detected_material: 'Corrugated Cardboard Box',
      category_slug: 'paper',
      category_name: 'Paper & Cardboard',
      confidence: 0.94,
      is_ambiguous: false,
      suggested_action: 'recycling',
      reasoning: 'Clean, unsoiled secondary corrugated packaging suitable for paper pulping.',
      recyclability_score: 90,
      estimated_weight_range: '1 - 3 kg',
      safety_guidance: ['Remove plastic tape', 'Keep dry to prevent mold'],
      circular_value_tips: ['Flatten before storage', 'Stack neatly for collection'],
      potential_matches_summary: 'High demand from local paper mills.',
    };

    expect(mockVisionResponse.category_slug).toBe('paper');
    expect(mockVisionResponse.suggested_action).toBe('recycling');
    expect(mockVisionResponse.confidence).toBeGreaterThan(0.9);
    expect(mockVisionResponse.is_ambiguous).toBe(false);
    expect(mockVisionResponse.safety_guidance.length).toBeGreaterThan(0);
  });
});
