/**
 * GreenLoop — WhatsApp Click-to-Chat & Number Normalization Utilities
 *
 * Provides dynamic, secure WhatsApp link generation using standard https://wa.me/ URLs.
 * Never hardcodes phone numbers and ensures Indian phone numbers default to +91.
 */

/**
 * Normalizes an international phone number to digits-only format suitable for wa.me links.
 * - Strips all non-digit characters.
 * - Handles Indian phone numbers: If 10 digits, prepends India country code '91'.
 * - If 11 digits starting with leading 0 (trunk prefix), removes the 0 and prepends '91' if 10 digits remain.
 * - If already starting with country code '91' and 12 digits long, preserves '91' without double-prepending.
 * - Enforces standard E.164 length constraints (10 to 15 digits).
 */
export function normalizeWhatsAppNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error('WhatsApp number is required');
  }

  // Strip all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');

  // Strip single leading zero (e.g. 09497854095 -> 9497854095)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // If 10 digits, assume India (+91) standard mobile number
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  // E.164 international phone number format: between 10 and 15 digits
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Invalid WhatsApp number: Must contain between 10 and 15 digits');
  }

  return digits;
}

/**
 * Strictly encodes URI component conforming to strict RFC 3986,
 * ensuring characters such as '!' are encoded as '%21' (e.g. Hi%21).
 */
export function encodeWhatsAppText(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Generates a WhatsApp Click-to-Chat URL (https://wa.me/<number>?text=<encodedMessage>)
 * dynamically with the recipient's normalized phone number and prefilled message.
 *
 * Example:
 * createWhatsAppLink('9497854095', 'Hi! I am contacting you through GreenLoop.')
 * => 'https://wa.me/919497854095?text=Hi%21%20I%20am%20contacting%20you%20through%20GreenLoop.'
 */
export function createWhatsAppLink(
  phoneNumber: string,
  message?: string
): string {
  const phone = normalizeWhatsAppNumber(phoneNumber);

  const defaultMessage = 'Hi! I am contacting you through GreenLoop.';
  const text = encodeWhatsAppText(message || defaultMessage);

  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Generates a contextual, meaningful prefilled message for an accepted exchange.
 *
 * Explicit Security Guarantee:
 * Never includes private completion codes, pass codes, or sensitive authentication tokens in the URL.
 *
 * Example:
 * "Hi! I am contacting you through GreenLoop regarding your listing 'Cardboard Boxes'. Our exchange request has been accepted. Let's coordinate the exchange."
 */
export function buildExchangeWhatsAppMessage(options: {
  listingTitle: string;
}): string {
  const title = options.listingTitle?.trim() || 'Material Listing';
  return `Hi! I am contacting you through GreenLoop regarding your listing '${title}'. Our exchange request has been accepted. Let's coordinate the exchange.`;
}

