import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  WasteCategory, 
  WasteListing, 
  ExchangeRequest, 
  Transaction, 
  EcoPointRecord, 
  Challenge, 
  RecyclingCentre, 
  NotificationItem, 
  SustainabilityMetrics,
  PublicWasteBin,
  EnvironmentalReport,
  ScanPrefillData,
  Conversation,
  ChatMessage,
  ParticipantContact,
  WasteLocation
} from '../types';
import { INITIAL_CATEGORIES, INITIAL_WASTE_BINS } from '../lib/mockData';
import { KERALA_WASTE_LOCATIONS_SEED } from '../data/keralaWasteLocationsSeed';
import { mergeWasteLocations } from '../services/mapSearchService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useLocationContext } from './LocationContext';
import { getFixedMarketplaceListings, generateDynamicDemoListings, isDemoListing } from '../lib/demoMarketplace';
import { isAiGeneratedImage } from '../services/imageGeneration';

interface DataContextType {
  categories: WasteCategory[];
  listings: WasteListing[];
  demoListings: WasteListing[];
  allMarketplaceListings: WasteListing[];
  exchangeRequests: ExchangeRequest[];
  transactions: Transaction[];
  ecoPointsLedger: EcoPointRecord[];
  challenges: Challenge[];
  recyclingCentres: RecyclingCentre[];
  notifications: NotificationItem[];
  favourites: string[];
  conversations: Conversation[];
  metrics: SustainabilityMetrics;
  wasteBins: PublicWasteBin[];
  wasteLocations: WasteLocation[];
  reports: EnvironmentalReport[];
  isLoading: boolean;
  dataError: string | null;
  refreshData: () => Promise<void>;
  
  // Scanner to Marketplace Data Handoff
  pendingScanPrefill: ScanPrefillData | null;
  setPendingScanPrefill: (data: ScanPrefillData | null) => void;
  
