import { WasteListing } from '../types';

export interface ExchangeParticipantRef {
  id?: string;
  provider_id?: string | null;
  requester_id: string;
  listing?: { user_id?: string | null } | null;
  listing_id?: string;
}

/**
 * Reliable, canonical participant resolution for GreenLoop exchange requests.
 * 
 * Rules:
 * - Provider: The user who created the waste listing (listing.user_id or exchange.provider_id).
 * - Requester: The user who submitted the request (exchange.requester_id).
 * - If current user is Provider -> returns Requester ID.
 * - If current user is Requester -> returns Provider ID.
 * - NEVER uses UI tabs (incoming/outgoing) as the source of truth.
 * - NEVER returns the current user's own ID.
 * - Returns null only if current user is unauthenticated or not an authorized participant.
 */
export function getExchangePartnerId(
  exchange: ExchangeParticipantRef | null | undefined,
  currentUserId?: string | null,
  listings?: WasteListing[]
): string | null {
  if (!exchange || !currentUserId) return null;

  // Resolve Provider ID with multi-layer fallback
  let providerId: string | null = exchange.provider_id || exchange.listing?.user_id || null;

  if (!providerId && listings && exchange.listing_id) {
    const matched = listings.find((l) => l.id === exchange.listing_id);
    if (matched && matched.user_id) {
      providerId = matched.user_id;
    }
  }

  const requesterId = exchange.requester_id || null;

  // Symmetrical resolution
  if (providerId && currentUserId === providerId) {
    // Current user is the Provider -> partner is the Requester
    return requesterId !== currentUserId ? requesterId : null;
  }

  if (requesterId && currentUserId === requesterId) {
    // Current user is the Requester -> partner is the Provider
    return providerId !== currentUserId ? providerId : null;
  }

  return null;
}

/**
 * Checks whether an exchange request is in a state where WhatsApp contact
 * coordination is permitted (strictly 'accepted' status).
 */
export function isWhatsAppContactAllowed(status?: string | null): boolean {
  return status === 'accepted';
}

/**
 * Checks whether a listing is currently reserved by an accepted exchange.
 */
export function isListingReserved(listing?: { status?: string | null } | null): boolean {
  return listing?.status === 'reserved';
}
