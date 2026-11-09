import { describe, it, expect } from 'vitest';
import { 
  normalizeWhatsAppNumber, 
  createWhatsAppLink, 
  buildExchangeWhatsAppMessage 
} from '../src/utils/whatsapp';

describe('GreenLoop WhatsApp Click-to-Chat Utility Tests', () => {
  describe('normalizeWhatsAppNumber()', () => {
    it('normalizes 10-digit Indian numbers by prepending country code 91', () => {
      expect(normalizeWhatsAppNumber('9497854095')).toBe('919497854095');
      expect(normalizeWhatsAppNumber('9876543210')).toBe('919876543210');
    });

    it('does NOT prepend 91 if the number already includes country code 91', () => {
      expect(normalizeWhatsAppNumber('+91 94978 54095')).toBe('919497854095');
      expect(normalizeWhatsAppNumber('919497854095')).toBe('919497854095');
      expect(normalizeWhatsAppNumber('+91 (987) 654-3210')).toBe('919876543210');
    });

    it('removes leading trunk zero before applying Indian country code', () => {
      expect(normalizeWhatsAppNumber('09497854095')).toBe('919497854095');
    });

    it('strips spaces, brackets, hyphens and symbols', () => {
      expect(normalizeWhatsAppNumber('+91-9497-854-095')).toBe('919497854095');
      expect(normalizeWhatsAppNumber('(949) 785-4095')).toBe('919497854095');
    });

    it('supports valid non-Indian international formats', () => {
      // UK number (+44 7911 123456 -> 12 digits)
      expect(normalizeWhatsAppNumber('+44 7911 123456')).toBe('447911123456');
      // US number (+1 555 234 5678 -> 11 digits)
      expect(normalizeWhatsAppNumber('+1 (555) 234-5678')).toBe('15552345678');
      // Germany number (+49 170 1234567 -> 12 digits)
      expect(normalizeWhatsAppNumber('+49 170 1234567')).toBe('491701234567');
    });

    it('throws error for empty, missing, or invalid numbers under 10 digits', () => {
      expect(() => normalizeWhatsAppNumber('')).toThrow(/WhatsApp number is required/);
      expect(() => normalizeWhatsAppNumber('12345')).toThrow(/Invalid WhatsApp number/);
      expect(() => normalizeWhatsAppNumber('abcd')).toThrow(/Invalid WhatsApp number/);
    });

    it('throws error for invalid numbers exceeding 15 digits', () => {
      expect(() => normalizeWhatsAppNumber('1234567890123456')).toThrow(/Invalid WhatsApp number/);
    });
  });

  describe('createWhatsAppLink()', () => {
    it('generates the exact expected wa.me Click-to-Chat URL matching the specification', () => {
      const url = createWhatsAppLink('9497854095');
      expect(url).toBe('https://wa.me/919497854095?text=Hi%21%20I%20am%20contacting%20you%20through%20GreenLoop.');
    });

    it('encodes custom prefilled messages safely with encodeURIComponent', () => {
      const customMsg = "Hi! I am contacting you through GreenLoop regarding your listing 'Dry Coconut Shells'. Our exchange request has been accepted. Let's coordinate the exchange.";
      const url = createWhatsAppLink('+91 94978 54095', customMsg);
      
      expect(url).toContain('https://wa.me/919497854095?text=');
      // Ensures exclamation marks and single quotes are safely encoded
      expect(url).toContain('Hi%21%20I%20am%20contacting%20you');
      expect(url).toContain('%27Dry%20Coconut%20Shells%27');
      expect(url).toContain('Let%27s%20coordinate');
      // Ensures no raw unencoded spaces or single quotes in query param
      expect(url).not.toContain(' ');
      expect(url).not.toContain("'");
    });

    it('never hardcodes fallback numbers', () => {
      expect(() => createWhatsAppLink('')).toThrow();
      expect(() => createWhatsAppLink('invalid')).toThrow();
    });
  });

  describe('buildExchangeWhatsAppMessage()', () => {
    it('constructs a professional contextual exchange coordination message', () => {
      const message = buildExchangeWhatsAppMessage({ listingTitle: 'Clean PET Bottles' });
      expect(message).toBe(
        "Hi! I am contacting you through GreenLoop regarding your listing 'Clean PET Bottles'. Our exchange request has been accepted. Let's coordinate the exchange."
      );
    });

    it('defaults gracefully if listing title is missing', () => {
      const message = buildExchangeWhatsAppMessage({ listingTitle: '' });
      expect(message).toContain("regarding your listing 'Material Listing'");
    });

    it('never includes private completion codes or pass codes', () => {
      const message = buildExchangeWhatsAppMessage({ listingTitle: 'Aluminium Cans' });
      expect(message).not.toContain('GL-');
      expect(message).not.toContain('code');
      expect(message).not.toContain('verification');
    });
  });
});