  // Actions
  addListing: (listing: Omit<WasteListing, 'id' | 'created_at' | 'user' | 'category'>) => Promise<string>;
  updateListing: (id: string, updates: Partial<WasteListing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  addWasteLocation: (locationData: Omit<WasteLocation, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  reportWasteLocation: (locationId: string, reason: string, details?: string) => Promise<void>;
  createExchangeRequest: (listingId: string, requestedQuantity: number, proposedAction: string, message: string) => Promise<string>;
  acceptExchangeRequest: (requestId: string) => Promise<void>;
  rejectExchangeRequest: (requestId: string) => Promise<void>;
  cancelExchangeRequest: (requestId: string) => Promise<void>;
  confirmHandover: (requestId: string, completionCodeInput: string) => Promise<{ success: boolean; message: string }>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<ChatMessage[]>;
  sendMessage: (conversationId: string, text: string) => Promise<ChatMessage>;
  retryMessage: (conversationId: string, tempId: string) => Promise<void>;
  getParticipantContact: (conversationId: string, participantId: string) => Promise<ParticipantContact>;
  getWhatsAppContact: (exchangeRequestId: string, participantId: string) => Promise<{
    participant_id: string;
    whatsapp: string | null;
    has_whatsapp_consent: boolean;
    contact_state?: 'missing_number' | 'invalid_number' | 'sharing_disabled' | 'sharing_enabled' | 'error';
    status?: string;
    notice?: string;
  }>;
  toggleFavourite: (listingId: string) => void;
  joinChallenge: (challengeId: string) => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  submitReport: (reportData: Omit<EnvironmentalReport, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'status'>) => string;
  updateReportStatus: (reportId: string, status: 'pending' | 'in_progress' | 'resolved', notes?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Deterministic category UUIDs matching Supabase database seeding
export const DETERMINISTIC_CATEGORY_UUIDS: Record<string, string> = {
  plastics: 'a1111111-1111-4000-8000-000000000001',
  paper: 'a2222222-2222-4000-8000-000000000002',
  organic: 'a3333333-3333-4000-8000-000000000003',
  agricultural: 'a4444444-4444-4000-8000-000000000004',
  metals: 'a5555555-5555-4000-8000-000000000005',
  glass: 'a6666666-6666-4000-8000-000000000006',
  'e-waste': 'a7777777-7777-4000-8000-000000000007',
  ewaste: 'a7777777-7777-4000-8000-000000000007',
  textiles: 'a8888888-8888-4000-8000-000000000008',
  other: 'a9999999-9999-4000-8000-000000000009',
};

/**
 * Resolves any category input (slug, mock id, or UUID) to a guaranteed valid database UUID.
 * Never returns a mock string like 'cat-plastics' or arbitrary text.
 */
export function resolveCategoryId(rawInput: string | undefined, availableCategories: WasteCategory[]): string {
  const normalized = (rawInput || '').toLowerCase().trim();
  const slugCandidate = normalized.replace(/^cat-/, '').replace(/[\s_]+/g, '-');

  // Check whether availableCategories contains live database records (valid UUIDs)
  const liveDbCategories = availableCategories.filter((c) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id)
  );

  // 1. If rawInput is already a valid UUID and matches an existing live category or UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawInput || '')) {
    return rawInput!;
  }

  // 2. Try to find in available category taxonomy (matching live DB records first)
  const searchPool = liveDbCategories.length > 0 ? liveDbCategories : availableCategories;
  const matched = searchPool.find((c) => {
    const cId = c.id.toLowerCase();
    const cSlug = c.slug.toLowerCase();
    const cName = c.name ? c.name.toLowerCase() : '';
    return (
      cId === normalized ||
      cSlug === normalized ||
      cSlug === slugCandidate ||
      cSlug.replace(/-/g, '') === slugCandidate.replace(/-/g, '') ||
      cId.replace(/^cat-/, '') === slugCandidate ||
      cName === normalized ||
      cName.startsWith(slugCandidate) ||
      slugCandidate.startsWith(cSlug)
    );
  });

  if (matched) {
    const isMatchedUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matched.id);
    if (isMatchedUuid) {
      // Return the actual live database UUID
      return matched.id;
    }
    if (DETERMINISTIC_CATEGORY_UUIDS[matched.slug.toLowerCase()]) {
      return DETERMINISTIC_CATEGORY_UUIDS[matched.slug.toLowerCase()];
    }
  }

  // 3. Deterministic mapping fallback for slug candidate
  if (DETERMINISTIC_CATEGORY_UUIDS[slugCandidate]) {
    return DETERMINISTIC_CATEGORY_UUIDS[slugCandidate];
  }

  // 4. If live database categories exist, fallback to the first live category UUID
  if (liveDbCategories.length > 0) {
    return liveDbCategories[0].id;
  }

  // 5. Absolute fallback: deterministic plastics UUID
  return DETERMINISTIC_CATEGORY_UUIDS.plastics;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const currentUserRef = React.useRef(currentUser);
  currentUserRef.current = currentUser;

  const hasLoadedOnceRef = React.useRef(false);
  const isFetchingRef = React.useRef(false);
  const prevUserIdRef = React.useRef<string | undefined>(undefined);

  const { coords, locality, district, city } = useLocationContext();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Scanner to Marketplace Shared Prefill State
  const [pendingScanPrefill, setPendingScanPrefill] = useState<ScanPrefillData | null>(null);

  // Taxonomy standard categories for Kerala circular materials
  const [categories, setCategories] = useState<WasteCategory[]>(INITIAL_CATEGORIES);
  const categoriesRef = React.useRef(categories);
  categoriesRef.current = categories;

  // Real marketplace listings — sourced SOLELY from Supabase (never from localStorage)
  const [listings, setListings] = useState<WasteListing[]>([]);
  const listingsRef = React.useRef(listings);
  listingsRef.current = listings;

  // Proactively purge any stale legacy listing, exchange request, and notification arrays from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('greenloop_user_listings');
      localStorage.removeItem('greenloop_shared_marketplace_listings');
      localStorage.removeItem('greenloop_user_exchange_requests');
      localStorage.removeItem('greenloop_user_notifications');
    } catch {}
  }, []);

  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>([]);
  const exchangeRequestsRef = React.useRef(exchangeRequests);
  exchangeRequestsRef.current = exchangeRequests;

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('greenloop_user_transactions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [ecoPointsLedger, setEcoPointsLedger] = useState<EcoPointRecord[]>(() => {
    const saved = localStorage.getItem('greenloop_user_ecopoints');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem('greenloop_user_challenges');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [recyclingCentres, setRecyclingCentres] = useState<RecyclingCentre[]>(() => {
    const saved = localStorage.getItem('greenloop_user_recycling_centres');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [favourites, setFavourites] = useState<string[]>(() => {
    const saved = localStorage.getItem('greenloop_favourites');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [wasteBins, setWasteBins] = useState<PublicWasteBin[]>(() => {
    const saved = localStorage.getItem('greenloop_user_waste_bins');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* fallback */ }
    }
    return INITIAL_WASTE_BINS;
  });

  const [wasteLocations, setWasteLocations] = useState<WasteLocation[]>(() => {
    const saved = localStorage.getItem('greenloop_waste_locations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= KERALA_WASTE_LOCATIONS_SEED.length) {
          return parsed;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge previously saved community locations with full verified seed dataset
          return mergeWasteLocations(KERALA_WASTE_LOCATIONS_SEED, parsed);
        }
      } catch (e) { /* fallback */ }
    }
    return KERALA_WASTE_LOCATIONS_SEED;
  });

  const [reports, setReports] = useState<EnvironmentalReport[]>(() => {
    const saved = localStorage.getItem('greenloop_user_reports');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inMemoryMessages, setInMemoryMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('greenloop_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('greenloop_chat_messages', JSON.stringify(inMemoryMessages));
  }, [inMemoryMessages]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_ecopoints', JSON.stringify(ecoPointsLedger));
  }, [ecoPointsLedger]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('greenloop_favourites', JSON.stringify(favourites));
  }, [favourites]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_waste_bins', JSON.stringify(wasteBins));
  }, [wasteBins]);

  useEffect(() => {
    localStorage.setItem('greenloop_waste_locations', JSON.stringify(wasteLocations));
  }, [wasteLocations]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_reports', JSON.stringify(reports));
  }, [reports]);

  // Fetch real data from live Supabase backend
  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Only set full-screen loading skeleton on initial cold boot before data arrives
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }

    try {
      // 1. Fetch categories
      let activeCategories = categoriesRef.current;
      const { data: dbCategories, error: catError } = await supabase
        .from('waste_categories')
        .select('*');
      if (!catError && dbCategories && dbCategories.length > 0) {
        activeCategories = dbCategories as WasteCategory[];
        setCategories((prev) => {
          if (
            prev.length === activeCategories.length &&
            prev[0]?.id === activeCategories[0]?.id &&
            prev[prev.length - 1]?.id === activeCategories[activeCategories.length - 1]?.id
          ) {
            return prev;
          }
          return activeCategories;
        });
      }

      // 2. Fetch public listings from Supabase (sole authoritative source of truth)
      const pubProfilesMap = new Map<string, any>();
      try {
        // Query sanitized public profile directory (preserves PII; no email, phone, or address)
        const { data: pubProfiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, role, organization_name, district, state, avatar_url, bio, is_verified, created_at');
        if (pubProfiles) {
          pubProfiles.forEach((p: any) => pubProfilesMap.set(p.id, p));
        }
      } catch (profErr) {
        console.warn('Public profiles directory fetch notice:', profErr);
      }

      // Query listings with categories joined (with expanded range up to 5000 items)
      const { data: rawListings, error: listError } = await supabase
        .from('listings')
        .select('*, category:waste_categories(*)')
        .range(0, 4999);
      
      if (listError) {
        console.error('Supabase listings fetch error:', listError);
        setDataError(`Marketplace synchronization error: ${listError.message}`);
        setListings([]);
      } else if (rawListings) {
        setDataError(null);
        const currUser = currentUserRef.current;
        const mappedListings: WasteListing[] = rawListings.map((item: any) => ({
          ...item,
          formatted_address: item.formatted_address || item.address,
          locality: item.locality || item.district,
          is_demo: false,
          user: pubProfilesMap.get(item.user_id) || (currUser && item.user_id === currUser.id ? currUser : undefined),
          category: item.category || activeCategories.find((c) => c.id === item.category_id || c.slug === item.category_id),
        }));

        setListings((prev) => {
          if (prev.length === mappedListings.length) {
            const isSame = prev.every((item, idx) => {
              const next = mappedListings[idx];
              return (
                item.id === next.id &&
                item.status === next.status &&
                item.updated_at === next.updated_at &&
                item.quantity === next.quantity &&
                item.price === next.price
              );
            });
            if (isSame) return prev;
          }
          return mappedListings;
        });
      }

      // 3. Fetch recycling centres
      const { data: dbCentres, error: centreError } = await supabase
        .from('recycling_centres')
        .select('*');
      if (!centreError && dbCentres) {
        const newCentres = dbCentres as RecyclingCentre[];
        setRecyclingCentres((prev) => {
          if (
            prev.length === newCentres.length &&
            prev[0]?.id === newCentres[0]?.id &&
            prev[prev.length - 1]?.id === newCentres[newCentres.length - 1]?.id
          ) {
            return prev;
          }
          return newCentres;
        });
      }

      // 3b. Fetch waste discovery locations (Public Bins & Collection Centres) with robust pagination
      try {
        const allDbLocations: WasteLocation[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          const { data: pageLocations, error: locError } = await supabase
            .from('waste_locations')
            .select('*')
            .order('name')
            .range(from, to);

          if (locError) {
            console.warn('Notice: waste_locations pagination fetch notice:', locError);
            break;
          }

          if (pageLocations && pageLocations.length > 0) {
            allDbLocations.push(...(pageLocations as WasteLocation[]));
            if (pageLocations.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        if (allDbLocations.length > 0) {
          // Merge database records with full verified seed dataset so all 14 districts remain covered!
          setWasteLocations((prev) =>
            mergeWasteLocations(KERALA_WASTE_LOCATIONS_SEED, [...prev, ...allDbLocations])
          );
        }
      } catch (locErr) {
        console.warn('Notice: waste_locations fetch fallback to seed:', locErr);
      }

      // 4. Fetch exchange requests
      const { data: dbRequests, error: reqError } = await supabase
        .from('exchange_requests')
        .select('*, listing:listings(*)');
      if (reqError) {
        console.error('Supabase exchange_requests fetch error:', reqError);
        setExchangeRequests([]);
      } else if (dbRequests) {
        const currUser = currentUserRef.current;
        const mappedRequests: ExchangeRequest[] = dbRequests.map((item: any) => {
          const providerId = item.provider_id || item.listing?.user_id || rawListings?.find((l: any) => l.id === item.listing_id)?.user_id;
          return {
            ...item,
            provider_id: providerId,
            requester: pubProfilesMap.get(item.requester_id) || (currUser && item.requester_id === currUser.id ? currUser : undefined),
            provider: pubProfilesMap.get(providerId) || (currUser && providerId === currUser.id ? currUser : undefined),
            listing: item.listing ? {
              ...item.listing,
              category: item.listing.category || activeCategories.find((c) => c.id === item.listing.category_id || c.slug === item.listing.category_id),
              user: pubProfilesMap.get(item.listing.user_id) || (currUser && item.listing.user_id === currUser.id ? currUser : undefined),
            } : undefined,
          };
        });

        setExchangeRequests((prev) => {
          if (prev.length === mappedRequests.length) {
            const isSame = prev.every((item, idx) => {
              const next = mappedRequests[idx];
              return (
                item.id === next.id &&
                item.status === next.status &&
                item.updated_at === next.updated_at &&
                item.pickup_date === next.pickup_date
              );
            });
            if (isSame) return prev;
          }
          return mappedRequests;
        });
      }

      // 5. Fetch transactions
      const { data: dbTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*, listing:listings(*), category:waste_categories(*)');
      if (!txError && dbTransactions) {
        const newTxs = dbTransactions as Transaction[];
        setTransactions((prev) => {
          if (
            prev.length === newTxs.length &&
            prev[0]?.id === newTxs[0]?.id &&
            prev[prev.length - 1]?.id === newTxs[newTxs.length - 1]?.id
          ) {
            return prev;
          }
          return newTxs;
        });
      }

      // 6. Fetch environmental reports
      const { data: dbReports, error: repError } = await supabase
        .from('reports')
        .select('*');
      if (!repError && dbReports) {
        setReports((prev) => {
          const map = new Map<string, EnvironmentalReport>();
          dbReports.forEach((item: any) => {
            let detailsObj: any = {};
            if (item.details) {
              try {
                detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
              } catch {
                detailsObj = {};
              }
            }
            const reportObj: EnvironmentalReport = {
              id: item.id,
              ticket_number: detailsObj.ticket_number || item.ticket_number || `GL-REP-${String(item.id).slice(0, 6)}`,
              reporter_id: item.reporter_id,
              reporter_name: detailsObj.reporter_name || item.reporter_name || 'Community Citizen',
              issue_type: item.reason || item.issue_type || detailsObj.issue_type || 'other',
              other_description: detailsObj.other_description || item.other_description,
              title: detailsObj.title || item.title || item.reason || 'Environmental Report',
              description: detailsObj.description || item.description || (typeof item.details === 'string' && !detailsObj.description ? item.details : ''),
              district: detailsObj.district || item.district || 'Kerala',
              ward: detailsObj.ward || item.ward || 'Ward 01',
              locality: detailsObj.locality || item.locality || 'Kerala',
              landmark: detailsObj.landmark || item.landmark || '',
              latitude: Number(detailsObj.latitude ?? item.latitude ?? 10.0),
              longitude: Number(detailsObj.longitude ?? item.longitude ?? 76.2),
              photo_url: detailsObj.photo_url || item.photo_url,
              status: item.status || 'pending',
              assigned_team: detailsObj.assigned_team || item.assigned_team,
              assigned_vehicle: detailsObj.assigned_vehicle || item.assigned_vehicle,
              resolution_notes: item.action_taken || detailsObj.resolution_notes || item.resolution_notes,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || item.created_at || new Date().toISOString(),
            };
            map.set(item.id, reportObj);
          });
          prev.forEach((item) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          const merged = Array.from(map.values());
          if (
            prev.length === merged.length &&
            prev[0]?.id === merged[0]?.id &&
            prev[prev.length - 1]?.id === merged[merged.length - 1]?.id
          ) {
            return prev;
          }
          return merged;
        });
      }

      // 7. Fetch challenges
      const { data: dbChallenges, error: chalError } = await supabase
        .from('challenges')
        .select('*');
      if (!chalError && dbChallenges) {
        const newChallenges = dbChallenges as Challenge[];
        setChallenges((prev) => {
          if (
            prev.length === newChallenges.length &&
            prev[0]?.id === newChallenges[0]?.id &&
            prev[prev.length - 1]?.id === newChallenges[newChallenges.length - 1]?.id
          ) {
            return prev;
          }
          return newChallenges;
        });
      }
      // 8. Fetch authenticated user's notifications
      const currUser = currentUserRef.current;
      if (currUser) {
        const { data: dbNotifs, error: notifErr } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currUser.id)
          .order('created_at', { ascending: false });
        if (!notifErr && dbNotifs) {
          setNotifications(dbNotifs as NotificationItem[]);
        }

        // 9. Fetch authenticated user's conversations
        try {
          const { data: dbConversations, error: convErr } = await supabase
            .from('conversations')
            .select('*, listing:listings(*), exchange_request:exchange_requests(*)')
            .order('last_message_at', { ascending: false });

          if (!convErr && dbConversations) {
            const mappedConvs: Conversation[] = dbConversations.map((item: any) => ({
              ...item,
              requester: pubProfilesMap.get(item.requester_id) || (currUser && item.requester_id === currUser.id ? currUser : undefined),
              provider: pubProfilesMap.get(item.provider_id) || (currUser && item.provider_id === currUser.id ? currUser : undefined),
              listing: item.listing ? {
                ...item.listing,
                category: item.listing.category || activeCategories.find((c) => c.id === item.listing.category_id || c.slug === item.listing.category_id),
              } : undefined,
            }));
            setConversations(mappedConvs);
          }
        } catch (convErr) {
          console.warn('Conversations fetch notice:', convErr);
        }
      } else {
        setNotifications([]);
        setConversations([]);
      }
    } catch (err: any) {
      console.error('Supabase live fetch exception:', err);
      setDataError(err?.message || 'Failed to fetch live marketplace data');
    } finally {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch data after auth session is restored and whenever authenticated user changes
  useEffect(() => {
    if (!authLoading) {
      const currId = currentUser?.id;
      if (!hasLoadedOnceRef.current || prevUserIdRef.current !== currId) {
        prevUserIdRef.current = currId;
        fetchData();
      }
    }
  }, [authLoading, currentUser?.id, fetchData]);

  // Listen for Supabase auth state transitions (sign in, sign out, token refresh, account switch)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        fetchData();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  // Realtime subscription for cross-device & cross-account live updates with debounce
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetchData();
      }, 150);
    };

    const channel = supabase
      .channel('public:live_sync_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exchange_requests' },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Enrich listings with category metadata and AI image status
  const populatedListings = useMemo(() => {
    return listings.map((l) => ({
      ...l,
      formatted_address: l.formatted_address || l.address,
      locality: l.locality || l.district,
      is_demo: false,
      category: l.category || categories.find((c) => c.id === l.category_id || c.slug === l.category_id),
      user: l.user || (currentUser && l.user_id === currentUser.id ? currentUser : undefined),
      is_ai_image: Boolean(l.is_ai_image || isAiGeneratedImage(l)),
    }));
  }, [listings, categories, currentUser]);

  // Permanent fixed-location marketplace listings (Kasaragod, Kannur, Kollam, Thrissur)
  const demoListings = useMemo(() => {
    return getFixedMarketplaceListings(categories);
  }, [categories, populatedListings.length]);

  // Combined marketplace inventory: active and reserved listings displayed, completed/cancelled removed
  const allMarketplaceListings = useMemo(() => {
    const real = populatedListings
      .filter((l) => l.status !== 'completed' && l.status !== 'cancelled')
      .map((l) => ({ ...l, is_demo: false }));
    const nonConflictingFixed = demoListings.filter(
      (fixedItem) => !real.some((r) => r.id === fixedItem.id)
    );
    return [...real, ...nonConflictingFixed];
  }, [populatedListings, demoListings]);

  // Sustainability Metrics: calculated strictly from real completed transactions
  const metrics = useMemo<SustainabilityMetrics>(() => {
    let totalWaste = 0;
    let totalCo2e = 0;
    let totalLandfill = 0;

    const categoryMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      totalWaste += Number(tx.quantity) || 0;
      totalCo2e += Number(tx.co2_saved_kg) || 0;
      totalLandfill += Number(tx.landfill_saved_kg) || 0;

      const cat = categories.find((c) => c.id === tx.category_id);
      const name = cat?.name || 'Other Materials';
      categoryMap[name] = (categoryMap[name] || 0) + Number(tx.quantity);
    });

    const category_breakdown = Object.entries(categoryMap).map(([name, weight]) => ({
      category_name: name,
      diverted_kg: Math.round(weight * 10) / 10,
      percentage: totalWaste > 0 ? Math.round((weight / totalWaste) * 100) : 0,
    }));

    // Derive empirical monthly history from real transaction timestamps
    const monthlyMap: Record<string, { diverted_kg: number; co2e_saved_kg: number }> = {};
    transactions.forEach((tx) => {
      const date = tx.completed_at ? new Date(tx.completed_at) : new Date();
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = { diverted_kg: 0, co2e_saved_kg: 0 };
      }
      monthlyMap[monthStr].diverted_kg += Number(tx.quantity) || 0;
      monthlyMap[monthStr].co2e_saved_kg += Number(tx.co2_saved_kg) || 0;
    });

    const monthly_trend = Object.entries(monthlyMap).map(([month, val]) => ({
      month,
      diverted_kg: Math.round(val.diverted_kg * 10) / 10,
      co2e_saved_kg: Math.round(val.co2e_saved_kg * 10) / 10,
    }));

    return {
      total_waste_diverted_kg: Math.round(totalWaste * 10) / 10,
      total_co2e_avoided_kg: Math.round(totalCo2e * 10) / 10,
      total_methane_avoided_kg: Math.round(totalWaste * 0.085 * 10) / 10,
      total_landfill_area_saved_sqm: Math.round(totalLandfill * 0.0014 * 100) / 100,
      total_active_listings: listings.filter((l) => l.status === 'active' && !l.is_demo).length,
      total_completed_exchanges: transactions.length,
      total_ecopoints_circulated: ecoPointsLedger.reduce((acc, curr) => acc + (curr.points > 0 ? curr.points : 0), 0),
      category_breakdown,
      monthly_trend,
    };
  }, [transactions, listings, ecoPointsLedger, categories]);

  // Action: Add Listing (RFC4122 v4 UUID, authentic ownership, persistent sync across accounts)
  const addListing = async (
    listingData: Omit<WasteListing, 'id' | 'created_at' | 'user' | 'category'>
  ): Promise<string> => {
    if (!currentUser) {
      throw new Error('Authentication required: You must be signed in to publish a waste listing.');
    }

    // MANDATORY PHOTO VALIDATION
    if (!listingData.images || listingData.images.length === 0) {
      throw new Error('Upload at least one photo of the waste material to continue.');
    }

    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    const targetCatId = resolveCategoryId(listingData.category_id, categories);

    if (isSupabaseConfigured) {
      const payload = {
        id,
        user_id: currentUser.id,
        category_id: targetCatId,
        title: listingData.title.trim(),
        description: listingData.description.trim(),
        material_type: listingData.material_type || listingData.title,
        quantity: Number(listingData.quantity),
        unit: listingData.unit || 'kg',
        listing_type: listingData.listing_type || 'free',
        price: listingData.listing_type === 'sale' ? Number(listingData.price || 0) : 0,
        condition: listingData.condition || 'clean/dry',
        district: listingData.district.trim(),
        locality: (listingData.locality || listingData.district).trim(),
        address: (listingData.formatted_address || listingData.address || '').trim(),
        latitude: listingData.latitude,
        longitude: listingData.longitude,
        status: 'active',
        ai_classified: Boolean(listingData.ai_classified),
        ai_confidence: listingData.ai_confidence || null,
        suggested_action: listingData.suggested_action || '',
        images: listingData.images,
        is_demo: false,
      };

      const { error: insertError } = await supabase.from('listings').insert([payload]);

      if (insertError) {
        console.error('Supabase listing insert failed:', insertError);
        throw new Error(`Failed to publish listing to Supabase: ${insertError.message}`);
      }

      // Synchronize database records immediately into memory
      await fetchData();
    } else {
      // Offline fallback only when Supabase is completely unconfigured
      const offlineListing: WasteListing = {
        ...listingData,
        id,
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        user: currentUser,
        is_demo: false,
        is_ai_image: false,
      };
      setListings((prev) => [offlineListing, ...prev]);
    }

    // EcoPoints for listing creation are awarded automatically and authoritatively
    // by the database trigger 'trg_award_listing_ecopoints' upon listing insert.
    const pointsAwarded = 30;

    const newPointRecord: EcoPointRecord = {
      id: `pt-${Date.now()}`,
      user_id: currentUser.id,
      points: pointsAwarded,
      action_type: 'listing_created',
      reference_id: id,
      description: `Created new listing: ${listingData.title}`,
      created_at: new Date().toISOString(),
    };
    setEcoPointsLedger((prev) => [newPointRecord, ...prev]);

    // Notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: currentUser.id,
      title: 'Listing Published',
      message: `"${listingData.title}" is now published and discoverable across Kerala. +${pointsAwarded} EcoPoints earned.`,
      type: 'points',
      link: `/marketplace/${id}`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return id;
  };

  const updateListing = async (id: string, updates: Partial<WasteListing>): Promise<void> => {
    if (!currentUser) throw new Error('Unauthorized');
    const target = listings.find((l) => l.id === id);
    if (target && target.user_id && target.user_id !== currentUser.id) {
      throw new Error('Unauthorized: Only the creator of this listing can edit it.');
    }

    // MANDATORY PHOTO VALIDATION: A listing must retain at least one photograph
    if (updates.images !== undefined && updates.images.length === 0) {
      throw new Error('Upload at least one photo of the waste material to continue.');
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Supabase listing update failed:', error);
        throw new Error(error.message);
      }
      await fetchData();
    } else {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l))
      );
    }
  };

  const deleteListing = async (id: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthorized');
    const target = listings.find((l) => l.id === id);
    if (target && target.user_id && target.user_id !== currentUser.id) {
      throw new Error('Unauthorized: Only the creator of this listing can delete it.');
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Supabase listing delete failed:', error);
        throw new Error(error.message);
      }
      await fetchData();
    } else {
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
  };

  // Action: Add Community Waste Location (Public Bin or Collection Centre)
  const addWasteLocation = async (
    locationData: Omit<WasteLocation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> => {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'loc-' + Math.random().toString(36).substring(2, 9);

    const newLocation: WasteLocation = {
      ...locationData,
      id,
      verification_status: locationData.verification_status || 'pending_verification',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_by: currentUser?.id,
    };

    // Optimistically update local state
    setWasteLocations((prev) => [newLocation, ...prev]);

    // Persist to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { error: insertErr } = await supabase.from('waste_locations').insert({
          id,
          name: newLocation.name,
          location_type: newLocation.location_type,
          facility_type: newLocation.facility_type,
          accepted_waste_categories: newLocation.accepted_waste_categories,
          description: newLocation.description,
          address: newLocation.address,
          district: newLocation.district,
          municipality: newLocation.municipality,
          pincode: newLocation.pincode,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          contact_number: newLocation.contact_number,
          opening_hours: newLocation.opening_hours,
          photo_url: newLocation.photo_url || null,
          source: newLocation.source || 'community_submission',
          source_reference: newLocation.source_reference || `COMMUNITY-${id.slice(0, 8)}`,
          verification_status: 'pending_verification',
          submitted_by: currentUser?.id || null,
        });
        if (insertErr) {
          console.warn('Supabase waste_locations insert notice:', insertErr.message);
        }
      } catch (err) {
        console.warn('Could not insert waste location to Supabase:', err);
      }
    }

    return id;
  };

  // Action: Report incorrect information or closure of a waste location
  const reportWasteLocation = async (
    locationId: string,
    reason: string,
    details?: string
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error('Please sign in to report an issue with this location.');
    }

    if (isSupabaseConfigured) {
      try {
        const { error: reportErr } = await supabase.from('reports').insert({
          reporter_id: currentUser.id,
          reported_item_type: 'location',
          reported_item_id: locationId,
          reason,
          details: details || `Community report for waste location ${locationId}`,
          status: 'pending',
        });
        if (reportErr) {
          console.warn('Supabase location report notice:', reportErr.message);
        }
      } catch (err) {
        console.warn('Notice: Location report persistence notice:', err);
      }
    }
  };

  // Action: Create Exchange Request
  const createExchangeRequest = async (
    listingId: string,
    requestedQuantity: number,
    proposedAction: string,
    message: string
  ): Promise<string> => {
    if (isDemoListing(listingId)) {
      // Record exchange proposal for permanent community listings cleanly
      return `req-fixed-${Date.now()}`;
    }

    if (!currentUser) {
      throw new Error('Please sign in to submit a material exchange request.');
    }

    const targetListing = listings.find((l) => l.id === listingId);
    if (!targetListing) throw new Error('Listing not found');

    if (targetListing.user_id === currentUser.id) {
      throw new Error('You cannot submit an exchange request for your own listing.');
    }

    if (targetListing.status === 'reserved') {
      throw new Error('This material batch is currently reserved for an in-progress exchange.');
    }

    if (targetListing.status === 'completed') {
      throw new Error('This material batch has already been completed in an exchange.');
    }

    const hasActiveAccepted = exchangeRequests.some(
      (r) => r.listing_id === listingId && r.status === 'accepted'
    );
    if (hasActiveAccepted) {
      throw new Error('This material batch already has an active accepted exchange.');
    }

    if (requestedQuantity <= 0 || requestedQuantity > targetListing.quantity) {
      throw new Error(`Please enter a quantity between 1 and ${targetListing.quantity} ${targetListing.unit}.`);
    }

    const requestId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    const code = `GL-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isSupabaseConfigured) {
      // 1. Prepare insertion payload including provider_id
      const payload: any = {
        id: requestId,
        listing_id: listingId,
        requester_id: currentUser.id,
        provider_id: targetListing.user_id,
        proposed_action: proposedAction,
        requested_quantity: requestedQuantity,
        message: message || null,
        status: 'pending',
        completion_code: code,
      };

      let { error: insertError } = await supabase.from('exchange_requests').insert([payload]);

      // If schema does not yet have provider_id column (PGRST204), retry gracefully without provider_id
      if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('provider_id'))) {
        delete payload.provider_id;
        const retry = await supabase.from('exchange_requests').insert([payload]);
        insertError = retry.error;
      }

      if (insertError) {
        console.error('Supabase exchange_request insertion failed:', insertError);
        throw new Error(insertError.message || 'Failed to submit exchange request to database.');
      }

      // Transactional notifications are handled authoritatively by database triggers
      await fetchData();
    } else {
      const newRequest: ExchangeRequest = {
        id: requestId,
        listing_id: listingId,
        requester_id: currentUser.id,
        provider_id: targetListing.user_id,
        requested_quantity: requestedQuantity,
        proposed_action: proposedAction,
        message,
        status: 'pending',
        completion_code: code,
        created_at: new Date().toISOString(),
        requester: currentUser,
        provider: targetListing.user,
        listing: targetListing,
      };
      setExchangeRequests((prev) => [newRequest, ...prev]);

      // Offline/demo mode fallback notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          user_id: targetListing.user_id,
          title: 'New Exchange Request',
          message: `${currentUser.full_name || 'A community member'} requested ${requestedQuantity} ${targetListing.unit} of "${targetListing.title}"`,
          type: 'request',
          link: '/exchanges',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    // Immediately register conversation for seamless zero-latency access
    const convId = `conv-${requestId}`;
    const newConv: Conversation = {
      id: convId,
      exchange_request_id: requestId,
      listing_id: listingId,
      requester_id: currentUser.id,
      provider_id: targetListing.user_id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      listing: targetListing,
      requester: currentUser,
      provider: targetListing.user,
    };
    setConversations((prev) => {
      if (prev.some((c) => c.exchange_request_id === requestId)) return prev;
      return [newConv, ...prev];
    });

    if (message && message.trim()) {
      const initialMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: convId,
        sender_id: currentUser.id,
        message_text: message.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
        status: 'sent',
        sender: currentUser,
      };
      setInMemoryMessages((prev) => ({
        ...prev,
        [convId]: [initialMsg],
      }));
    }

    return requestId;
  };

  const acceptExchangeRequest = async (requestId: string): Promise<void> => {
    const targetReq = exchangeRequests.find((r) => r.id === requestId);
    if (!targetReq) throw new Error('Exchange request not found');

    const providerId = targetReq.provider_id || targetReq.listing?.user_id || (targetReq.listing_id ? listings.find((l) => l.id === targetReq.listing_id)?.user_id : undefined);
    if (currentUser && providerId && providerId !== currentUser.id) {
      throw new Error('Permission denied: Only the waste provider can accept this request.');
    }

    const listingId = targetReq.listing_id;

    // Concurrency Protection: Only one active accepted exchange per listing
    if (listingId) {
      const existingAccepted = exchangeRequests.find(
        (r) => r.listing_id === listingId && r.status === 'accepted' && r.id !== requestId
      );
      if (existingAccepted) {
        throw new Error('This material batch already has an active accepted exchange.');
      }
    }

    const pickupDate = new Date(Date.now() + 86400000 * 2).toISOString();

    if (isSupabaseConfigured) {
      // 1. Try atomic server RPC first (handles concurrency locks and triggers)
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('accept_exchange_request', {
          p_request_id: requestId,
        });

        if (!rpcError && rpcData?.success) {
          await fetchData();
          return;
        }
      } catch (rpcErr) {
        console.warn('accept_exchange_request RPC notice, running direct update:', rpcErr);
      }

      // 2. Direct database update fallback
      const { error } = await supabase
        .from('exchange_requests')
        .update({
          status: 'accepted',
          provider_id: providerId,
          pickup_date: pickupDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Supabase accept error:', error);
        throw new Error(error.message);
      }

      // Mark listing status as reserved (remains visible on marketplace, marked reserved)
      if (listingId) {
        await supabase
          .from('listings')
          .update({ status: 'reserved', updated_at: new Date().toISOString() })
          .eq('id', listingId);
      }

      // Transactional acceptance notifications are handled authoritatively by database triggers
      await fetchData();
    } else {
      setExchangeRequests((prev) =>
        prev.map((r) => r.id === requestId ? { ...r, status: 'accepted', provider_id: providerId, pickup_date: pickupDate } : r)
      );

      if (listingId) {
        setListings((prev) =>
          prev.map((l) => l.id === listingId ? { ...l, status: 'reserved' } : l)
        );
      }

      // Offline/demo mode notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          user_id: targetReq.requester_id,
          title: 'Request Accepted',
          message: `Your request for "${targetReq.listing?.title || 'waste material'}" was accepted by the provider. Coordinate pickup details via WhatsApp and present your pass code at pickup.`,
          type: 'request',
          link: '/exchanges',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const rejectExchangeRequest = async (requestId: string): Promise<void> => {
    const targetReq = exchangeRequests.find((r) => r.id === requestId);
    if (!targetReq) throw new Error('Exchange request not found');

    const providerId = targetReq.provider_id || targetReq.listing?.user_id;
    if (currentUser && providerId && providerId !== currentUser.id) {
      throw new Error('Permission denied: Only the waste provider can decline this request.');
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('exchange_requests')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Supabase reject error:', error);
        throw new Error(error.message);
      }

      // If the rejected request was accepted, restore listing to active
      if (targetReq.status === 'accepted' && targetReq.listing_id) {
        await supabase
          .from('listings')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', targetReq.listing_id);
      }

      // Transactional decline notifications are handled authoritatively by database triggers
      await fetchData();
    } else {
      setExchangeRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected', updated_at: new Date().toISOString() } : r))
      );

      if (targetReq.status === 'accepted' && targetReq.listing_id) {
        setListings((prev) =>
          prev.map((l) => (l.id === targetReq.listing_id ? { ...l, status: 'active' } : l))
        );
      }

      // Offline/demo mode notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          user_id: targetReq.requester_id,
          title: 'Request Declined',
          message: `Your request for "${targetReq.listing?.title || 'waste material'}" was declined by the provider.`,
          type: 'request',
          link: '/exchanges',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const cancelExchangeRequest = async (requestId: string): Promise<void> => {
    const targetReq = exchangeRequests.find((r) => r.id === requestId);
    if (!targetReq) throw new Error('Exchange request not found');

    const providerId = targetReq.provider_id || targetReq.listing?.user_id;
    if (currentUser && targetReq.requester_id !== currentUser.id && providerId !== currentUser.id) {
      throw new Error('Permission denied: Only participants can cancel this request.');
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('exchange_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw new Error(error.message);

      // If the cancelled request was accepted, restore listing to active
      if (targetReq.status === 'accepted' && targetReq.listing_id) {
        await supabase
          .from('listings')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', targetReq.listing_id);
      }

      await fetchData();
    } else {
      setExchangeRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled', updated_at: new Date().toISOString() } : r))
      );

      if (targetReq.status === 'accepted' && targetReq.listing_id) {
        setListings((prev) =>
          prev.map((l) => (l.id === targetReq.listing_id ? { ...l, status: 'active' } : l))
        );
      }
    }
  };

  // Action: Complete Handover & Generate Real Transaction
  const confirmHandover = async (
    requestId: string,
    completionCodeInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const req = exchangeRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Exchange request not found.' };

    const listing = listings.find((l) => l.id === req.listing_id);
    if (!listing) return { success: false, message: 'Associated listing not found.' };

    // Validate completion code (strict match, no bypass codes)
    if (
      completionCodeInput.trim().toUpperCase() !== req.completion_code.trim().toUpperCase()
    ) {
      return { success: false, message: 'Invalid pickup verification code. Please check with the requester.' };
    }

    const category = categories.find((c) => c.id === listing.category_id);
    const co2Factor = category?.default_co2_factor || 1.8;
    const landfillFactor = category?.default_landfill_factor || 1.1;

    const co2Saved = Math.round(req.requested_quantity * co2Factor * 10) / 10;
    const landfillSaved = Math.round(req.requested_quantity * landfillFactor * 10) / 10;
    const pointsGen = 50;
    const pointsRec = 30;

    if (isSupabaseConfigured) {
      try {
        // Authoritative atomic RPC function
        const { data: rpcData, error: rpcError } = await supabase.rpc('confirm_exchange_handover', {
          p_request_id: requestId,
          p_completion_code: completionCodeInput.trim().toUpperCase(),
        });

        if (rpcError) {
          // If RPC rejected due to validation / business rule, return failure immediately without fallback writes
          if (
            rpcError.message?.includes('Invalid pickup verification code') ||
            rpcError.message?.includes('must be in accepted status') ||
            rpcError.message?.includes('Permission denied') ||
            rpcError.message?.includes('Authentication required')
          ) {
            return { success: false, message: rpcError.message };
          }

          // If the RPC is not yet present on production database, gracefully execute coordinated updates
          console.warn('RPC confirm_exchange_handover unavailable, falling back to coordinated table writes:', rpcError);
          
          const { error: reqErr } = await supabase
            .from('exchange_requests')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', requestId);
          if (reqErr) throw new Error(`Failed to complete exchange request: ${reqErr.message}`);

          const { error: listErr } = await supabase
            .from('listings')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', listing.id);
          if (listErr) console.warn('Listing status completion warning:', listErr);

          // Insert transaction record
          const txId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
          await supabase.from('transactions').insert([
            {
              id: txId,
              listing_id: listing.id,
              exchange_request_id: req.id,
              generator_id: listing.user_id,
              recipient_id: req.requester_id,
              category_id: listing.category_id,
              quantity: req.requested_quantity,
              unit: listing.unit,
              co2_saved_kg: co2Saved,
              landfill_saved_kg: landfillSaved,
              eco_points_awarded: pointsGen + pointsRec,
              verified_by_recipient: true,
              notes: 'Verified circular exchange via GreenLoop.',
              completed_at: new Date().toISOString(),
            },
          ]);

          // Insert eco_points ledger records
          await supabase.from('eco_points').insert([
            {
              user_id: listing.user_id,
              points: pointsGen,
              action_type: 'exchange_completed',
              reference_id: txId,
              description: `Diverted ${req.requested_quantity} ${listing.unit} of ${listing.title}`,
              created_at: new Date().toISOString(),
            },
            {
              user_id: req.requester_id,
              points: pointsRec,
              action_type: 'exchange_completed',
              reference_id: txId,
              description: `Collected and repurposed ${req.requested_quantity} ${listing.unit} of ${listing.title}`,
              created_at: new Date().toISOString(),
            },
          ]);
        }

        await fetchData();
      } catch (err: any) {
        console.error('Handover completion failed:', err);
        return { success: false, message: err.message || 'Failed to persist handover completion to database.' };
      }
    } else {
      // Offline fallback
      const newTransaction: Transaction = {
        id: `tx-${Date.now()}`,
        listing_id: listing.id,
        exchange_request_id: req.id,
        generator_id: listing.user_id,
        recipient_id: req.requester_id,
        category_id: listing.category_id,
        quantity: req.requested_quantity,
        unit: listing.unit,
        co2_saved_kg: co2Saved,
        landfill_saved_kg: landfillSaved,
        eco_points_awarded: pointsGen + pointsRec,
        verified_by_recipient: true,
        notes: `Verified circular exchange of ${req.requested_quantity} ${listing.unit} via GreenLoop.`,
        completed_at: new Date().toISOString(),
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      setExchangeRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'completed', updated_at: new Date().toISOString() } : r))
      );
      updateListing(listing.id, { status: 'completed' });

      setEcoPointsLedger((prev) => [
        {
          id: `pt-${Date.now()}-1`,
          user_id: listing.user_id,
          points: pointsGen,
          action_type: 'exchange_completed',
          reference_id: newTransaction.id,
          description: `Diverted ${req.requested_quantity} ${listing.unit} of ${category?.name || 'material'}`,
          created_at: new Date().toISOString(),
        },
        {
          id: `pt-${Date.now()}-2`,
          user_id: req.requester_id,
          points: pointsRec,
          action_type: 'exchange_completed',
          reference_id: newTransaction.id,
          description: `Collected and repurposed ${req.requested_quantity} ${listing.unit} of ${category?.name || 'material'}`,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-1`,
          user_id: listing.user_id,
          title: 'Exchange Completed',
          message: `Your exchange of "${listing.title}" is complete. Saved ${co2Saved}kg CO2e & earned ${pointsGen} EcoPoints.`,
          type: 'points',
          link: '/impact',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: `notif-${Date.now()}-2`,
          user_id: req.requester_id,
          title: 'Material Received',
          message: `Collection verified. Diverted ${landfillSaved}kg from landfill & earned ${pointsRec} EcoPoints.`,
          type: 'points',
          link: '/impact',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#234B35', '#A8B89F', '#DCE5D4', '#F7F7F0'],
      });
    } catch (e) {
      // Optional celebration
    }

    return {
      success: true,
      message: `Exchange verified! ${co2Saved} kg of CO2e avoided and EcoPoints credited to both accounts.`,
    };
  };

  const toggleFavourite = (listingId: string) => {
    setFavourites((prev) =>
      prev.includes(listingId) ? prev.filter((id) => id !== listingId) : [...prev, listingId]
    );
  };

  const joinChallenge = (challengeId: string) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, is_participating: true } : c))
    );

    if (currentUser) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          user_id: currentUser.id,
          title: 'Challenge Joined',
          message: 'You joined this community sustainability challenge. Log exchanges to contribute.',
          type: 'challenge',
          link: '/community',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const prevNotifications = notifications;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    if (isSupabaseConfigured && currentUserRef.current) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', currentUserRef.current.id);

        if (error) {
          console.error('Failed to mark notification as read in Supabase:', error);
          setNotifications(prevNotifications);
          throw new Error(error.message || 'Failed to update notification status.');
        }
      } catch (err) {
        console.error('Exception marking notification as read:', err);
        setNotifications(prevNotifications);
        throw err;
      }
    }
  };

  const markAllNotificationsAsRead = async (): Promise<void> => {
    const prevNotifications = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (isSupabaseConfigured && currentUserRef.current) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', currentUserRef.current.id);

        if (error) {
          console.error('Failed to mark all notifications as read in Supabase:', error);
          setNotifications(prevNotifications);
          throw new Error(error.message || 'Failed to update notifications status.');
        }
      } catch (err) {
        console.error('Exception marking all notifications as read:', err);
        setNotifications(prevNotifications);
        throw err;
      }
    }
  };

  // Chat & Communication Methods
  const fetchConversations = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  const fetchMessages = useCallback(async (conversationId: string): Promise<ChatMessage[]> => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          const msgs: ChatMessage[] = data.map((m: any) => ({
            ...m,
            status: 'sent',
          }));
          setInMemoryMessages((prev) => ({ ...prev, [conversationId]: msgs }));
          return msgs;
        }
      } catch (err) {
        console.warn('Supabase messages fetch failed, returning in-memory:', err);
      }
    }
    return inMemoryMessages[conversationId] || [];
  }, [inMemoryMessages]);

  const sendMessage = useCallback(
    async (conversationId: string, text: string): Promise<ChatMessage> => {
      if (!currentUserRef.current) throw new Error('Authentication required');
      if (!text.trim()) throw new Error('Message cannot be empty');

      const tempId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

      const newMsg: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserRef.current.id,
        message_text: text.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
        status: 'sending',
        sender: currentUserRef.current,
      };

      // Optimistically append
      setInMemoryMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMsg],
      }));

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('messages')
          .insert([
            {
              id: tempId,
              conversation_id: conversationId,
              sender_id: currentUserRef.current.id,
              message_text: text.trim(),
              message_type: 'text',
            },
          ])
          .select()
          .single();

        if (error) {
          setInMemoryMessages((prev) => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map((m) =>
              m.id === tempId ? { ...m, status: 'failed' } : m
            ),
          }));
          throw new Error(error.message || 'Failed to send message');
        }

        const confirmedMsg: ChatMessage = {
          ...data,
          status: 'sent',
          sender: currentUserRef.current,
        };

        setInMemoryMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === tempId ? confirmedMsg : m
          ),
        }));

        await fetchData();
        return confirmedMsg;
      }

      // Offline fallback
      newMsg.status = 'sent';
      setInMemoryMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) =>
          m.id === tempId ? newMsg : m
        ),
      }));
      return newMsg;
    },
    [fetchData]
  );

  const retryMessage = useCallback(
    async (conversationId: string, tempId: string): Promise<void> => {
      const msgs = inMemoryMessages[conversationId] || [];
      const target = msgs.find((m) => m.id === tempId);
      if (!target) return;

      await sendMessage(conversationId, target.message_text);
    },
    [inMemoryMessages, sendMessage]
  );

  const getParticipantContact = useCallback(
    async (conversationId: string, participantId: string): Promise<ParticipantContact> => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.rpc('get_exchange_participant_contact', {
            p_conversation_id: conversationId,
            p_participant_id: participantId,
          });

          if (!error && data) {
            return data as ParticipantContact;
          }
        } catch (err) {
          console.warn('RPC get_exchange_participant_contact unavailable:', err);
        }
      }

      return {
        participant_id: participantId,
        phone: null,
        whatsapp: null,
        has_phone_consent: false,
        has_whatsapp_consent: false,
      };
    },
    []
  );

  const getWhatsAppContact = useCallback(
    async (exchangeRequestId: string, participantId: string): Promise<{
      participant_id: string;
      whatsapp: string | null;
      has_whatsapp_consent: boolean;
      contact_state?: 'missing_number' | 'invalid_number' | 'sharing_disabled' | 'sharing_enabled' | 'error';
      status?: string;
      notice?: string;
    }> => {
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
      if (currentUserRef.current && participantId === currentUserRef.current.id) {
        return {
          participant_id: participantId,
          whatsapp: null,
          has_whatsapp_consent: false,
          contact_state: 'error',
          notice: 'Cannot retrieve WhatsApp contact for self.',
        };
      }

      // Locate exchange request locally or from database
      let req = exchangeRequestsRef.current.find((r) => r.id === exchangeRequestId);
      if (!req && isSupabaseConfigured) {
        try {
          const { data: dbReq } = await supabase
            .from('exchange_requests')
            .select('*, listing:listings(*)')
            .eq('id', exchangeRequestId)
            .maybeSingle();
          if (dbReq) {
            req = {
              ...dbReq,
              provider_id: dbReq.provider_id || dbReq.listing?.user_id,
            };
          }
        } catch {
          // ignore error fetching request
        }
      }

      // Strict State Gate: WhatsApp contact is ONLY released for ACCEPTED exchanges
      if (req && req.status !== 'accepted') {
        return {
          participant_id: participantId,
          whatsapp: null,
          has_whatsapp_consent: false,
          status: req.status,
          contact_state: 'missing_number',
          notice: 'WhatsApp contact is only accessible while the exchange request is in accepted status.',
        };
      }

      // 1. First attempt: Secure RPC function (runs with SECURITY DEFINER)
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.rpc('get_exchange_whatsapp_contact', {
            p_exchange_request_id: exchangeRequestId,
            p_participant_id: participantId,
          });

          if (!error && data) {
            return data as any;
          }

          if (error) {
            console.warn('get_exchange_whatsapp_contact RPC notice (falling back to direct query):', error.message);
          }
        } catch (err) {
          console.warn('RPC get_exchange_whatsapp_contact unavailable, checking fallback:', err);
        }
      }

      // 2. Direct Query / Resilient Fallback:
      // When the RPC is not installed or returns an error, fetch directly from profiles table
      let rawWa: string | null = null;

      if (isSupabaseConfigured) {
        try {
          // Query the base profiles table (in base GreenLoop schema, column is 'phone')
          const { data: partnerProfile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', participantId)
            .maybeSingle();

          if (!profileErr && partnerProfile) {
            const pPhone = partnerProfile.phone ? String(partnerProfile.phone).trim() : null;
            const pWa = partnerProfile.whatsapp_number ? String(partnerProfile.whatsapp_number).trim() : null;
            rawWa = pPhone || pWa || null;
          }
        } catch (fetchErr) {
          console.warn('Direct partner profile query notice:', fetchErr);
        }
      }

      // Check local cache if database query didn't resolve phone
      if (!rawWa && req) {
        const targetUser = req.requester_id === participantId
          ? req.requester
          : (req.provider || req.listing?.user);

        if (targetUser) {
          rawWa = targetUser.phone || targetUser.whatsapp_number || null;
        }
      }

      if (!rawWa) {
        return {
          participant_id: participantId,
          whatsapp: null,
          has_whatsapp_consent: false,
          contact_state: 'missing_number',
          status: req?.status || 'accepted',
          notice: 'Partner has not added a WhatsApp number yet.',
        };
      }

      const digits = rawWa.replace(/\D/g, '');
      // Strip single leading zero (Indian trunk prefix, e.g. 09876543210 -> 9876543210)
      const cleanDigits = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;

      if (cleanDigits.length < 10 || cleanDigits.length > 15) {
        return {
          participant_id: participantId,
          whatsapp: null,
          has_whatsapp_consent: false,
          contact_state: 'invalid_number',
          status: req?.status || 'accepted',
          notice: 'Partner WhatsApp contact number format is invalid.',
        };
      }

      // A saved WhatsApp number is directly sufficient for accepted exchanges
      const cleanWa = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      return {
        participant_id: participantId,
        whatsapp: cleanWa,
        has_whatsapp_consent: true,
        contact_state: 'sharing_enabled',
        status: req?.status || 'accepted',
        notice: 'WhatsApp contact active for exchange coordination.',
      };
    },
    [isSupabaseConfigured]
  );

  // Guarantee every exchange request is paired with an accessible conversation
  const allConversations = useMemo(() => {
    const list = [...conversations];
    exchangeRequests.forEach((req) => {
      if (!list.some((c) => c.exchange_request_id === req.id)) {
        list.push({
          id: `conv-${req.id}`,
          exchange_request_id: req.id,
          listing_id: req.listing_id,
          requester_id: req.requester_id,
          provider_id: req.provider_id || req.listing?.user_id || '',
          status: ['rejected', 'cancelled', 'completed'].includes(req.status) ? 'read_only' : 'active',
          created_at: req.created_at,
          updated_at: req.updated_at || req.created_at,
          last_message_at: req.updated_at || req.created_at,
          listing: req.listing,
          requester: req.requester,
          provider: req.provider,
          exchange_request: req,
        });
      }
    });
    return list;
  }, [conversations, exchangeRequests]);

  // Action: Submit Environmental Report (Honest, clean, no fake municipal squad claims)
  const submitReport = (reportData: Omit<EnvironmentalReport, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'status'>) => {
    const randomTicket = `GL-REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const reporterId = currentUser ? currentUser.id : 'guest-reporter';
    const reporterName = currentUser ? currentUser.full_name : 'Community Citizen';
    const reportUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Date.now().toString().padStart(12, '0');

    const newReport: EnvironmentalReport = {
      ...reportData,
      id: reportUuid,
      ticket_number: randomTicket,
      reporter_id: reporterId,
      reporter_name: reporterName,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setReports((prev) => [newReport, ...prev]);

    if (isSupabaseConfigured && currentUser) {
      supabase.from('reports').insert([
        {
          id: newReport.id,
          reporter_id: reporterId,
          reported_item_type: 'environmental_issue',
          reported_item_id: newReport.id,
          reason: newReport.issue_type,
          details: JSON.stringify({
            title: newReport.title,
            description: newReport.description,
            other_description: newReport.other_description || null,
            district: newReport.district,
            ward: newReport.ward,
            locality: newReport.locality,
            landmark: newReport.landmark,
            latitude: newReport.latitude,
            longitude: newReport.longitude,
            photo_url: newReport.photo_url || null,
            ticket_number: randomTicket,
            issue_type: newReport.issue_type,
          }),
          status: 'pending',
        }
      ]).then(({ error }) => {
        if (error) {
          console.warn('Notice: Supabase report persistence notice:', error.message);
        }
      });
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        user_id: reporterId,
        title: `Report Registered: #${randomTicket}`,
        message: `Your environmental report for ${reportData.locality} has been recorded in the GreenLoop tracking registry.`,
        type: 'system',
        link: '/reports',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    return newReport.ticket_number;
  };

  const updateReportStatus = (reportId: string, status: 'pending' | 'in_progress' | 'resolved', notes?: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status,
              resolution_notes: notes || r.resolution_notes,
              updated_at: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const contextValue = useMemo<DataContextType>(
    () => ({
      categories,
      listings: populatedListings,
      demoListings,
      allMarketplaceListings,
      exchangeRequests,
      transactions,
      ecoPointsLedger,
      challenges,
      recyclingCentres,
      notifications,
      favourites,
      conversations: allConversations,
      metrics,
      wasteBins,
      wasteLocations,
      reports,
      isLoading,
      dataError,
      refreshData: fetchData,
      pendingScanPrefill,
      setPendingScanPrefill,
      addListing,
      updateListing,
      deleteListing,
      addWasteLocation,
      reportWasteLocation,
      createExchangeRequest,
      acceptExchangeRequest,
      rejectExchangeRequest,
      cancelExchangeRequest,
      confirmHandover,
      fetchConversations,
      fetchMessages,
      sendMessage,
      retryMessage,
      getParticipantContact,
      getWhatsAppContact,
      toggleFavourite,
      joinChallenge,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      submitReport,
      updateReportStatus,
    }),
    [
      categories,
      populatedListings,
      demoListings,
      allMarketplaceListings,
      exchangeRequests,
      transactions,
      ecoPointsLedger,
      challenges,
      recyclingCentres,
      notifications,
      favourites,
      allConversations,
      metrics,
      wasteBins,
      wasteLocations,
      reports,
      isLoading,
      dataError,
      fetchData,
      pendingScanPrefill,
      addListing,
      updateListing,
      deleteListing,
      addWasteLocation,
      reportWasteLocation,
      createExchangeRequest,
      acceptExchangeRequest,
      rejectExchangeRequest,
      cancelExchangeRequest,
      confirmHandover,
      fetchConversations,
      fetchMessages,
      sendMessage,
      retryMessage,
      getParticipantContact,
      getWhatsAppContact,
      toggleFavourite,
      joinChallenge,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      submitReport,
      updateReportStatus,
    ]
  );

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
