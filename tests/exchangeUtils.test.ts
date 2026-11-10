import { describe, it, expect } from 'vitest';
import { getExchangePartnerId, isWhatsAppContactAllowed, isListingReserved } from '../src/lib/exchangeUtils';
import { WasteListing } from '../src/types';

describe('GreenLoop Exchange Participant Resolution & Lifecycle Utilities', () => {
  const PROVIDER_ID = 'usr-provider-1111';
  const REQUESTER_ID = 'usr-requester-2222';
  const INTRUDER_ID = 'usr-intruder-3333';
  const LISTING_ID = 'list-mat-5555';

  const mockListing: WasteListing = {
    id: LISTING_ID,
    user_id: PROVIDER_ID,
    category_id: 'cat-plastics',
    title: 'Clean Sorted PET Flakes',
    quantity: 50,
    unit: 'kg',
    listing_type: 'free',
    price: 0,
    district: 'Ernakulam',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  it('reliably returns Requester ID when current user is Provider (with provider_id on request)', () => {
    const exchange = {
      id: 'req-01',
      provider_id: PROVIDER_ID,
      requester_id: REQUESTER_ID,
      listing_id: LISTING_ID,
    };

    const partnerId = getExchangePartnerId(exchange, PROVIDER_ID);
    expect(partnerId).toBe(REQUESTER_ID);
  });

  it('reliably returns Provider ID when current user is Requester (with provider_id on request)', () => {
    const exchange = {
      id: 'req-01',
      provider_id: PROVIDER_ID,
      requester_id: REQUESTER_ID,
      listing_id: LISTING_ID,
    };

    const partnerId = getExchangePartnerId(exchange, REQUESTER_ID);
    expect(partnerId).toBe(PROVIDER_ID);
  });

  it('correctly resolves Provider ID from joined listing when provider_id is null on request', () => {
    const exchangeWithoutProviderId = {
      id: 'req-02',
      provider_id: null,
      requester_id: REQUESTER_ID,
      listing_id: LISTING_ID,
      listing: { user_id: PROVIDER_ID },
    };

    // Requester queries partner
    expect(getExchangePartnerId(exchangeWithoutProviderId, REQUESTER_ID)).toBe(PROVIDER_ID);

    // Provider queries partner
    expect(getExchangePartnerId(exchangeWithoutProviderId, PROVIDER_ID)).toBe(REQUESTER_ID);
  });

  it('correctly resolves Provider ID from listings array fallback when listing join is null', () => {
    const exchangeWithNullJoin = {
      id: 'req-03',
      provider_id: null,
      requester_id: REQUESTER_ID,
      listing_id: LISTING_ID,
      listing: null,
    };

    const partnerId = getExchangePartnerId(exchangeWithNullJoin, REQUESTER_ID, [mockListing]);
    expect(partnerId).toBe(PROVIDER_ID);
  });

  it('strictly NEVER returns current user own ID as partner', () => {
    const exchange = {
      id: 'req-04',
      provider_id: PROVIDER_ID,
      requester_id: PROVIDER_ID, // Corrupted / test case
      listing_id: LISTING_ID,
    };

    expect(getExchangePartnerId(exchange, PROVIDER_ID)).toBeNull();
  });

  it('returns null when caller is an unrelated third party (intruder)', () => {
    const exchange = {
      id: 'req-05',
      provider_id: PROVIDER_ID,
      requester_id: REQUESTER_ID,
      listing_id: LISTING_ID,
    };

    expect(getExchangePartnerId(exchange, INTRUDER_ID)).toBeNull();
  });

  it('returns null when current user is unauthenticated / null', () => {
    const exchange = {
      id: 'req-06',
      provider_id: PROVIDER_ID,
      requester_id: REQUESTER_ID,
      listing_id: LISTING_ID,
    };

    expect(getExchangePartnerId(exchange, null)).toBeNull();
    expect(getExchangePartnerId(exchange, undefined)).toBeNull();
  });

  it('isWhatsAppContactAllowed is true ONLY for accepted status', () => {
    expect(isWhatsAppContactAllowed('accepted')).toBe(true);
    expect(isWhatsAppContactAllowed('pending')).toBe(false);
    expect(isWhatsAppContactAllowed('rejected')).toBe(false);
    expect(isWhatsAppContactAllowed('cancelled')).toBe(false);
    expect(isWhatsAppContactAllowed('completed')).toBe(false);
    expect(isWhatsAppContactAllowed(null)).toBe(false);
  });

  it('isListingReserved correctly identifies reserved listings', () => {
    expect(isListingReserved({ status: 'reserved' })).toBe(true);
    expect(isListingReserved({ status: 'active' })).toBe(false);
    expect(isListingReserved({ status: 'completed' })).toBe(false);
    expect(isListingReserved(null)).toBe(false);
  });
});

