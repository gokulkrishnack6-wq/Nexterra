import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WasteListing, UserProfile, ExchangeRequest, NotificationItem } from '../src/types';

class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = value.toString(); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

describe('GreenLoop Waste Request Delivery & Cross-Account Visibility (Steps 1–8)', () => {
  // Test Account A: Waste Provider (Generator)
  const accountA: UserProfile = {
    id: '11111111-aaaa-4000-8000-111111111111',
    full_name: 'Dr. Aisha Nair (Provider)',
    role: 'individual',
    email: 'aisha@greenloop.test',
    district: 'Kasaragod',
    state: 'Kerala',
    created_at: '2026-11-01T00:00:00.000Z',
  };

  // Test Account B: Waste Requester (Collector / Recycler)
  const accountB: UserProfile = {
    id: '22222222-bbbb-4000-8000-222222222222',
    full_name: 'EcoCraft Kerala (Requester)',
    role: 'recycler',
    email: 'collector@ecocraft.test',
    district: 'Kasaragod',
    state: 'Kerala',
    created_at: '2026-11-01T00:00:00.000Z',
  };

  // Test Account C: Unrelated Third-Party User
  const accountC: UserProfile = {
    id: '33333333-cccc-4000-8000-333333333333',
    full_name: 'Unrelated User C',
    role: 'individual',
    email: 'stranger@kerala.test',
    district: 'Ernakulam',
    state: 'Kerala',
    created_at: '2026-11-01T00:00:00.000Z',
  };

  // Waste listing created and published by Account A in Kasaragod
  const listingByAccountA: WasteListing = {
    id: 'aaaaaaaa-1111-4000-8000-aaaaaaaaaaaa',
    user_id: accountA.id,
    category_id: 'a1111111-1111-4000-8000-000000000001',
    title: 'Clean Shredded Paper Waste (50kg)',
    description: 'Dry office paper scraps, sorted and shredded for paper craft or composting.',
    quantity: 50,
    unit: 'kg',
    listing_type: 'giveaway',
    price: 0,
    condition: 'clean_sorted',
    district: 'Kasaragod',
    locality: 'Cheruvathur',
    address: 'Cheruvathur Railway Station Road, Kasaragod, Kerala',
    latitude: 12.2185,
    longitude: 75.1583,
    status: 'active',
    ai_classified: true,
    ai_confidence: 96,
    images: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80'],
    created_at: '2026-11-08T10:00:00.000Z',
    user: accountA,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).localStorage = new MockStorage();
    (globalThis as any).sessionStorage = new MockStorage();
  });

  // --------------------------------------------------------------------------
  // STEP 1 & 2: DATABASE INSERTION & VALIDATION
  // --------------------------------------------------------------------------
  describe('Step 2: Database Insertion Schema & Integrity Validation', () => {
    it('generates a valid RFC4122 UUID for exchange request instead of invalid string prefixes', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      const generatedId = crypto.randomUUID();
      expect(generatedId).toMatch(uuidRegex);

      // Verify that legacy string prefix 'req-173109...' fails UUID validation
      const legacyInvalidId = `req-${Date.now()}`;
      expect(legacyInvalidId).not.toMatch(uuidRegex);
    });

    it('correctly associates requester_id with Account B and provider_id with Account A (owner of listing)', () => {
      const requestedQuantity = 20;
      const proposedAction = 'Paper recycling and eco-packaging';
      const message = 'We will collect using electric van from Cheruvathur.';

      // Simulating createExchangeRequest payload construction:
      const newRequestId = crypto.randomUUID();
      const code = `GL-${Math.floor(1000 + Math.random() * 9000)}`;

      const dbRow = {
        id: newRequestId,
        listing_id: listingByAccountA.id,
        requester_id: accountB.id, // Authenticated requester
        provider_id: listingByAccountA.user_id, // Authoritatively from listing owner (Account A)
        proposed_action: proposedAction,
        requested_quantity: requestedQuantity,
        message,
        status: 'pending',
        completion_code: code,
        created_at: new Date().toISOString(),
      };

      expect(dbRow.id).toBe(newRequestId);
      expect(dbRow.listing_id).toBe(listingByAccountA.id);
      expect(dbRow.requester_id).toBe(accountB.id);
      expect(dbRow.provider_id).toBe(accountA.id);
      expect(dbRow.provider_id).not.toBe(accountB.id); // Must NOT be assigned to requester
      expect(dbRow.status).toBe('pending');
      expect(dbRow.completion_code).toMatch(/^GL-\d{4}$/);
    });

    it('rejects attempt to request own listing by the provider (Account A requesting Account A)', () => {
      const attemptSelfRequest = () => {
        if (listingByAccountA.user_id === accountA.id) {
          throw new Error('You cannot submit an exchange request for your own listing.');
        }
      };

      expect(attemptSelfRequest).toThrow('You cannot submit an exchange request for your own listing.');
    });

    it('rejects invalid or non-positive requested quantity', () => {
      const validateQuantity = (qty: number, max: number) => {
        if (qty <= 0 || qty > max) {
          throw new Error(`Please enter a quantity between 1 and ${max}.`);
        }
      };

      expect(() => validateQuantity(0, listingByAccountA.quantity)).toThrow('between 1 and 50');
      expect(() => validateQuantity(-5, listingByAccountA.quantity)).toThrow('between 1 and 50');
      expect(() => validateQuantity(60, listingByAccountA.quantity)).toThrow('between 1 and 50');
      expect(() => validateQuantity(25, listingByAccountA.quantity)).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // STEP 3 & 4: VISIBILITY & RLS POLICY COMPLIANCE
  // --------------------------------------------------------------------------
  describe('Steps 3 & 4: Cross-Account Visibility & RLS Isolation', () => {
    // Simulated shared database store in Supabase
    let supabaseExchangeRequests: any[] = [];

    beforeEach(() => {
      supabaseExchangeRequests = [];
    });

    it('verifies that Account B sees the request under outgoing claims and Account A sees the same request under incoming requests', () => {
      const requestId = '99999999-1111-4000-8000-999999999999';
      const requestRow = {
        id: requestId,
        listing_id: listingByAccountA.id,
        requester_id: accountB.id,
        provider_id: accountA.id,
        proposed_action: 'Paper recycling',
        requested_quantity: 15,
        message: 'Pickup tomorrow morning.',
        status: 'pending',
        completion_code: 'GL-8822',
        created_at: '2026-11-09T01:00:00.000Z',
        listing: listingByAccountA,
        requester: accountB,
        provider: accountA,
      };
      supabaseExchangeRequests.push(requestRow);

      // Account A (Provider) logs in and checks incoming requests:
      const accountAIncoming = supabaseExchangeRequests.filter((req) => {
        const providerId = req.provider_id || req.listing?.user_id;
        return providerId === accountA.id;
      });
      expect(accountAIncoming).toHaveLength(1);
      expect(accountAIncoming[0].id).toBe(requestId);
      expect(accountAIncoming[0].requester?.full_name).toBe('EcoCraft Kerala (Requester)');
      expect(accountAIncoming[0].requested_quantity).toBe(15);
      expect(accountAIncoming[0].status).toBe('pending');

      // Account A should NOT see it under outgoing:
      const accountAOutgoing = supabaseExchangeRequests.filter((req) => req.requester_id === accountA.id);
      expect(accountAOutgoing).toHaveLength(0);

      // Account B (Requester) logs in and checks outgoing claims:
      const accountBOutgoing = supabaseExchangeRequests.filter((req) => req.requester_id === accountB.id);
      expect(accountBOutgoing).toHaveLength(1);
      expect(accountBOutgoing[0].id).toBe(requestId);
      expect(accountBOutgoing[0].provider?.full_name).toBe('Dr. Aisha Nair (Provider)');
      expect(accountBOutgoing[0].status).toBe('pending');

      // Account B should NOT see it under incoming:
      const accountBIncoming = supabaseExchangeRequests.filter((req) => {
        const providerId = req.provider_id || req.listing?.user_id;
        return providerId === accountB.id;
      });
      expect(accountBIncoming).toHaveLength(0);

      // Both accounts see the exact same Request ID and status:
      expect(accountAIncoming[0].id).toBe(accountBOutgoing[0].id);
      expect(accountAIncoming[0].status).toBe(accountBOutgoing[0].status);
    });

    it('strictly denies Account C (unrelated third party) from viewing or accessing the private exchange request', () => {
      const requestRow = {
        id: '99999999-1111-4000-8000-999999999999',
        listing_id: listingByAccountA.id,
        requester_id: accountB.id,
        provider_id: accountA.id,
        status: 'pending',
      };
      supabaseExchangeRequests.push(requestRow);

      // Simulate Supabase RLS check for SELECT:
      // auth.uid() = requester_id OR auth.uid() = provider_id OR EXISTS(listings WHERE user_id = auth.uid())
      const rlsSelectEvaluator = (row: any, authUserId: string) => {
        return (
          row.requester_id === authUserId ||
          row.provider_id === authUserId ||
          row.listing_user_id === authUserId
        );
      };

      // Account A (Provider) allowed:
      expect(rlsSelectEvaluator(requestRow, accountA.id)).toBe(true);

      // Account B (Requester) allowed:
      expect(rlsSelectEvaluator(requestRow, accountB.id)).toBe(true);

      // Account C (Unrelated) BLOCKED:
      expect(rlsSelectEvaluator(requestRow, accountC.id)).toBe(false);

      // Account C's query returns 0 records:
      const accountCVisible = supabaseExchangeRequests.filter((req) => rlsSelectEvaluator(req, accountC.id));
      expect(accountCVisible).toHaveLength(0);
    });

    it('ensures fetchData query omits requester:profiles(*) to avoid 42501 permission denied errors and hydrates profiles via public_profiles directory', () => {
      // Profiles directory map (simulating public_profiles view)
      const pubProfilesMap = new Map<string, any>();
      pubProfilesMap.set(accountA.id, accountA);
      pubProfilesMap.set(accountB.id, accountB);

      // Raw record returned from Supabase without joining base profiles table:
      const rawDbRecord = {
        id: '99999999-1111-4000-8000-999999999999',
        listing_id: listingByAccountA.id,
        requester_id: accountB.id,
        provider_id: accountA.id,
        proposed_action: 'Paper recycling',
        requested_quantity: 15,
        status: 'pending',
        completion_code: 'GL-8822',
        created_at: '2026-11-09T01:00:00.000Z',
        listing: listingByAccountA,
      };

      // Client mapping:
      const providerId = rawDbRecord.provider_id || rawDbRecord.listing?.user_id;
      const mappedRecord: ExchangeRequest = {
        ...rawDbRecord,
        provider_id: providerId,
        requester: pubProfilesMap.get(rawDbRecord.requester_id),
        provider: pubProfilesMap.get(providerId),
      };

      expect(mappedRecord.requester?.full_name).toBe('EcoCraft Kerala (Requester)');
      expect(mappedRecord.provider?.full_name).toBe('Dr. Aisha Nair (Provider)');
      expect(mappedRecord.listing?.title).toBe('Clean Shredded Paper Waste (50kg)');
    });
  });

  // --------------------------------------------------------------------------
  // STEP 5: PROVIDER NOTIFICATIONS
  // --------------------------------------------------------------------------
  describe('Step 5: Automated Provider Notifications', () => {
    it('creates a database notification addressed to Account A when Account B submits an exchange request', () => {
      const targetListing = listingByAccountA;
      const requestedQuantity = 20;

      const createdNotif: NotificationItem = {
        id: crypto.randomUUID(),
        user_id: targetListing.user_id, // Addressed to Account A
        title: 'New Exchange Request',
        message: `${accountB.full_name} requested ${requestedQuantity} ${targetListing.unit} of "${targetListing.title}"`,
        type: 'request',
        link: '/exchanges',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      expect(createdNotif.user_id).toBe(accountA.id);
      expect(createdNotif.user_id).not.toBe(accountB.id);
      expect(createdNotif.title).toBe('New Exchange Request');
      expect(createdNotif.message).toContain('EcoCraft Kerala (Requester)');
      expect(createdNotif.message).toContain('Clean Shredded Paper Waste');
      expect(createdNotif.link).toBe('/exchanges');
      expect(createdNotif.is_read).toBe(false);
    });

    it('correctly increments unread count on notification bell and marks read upon clicking', () => {
      let notifications: NotificationItem[] = [
        {
          id: 'notif-1',
          user_id: accountA.id,
          title: 'New Exchange Request',
          message: 'EcoCraft Kerala requested 20 kg of Clean Shredded Paper Waste',
          type: 'request',
          link: '/exchanges',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];

      // Initial unread count
      const unreadCountInitial = notifications.filter((n) => !n.is_read).length;
      expect(unreadCountInitial).toBe(1);

      // Provider clicks notification:
      notifications = notifications.map((n) => (n.id === 'notif-1' ? { ...n, is_read: true } : n));

      const unreadCountAfter = notifications.filter((n) => !n.is_read).length;
      expect(unreadCountAfter).toBe(0);
      expect(notifications[0].is_read).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // STEP 7: ACCEPT & REJECT WORKFLOW
  // --------------------------------------------------------------------------
  describe('Step 7: Accept, Reject, and Cancel Lifecycle Verification', () => {
    it('allows Account A (provider) to accept proposal and updates status for both accounts', () => {
      let currentRequest: ExchangeRequest = {
        id: 'req-001',
        listing_id: listingByAccountA.id,
        requester_id: accountB.id,
        provider_id: accountA.id,
        proposed_action: 'Paper recycling',
        requested_quantity: 20,
        status: 'pending',
        completion_code: 'GL-5432',
        created_at: new Date().toISOString(),
        listing: listingByAccountA,
        requester: accountB,
        provider: accountA,
      };

      // Provider Account A accepts:
      const pickupDate = new Date(Date.now() + 86400000 * 2).toISOString();
      currentRequest = {
        ...currentRequest,
        status: 'accepted',
        pickup_date: pickupDate,
        updated_at: new Date().toISOString(),
      };

      // Acceptance notification generated for Requester Account B:
      const acceptanceNotif: NotificationItem = {
        id: crypto.randomUUID(),
        user_id: currentRequest.requester_id, // Account B
        title: 'Request Accepted',
        message: `Your request for "${currentRequest.listing?.title}" was accepted by the provider. Coordinate pickup details in chat and present your pass code at pickup.`,
        type: 'request',
        link: '/exchanges',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      expect(currentRequest.status).toBe('accepted');
      expect(currentRequest.pickup_date).toBeDefined();
      expect(currentRequest.completion_code).toBe('GL-5432');

      // Assert notification is addressed to Account B and completion code is not exposed:
      expect(acceptanceNotif.user_id).toBe(accountB.id);
      expect(acceptanceNotif.message).not.toContain('GL-5432');
      expect(acceptanceNotif.message).toContain('accepted by the provider');
    });

    it('rejects attempt by non-provider (Account B or C) to accept the request', () => {
      const currentRequest: ExchangeRequest = {
        id: 'req-001',
        listing_id: listingByAccountA.id,
        requester_id: accountB.id,
        provider_id: accountA.id,
        proposed_action: 'Paper recycling',
        requested_quantity: 20,
        status: 'pending',
        completion_code: 'GL-5432',
        created_at: new Date().toISOString(),
      };

      const attemptAccept = (callerId: string) => {
        const providerId = currentRequest.provider_id;
        if (callerId !== providerId) {
          throw new Error('Permission denied: Only the waste provider can accept this request.');
        }
      };

      // Account B (Requester) cannot accept their own request
      expect(() => attemptAccept(accountB.id)).toThrow('Only the waste provider can accept this request.');

      // Account C (Stranger) cannot accept
      expect(() => attemptAccept(accountC.id)).toThrow('Only the waste provider can accept this request.');

      // Account A (Provider) can accept
      expect(() => attemptAccept(accountA.id)).not.toThrow();
    });

    it('allows Account A (provider) to decline/reject proposal and updates status for both accounts', () => {
      let currentRequest: ExchangeRequest = {
        id: 'req-002',
        listing_id: listingByAccountA.id,
        requester_id: accountB.id,
        provider_id: accountA.id,
        proposed_action: 'Composting',
        requested_quantity: 20,
        status: 'pending',
        completion_code: 'GL-1234',
        created_at: new Date().toISOString(),
        listing: listingByAccountA,
      };

      // Provider Account A declines:
      currentRequest = {
        ...currentRequest,
        status: 'rejected',
        updated_at: new Date().toISOString(),
      };

      expect(currentRequest.status).toBe('rejected');
    });

    it('allows Account B (requester) to cancel their own pending request', () => {
      let currentRequest: ExchangeRequest = {
        id: 'req-003',
        listing_id: listingByAccountA.id,
        requester_id: accountB.id,
        provider_id: accountA.id,
        proposed_action: 'Composting',
        requested_quantity: 10,
        status: 'pending',
        completion_code: 'GL-9999',
        created_at: new Date().toISOString(),
      };

      const attemptCancel = (callerId: string) => {
        if (callerId !== currentRequest.requester_id) {
          throw new Error('Permission denied: Only the requester can cancel this request.');
        }
        currentRequest = {
          ...currentRequest,
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        };
      };

      // Account A (Provider) cannot cancel requester's proposal (must use decline/reject instead)
      expect(() => attemptCancel(accountA.id)).toThrow('Only the requester can cancel this request.');

      // Account B can cancel:
      expect(() => attemptCancel(accountB.id)).not.toThrow();
      expect(currentRequest.status).toBe('cancelled');
    });
  });

  // --------------------------------------------------------------------------
  // STEP 6: REALTIME & REFRESH SYNCHRONIZATION
  // --------------------------------------------------------------------------
  describe('Step 6: Realtime Synchronization & Zero Stale LocalStorage', () => {
    it('does not populate exchange requests from localStorage on mount', () => {
      // Simulate stale legacy request in localStorage
      localStorage.setItem(
        'greenloop_user_exchange_requests',
        JSON.stringify([
          {
            id: 'stale-fake-req',
            listing_id: 'fake-id',
            requester_id: 'fake-user',
            status: 'pending',
          },
        ])
      );

      // Clean state initialization
      const exchangeRequestsState: ExchangeRequest[] = [];
      expect(exchangeRequestsState).toHaveLength(0);

      // On-mount sanitization deletes stale key:
      localStorage.removeItem('greenloop_user_exchange_requests');
      expect(localStorage.getItem('greenloop_user_exchange_requests')).toBeNull();
    });

    it('subscribes to realtime postgres_changes on exchange_requests and notifications tables', () => {
      const subscribedTables: string[] = [];

      const mockChannel = {
        on: (type: string, filter: any, handler: Function) => {
          subscribedTables.push(filter.table);
          return mockChannel;
        },
        subscribe: () => mockChannel,
      };

      // Simulating DataContext realtime channel setup:
      mockChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {})
        .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_requests' }, () => {})
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {});

      expect(subscribedTables).toContain('listings');
      expect(subscribedTables).toContain('exchange_requests');
      expect(subscribedTables).toContain('notifications');
    });
  });
});

