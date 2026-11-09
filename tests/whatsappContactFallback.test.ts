import { describe, it, expect } from 'vitest';

describe('GreenLoop WhatsApp Contact Fallback & Two-Way Exchange Retrieval Tests', () => {
  interface MockProfile {
    id: string;
    full_name: string;
    phone?: string | null;
    whatsapp_number?: string | null;
    share_whatsapp_with_exchange?: boolean;
  }

  interface MockExchangeRequest {
    id: string;
    listing_id: string;
    requester_id: string;
    provider_id: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    listing?: { title: string; user_id: string };
  }

  // Pure function simulating getWhatsAppContact resolution logic
  function resolveContact(
    exchangeRequestId: string,
    participantId: string,
    currentUserId: string,
    exchangeRequests: MockExchangeRequest[],
    profilesDb: Record<string, MockProfile>
  ) {
    if (!exchangeRequestId || !participantId) {
      return {
        participant_id: participantId,
        whatsapp: null,
        has_whatsapp_consent: false,
        contact_state: 'missing_number',
        notice: 'Participant details missing',
      };
    }

    // Disallow self-messaging query
    if (participantId === currentUserId) {
      return {
        participant_id: participantId,
        whatsapp: null,
        has_whatsapp_consent: false,
        contact_state: 'error',
        notice: 'Cannot retrieve WhatsApp contact for self.',
      };
    }

    const req = exchangeRequests.find((r) => r.id === exchangeRequestId);
    if (!req) {
      return {
        participant_id: participantId,
        whatsapp: null,
        has_whatsapp_consent: false,
        contact_state: 'missing_number',
        notice: 'Exchange request not found',
      };
    }

    if (req.status !== 'accepted') {
      return {
        participant_id: participantId,
        whatsapp: null,
        has_whatsapp_consent: false,
        status: req.status,
        contact_state: 'missing_number',
        notice: 'WhatsApp contact is only accessible while the exchange request is in accepted status.',
      };
    }

    // Direct Query Fallback to profiles table
    const partnerProfile = profilesDb[participantId];
    let rawWa: string | null = partnerProfile?.phone || partnerProfile?.whatsapp_number || null;
    let targetConsent = partnerProfile?.share_whatsapp_with_exchange ?? true;

    if (!rawWa) {
      return {
        participant_id: participantId,
        whatsapp: null,
        has_whatsapp_consent: Boolean(targetConsent),
        contact_state: 'missing_number',
        status: req.status,
        notice: 'Partner has not added a WhatsApp number yet.',
      };
    }

    const digits = rawWa.replace(/\D/g, '');
    const cleanDigits = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;

    if (cleanDigits.length < 10 || cleanDigits.length > 15) {
      return {
        participant_id: participantId,
        whatsapp: null,
        has_whatsapp_consent: Boolean(targetConsent),
        contact_state: 'invalid_number',
        status: req.status,
        notice: 'Partner WhatsApp contact number format is invalid.',
      };
    }

    if (targetConsent === false) {
      return {
        participant_id: participantId,
        whatsapp: null,
        has_whatsapp_consent: false,
        contact_state: 'sharing_disabled',
        status: req.status,
        notice: 'Partner has opted not to share their WhatsApp contact.',
      };
    }

    const cleanWa = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    return {
      participant_id: participantId,
      whatsapp: cleanWa,
      has_whatsapp_consent: true,
      contact_state: 'sharing_enabled',
      status: req.status,
      notice: 'WhatsApp contact active for exchange coordination.',
    };
  }

  const USER_1_PROVIDER = 'usr-provider-1111';
  const USER_2_REQUESTER = 'usr-requester-2222';
  const EXCHANGE_ID = 'ex-accepted-9999';

  const mockProfiles: Record<string, MockProfile> = {
    [USER_1_PROVIDER]: {
      id: USER_1_PROVIDER,
      full_name: 'Haritha Waste Generator',
      phone: '+91 94978 54095', // Stored in base column 'phone'
      whatsapp_number: null,    // whatsapp_number column initially null
      share_whatsapp_with_exchange: true,
    },
    [USER_2_REQUESTER]: {
      id: USER_2_REQUESTER,
      full_name: 'Kerala Recycler Org',
      phone: '9876543210',     // 10 digits in base column 'phone'
      whatsapp_number: null,
      share_whatsapp_with_exchange: true,
    },
  };

  const mockExchange: MockExchangeRequest = {
    id: EXCHANGE_ID,
    listing_id: 'list-1234',
    provider_id: USER_1_PROVIDER,
    requester_id: USER_2_REQUESTER,
    status: 'accepted',
    listing: { title: 'Clean PET Bottles', user_id: USER_1_PROVIDER },
  };

  it('allows User 1 (Provider) to retrieve User 2 (Requester) WhatsApp contact', () => {
    const result = resolveContact(
      EXCHANGE_ID,
      USER_2_REQUESTER, // Participant requested
      USER_1_PROVIDER,  // Current user (caller)
      [mockExchange],
      mockProfiles
    );

    expect(result.contact_state).toBe('sharing_enabled');
    expect(result.whatsapp).toBe('919876543210');
    expect(result.has_whatsapp_consent).toBe(true);
    expect(result.participant_id).toBe(USER_2_REQUESTER);
  });

  it('allows User 2 (Requester) to retrieve User 1 (Provider) WhatsApp contact', () => {
    const result = resolveContact(
      EXCHANGE_ID,
      USER_1_PROVIDER,  // Participant requested
      USER_2_REQUESTER, // Current user (caller)
      [mockExchange],
      mockProfiles
    );

    expect(result.contact_state).toBe('sharing_enabled');
    expect(result.whatsapp).toBe('919497854095');
    expect(result.has_whatsapp_consent).toBe(true);
    expect(result.participant_id).toBe(USER_1_PROVIDER);
  });

  it('strictly blocks self-retrieval (User 1 requesting User 1)', () => {
    const result = resolveContact(
      EXCHANGE_ID,
      USER_1_PROVIDER, // Target is self
      USER_1_PROVIDER, // Current user
      [mockExchange],
      mockProfiles
    );

    expect(result.contact_state).toBe('error');
    expect(result.whatsapp).toBeNull();
    expect(result.notice).toContain('Cannot retrieve WhatsApp contact for self');
  });

  it('strictly blocks contact retrieval for pending exchanges', () => {
    const pendingExchange: MockExchangeRequest = {
      ...mockExchange,
      id: 'ex-pending-0001',
      status: 'pending',
    };

    const result = resolveContact(
      'ex-pending-0001',
      USER_2_REQUESTER,
      USER_1_PROVIDER,
      [pendingExchange],
      mockProfiles
    );

    expect(result.contact_state).toBe('missing_number');
    expect(result.whatsapp).toBeNull();
    expect(result.notice).toContain('only accessible while the exchange request is in accepted status');
  });

  it('accurately reports missing_number when partner has not entered a number', () => {
    const emptyProfiles = {
      ...mockProfiles,
      [USER_2_REQUESTER]: {
        ...mockProfiles[USER_2_REQUESTER],
        phone: null,
        whatsapp_number: null,
      },
    };

    const result = resolveContact(
      EXCHANGE_ID,
      USER_2_REQUESTER,
      USER_1_PROVIDER,
      [mockExchange],
      emptyProfiles
    );

    expect(result.contact_state).toBe('missing_number');
    expect(result.whatsapp).toBeNull();
    expect(result.notice).toBe('Partner has not added a WhatsApp number yet.');
  });

  it('respects sharing_disabled when partner opts out', () => {
    const optOutProfiles = {
      ...mockProfiles,
      [USER_2_REQUESTER]: {
        ...mockProfiles[USER_2_REQUESTER],
        share_whatsapp_with_exchange: false,
      },
    };

    const result = resolveContact(
      EXCHANGE_ID,
      USER_2_REQUESTER,
      USER_1_PROVIDER,
      [mockExchange],
      optOutProfiles
    );

    expect(result.contact_state).toBe('sharing_disabled');
    expect(result.whatsapp).toBeNull();
    expect(result.notice).toContain('Partner has opted not to share');
  });
});
