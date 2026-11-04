import { describe, it, expect } from 'vitest';
import { analyzeWasteImage } from '../src/lib/gemini';

describe('AI Waste Scanner Engine', () => {
  it('correctly classifies organic kitchen discards and suggests composting', async () => {
    const result = await analyzeWasteImage('dummy_base64', 'image/jpeg', 'vegetable_peels.jpg');
    expect(result.category_slug).toBe('organic');
    expect(result.suggested_action).toBe('composting');
    expect(result.confidence).toBeGreaterThan(90);
    expect(result.safety_guidance.length).toBeGreaterThan(0);
  });

  it('correctly identifies corrugated cardboard cartons as paper recyclables', async () => {
    const result = await analyzeWasteImage('dummy_base64', 'image/jpeg', 'cardboard_boxes.png');
    expect(result.category_slug).toBe('paper');
    expect(result.suggested_action).toBe('recycling');
    expect(result.recyclability_score).toBeGreaterThan(80);
  });

  it('flags electronic circuitry and recommends safe recovery', async () => {
    const result = await analyzeWasteImage('dummy_base64', 'image/jpeg', 'broken_cables_electronics.jpg');
    expect(result.category_slug).toBe('e-waste');
    expect(result.suggested_action).toBe('safe_disposal');
  });
});

