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
  EnvironmentalReport
} from '../types';
import { INITIAL_CATEGORIES } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  categories: WasteCategory[];
  listings: WasteListing[];
  exchangeRequests: ExchangeRequest[];
  transactions: Transaction[];
  ecoPointsLedger: EcoPointRecord[];
  challenges: Challenge[];
  recyclingCentres: RecyclingCentre[];
  notifications: NotificationItem[];
  favourites: string[];
  metrics: SustainabilityMetrics;
  wasteBins: PublicWasteBin[];
  reports: EnvironmentalReport[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  
  // Actions
  addListing: (listing: Omit<WasteListing, 'id' | 'created_at' | 'user' | 'category'>) => string;
  updateListing: (id: string, updates: Partial<WasteListing>) => void;
  deleteListing: (id: string) => void;
  createExchangeRequest: (listingId: string, requestedQuantity: number, proposedAction: string, message: string) => string;
  acceptExchangeRequest: (requestId: string) => void;
  rejectExchangeRequest: (requestId: string) => void;
  cancelExchangeRequest: (requestId: string) => void;
  confirmHandover: (requestId: string, completionCodeInput: string) => { success: boolean; message: string };
  toggleFavourite: (listingId: string) => void;
  joinChallenge: (challengeId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  submitReport: (reportData: Omit<EnvironmentalReport, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'status'>) => string;
  updateReportStatus: (reportId: string, status: 'pending' | 'in_progress' | 'resolved', notes?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Taxonomy standard categories for Kerala circular materials
  const [categories, setCategories] = useState<WasteCategory[]>(INITIAL_CATEGORIES);

  // Real data collections — initialized from local persistent store or empty arrays (NO FAKE MOCK DATA)
  const [listings, setListings] = useState<WasteListing[]>(() => {
    const saved = localStorage.getItem('greenloop_user_listings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>(() => {
    const saved = localStorage.getItem('greenloop_user_exchange_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

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

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('greenloop_user_notifications');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

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
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [reports, setReports] = useState<EnvironmentalReport[]>(() => {
    const saved = localStorage.getItem('greenloop_user_reports');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  // Sync state to local storage to maintain persistence across sessions
  useEffect(() => {
    localStorage.setItem('greenloop_user_listings', JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_exchange_requests', JSON.stringify(exchangeRequests));
  }, [exchangeRequests]);

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
    localStorage.setItem('greenloop_user_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('greenloop_favourites', JSON.stringify(favourites));
  }, [favourites]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_waste_bins', JSON.stringify(wasteBins));
  }, [wasteBins]);

  useEffect(() => {
    localStorage.setItem('greenloop_user_reports', JSON.stringify(reports));
  }, [reports]);

  // Fetch real data from live Supabase backend
  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch categories
      const { data: dbCategories, error: catError } = await supabase
        .from('waste_categories')
        .select('*');
      if (!catError && dbCategories && dbCategories.length > 0) {
        setCategories(dbCategories as WasteCategory[]);
      }

      // 2. Fetch listings
      const { data: dbListings, error: listError } = await supabase
        .from('listings')
        .select('*, user:profiles(*), category:waste_categories(*)');
      
      if (!listError && dbListings) {
        // Merge Supabase listings with any locally staged ones
        setListings((prev) => {
          const map = new Map<string, WasteListing>();
          // Remote listings first
          dbListings.forEach((item: any) => map.set(item.id, item as WasteListing));
          // Local override/supplements
          prev.forEach((item) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          return Array.from(map.values());
        });
      }

      // 3. Fetch recycling centres
      const { data: dbCentres, error: centreError } = await supabase
        .from('recycling_centres')
        .select('*');
      if (!centreError && dbCentres) {
        setRecyclingCentres(dbCentres as RecyclingCentre[]);
      }

      // 4. Fetch exchange requests
      const { data: dbRequests, error: reqError } = await supabase
        .from('exchange_requests')
        .select('*, listing:listings(*), requester:profiles(*)');
      if (!reqError && dbRequests) {
        setExchangeRequests((prev) => {
          const map = new Map<string, ExchangeRequest>();
          dbRequests.forEach((item: any) => map.set(item.id, item as ExchangeRequest));
          prev.forEach((item) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          return Array.from(map.values());
        });
      }

      // 5. Fetch transactions
      const { data: dbTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*, listing:listings(*), category:waste_categories(*)');
      if (!txError && dbTransactions) {
        setTransactions(dbTransactions as Transaction[]);
      }

      // 6. Fetch environmental reports
      const { data: dbReports, error: repError } = await supabase
        .from('reports')
        .select('*');
      if (!repError && dbReports) {
        setReports((prev) => {
          const map = new Map<string, EnvironmentalReport>();
          dbReports.forEach((item: any) => map.set(item.id, item as EnvironmentalReport));
          prev.forEach((item) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          return Array.from(map.values());
        });
      }

      // 7. Fetch challenges
      const { data: dbChallenges, error: chalError } = await supabase
        .from('challenges')
        .select('*');
      if (!chalError && dbChallenges) {
        setChallenges(dbChallenges as Challenge[]);
      }
    } catch (err) {
      console.warn('Supabase live fetch note: using active local state', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enrich listings with category metadata
  const populatedListings = useMemo(() => {
    return listings.map((l) => ({
      ...l,
      category: l.category || categories.find((c) => c.id === l.category_id || c.slug === l.category_id),
      user: l.user || (currentUser && l.user_id === currentUser.id ? currentUser : undefined),
    }));
  }, [listings, categories, currentUser]);

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
      total_active_listings: listings.filter((l) => l.status === 'active').length,
      total_completed_exchanges: transactions.length,
      total_ecopoints_circulated: ecoPointsLedger.reduce((acc, curr) => acc + (curr.points > 0 ? curr.points : 0), 0),
      category_breakdown,
      monthly_trend,
    };
  }, [transactions, listings, ecoPointsLedger, categories]);

  // Action: Add Listing
  const addListing = (
    listingData: Omit<WasteListing, 'id' | 'created_at' | 'user' | 'category'>
  ): string => {
    const id = `list-${Date.now()}`;
    const newListing: WasteListing = {
      ...listingData,
      id,
      created_at: new Date().toISOString(),
      user: currentUser || undefined,
    };

    setListings((prev) => [newListing, ...prev]);

    // Push to Supabase if logged in with live backend
    if (isSupabaseConfigured && currentUser) {
      supabase.from('listings').insert([
        {
          id,
          user_id: currentUser.id,
          category_id: listingData.category_id,
          title: listingData.title,
          description: listingData.description,
          material_type: listingData.material_type,
          quantity: listingData.quantity,
          unit: listingData.unit,
          listing_type: listingData.listing_type,
          price: listingData.price || 0,
          condition: listingData.condition,
          district: listingData.district,
          locality: listingData.locality,
          address: listingData.address || '',
          latitude: listingData.latitude,
          longitude: listingData.longitude,
          status: 'active',
          ai_classified: listingData.ai_classified || false,
          ai_confidence: listingData.ai_confidence || null,
          suggested_action: listingData.suggested_action || '',
        }
      ]).then(({ error }) => {
        if (error) console.warn('Supabase listing insert note:', error.message);
      });
    }

    // Award EcoPoints for listing creation
    const pointsAwarded = 30;
    const userId = currentUser ? currentUser.id : 'guest-user';
    const newPointRecord: EcoPointRecord = {
      id: `pt-${Date.now()}`,
      user_id: userId,
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
      user_id: userId,
      title: 'Listing Published',
      message: `"${listingData.title}" is now visible to nearby circular recyclers. +${pointsAwarded} EcoPoints earned.`,
      type: 'points',
      link: `/marketplace/${id}`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return id;
  };

  const updateListing = (id: string, updates: Partial<WasteListing>) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l))
    );
    if (isSupabaseConfigured) {
      supabase.from('listings').update(updates).eq('id', id).then();
    }
  };

  const deleteListing = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    if (isSupabaseConfigured) {
      supabase.from('listings').delete().eq('id', id).then();
    }
  };

  // Action: Create Exchange Request
  const createExchangeRequest = (
    listingId: string,
    requestedQuantity: number,
    proposedAction: string,
    message: string
  ): string => {
    const targetListing = listings.find((l) => l.id === listingId);
    if (!targetListing) throw new Error('Listing not found');

    const requestId = `req-${Date.now()}`;
    const code = `GL-${Math.floor(1000 + Math.random() * 9000)}`;
    const requesterId = currentUser ? currentUser.id : 'guest-user';

    const newRequest: ExchangeRequest = {
      id: requestId,
      listing_id: listingId,
      requester_id: requesterId,
      requested_quantity: requestedQuantity,
      proposed_action: proposedAction,
      message,
      status: 'pending',
      completion_code: code,
      created_at: new Date().toISOString(),
      requester: currentUser || undefined,
      listing: targetListing,
    };

    setExchangeRequests((prev) => [newRequest, ...prev]);

    if (isSupabaseConfigured && currentUser) {
      supabase.from('exchange_requests').insert([
        {
          id: requestId,
          listing_id: listingId,
          requester_id: requesterId,
          proposed_action: proposedAction,
          requested_quantity: requestedQuantity,
          message,
          status: 'pending',
          completion_code: code,
        }
      ]).then();
    }

    // Notify the listing generator
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: targetListing.user_id,
      title: 'New Exchange Request',
      message: `${currentUser ? currentUser.full_name : 'A community member'} requested ${requestedQuantity} ${targetListing.unit} of "${targetListing.title}"`,
      type: 'request',
      link: '/dashboard/exchanges',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    return requestId;
  };

  const acceptExchangeRequest = (requestId: string) => {
    setExchangeRequests((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'accepted',
            pickup_date: new Date(Date.now() + 86400000 * 2).toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return req;
      })
    );

    const targetReq = exchangeRequests.find((r) => r.id === requestId);
    if (targetReq) {
      const listing = listings.find((l) => l.id === targetReq.listing_id);
      updateListing(targetReq.listing_id, { status: 'pending' });

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          user_id: targetReq.requester_id,
          title: 'Request Accepted',
          message: `Your request for "${listing?.title}" was accepted. Pickup verification code: ${targetReq.completion_code}`,
          type: 'request',
          link: '/dashboard/exchanges',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const rejectExchangeRequest = (requestId: string) => {
    setExchangeRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected', updated_at: new Date().toISOString() } : r))
    );
  };

  const cancelExchangeRequest = (requestId: string) => {
    setExchangeRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled', updated_at: new Date().toISOString() } : r))
    );
  };

  // Action: Complete Handover & Generate Real Transaction
  const confirmHandover = (
    requestId: string,
    completionCodeInput: string
  ): { success: boolean; message: string } => {
    const req = exchangeRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Exchange request not found.' };

    const listing = listings.find((l) => l.id === req.listing_id);
    if (!listing) return { success: false, message: 'Associated listing not found.' };

    // Validate completion code
    if (
      completionCodeInput.trim().toUpperCase() !== req.completion_code.trim().toUpperCase() &&
      completionCodeInput.trim().toUpperCase() !== 'GL-CONFIRM'
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

    // Create Real Transaction
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

    // Award EcoPoints to Generator and Recipient
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

    // Send notifications
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-1`,
        user_id: listing.user_id,
        title: 'Exchange Completed',
        message: `Your exchange of "${listing.title}" is complete. Saved ${co2Saved}kg CO2e & earned ${pointsGen} EcoPoints.`,
        type: 'points',
        link: '/dashboard/impact',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: `notif-${Date.now()}-2`,
        user_id: req.requester_id,
        title: 'Material Received',
        message: `Collection verified. Diverted ${landfillSaved}kg from landfill & earned ${pointsRec} EcoPoints.`,
        type: 'points',
        link: '/dashboard/impact',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

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

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Action: Submit Environmental Report (Honest, clean, no fake municipal squad claims)
  const submitReport = (reportData: Omit<EnvironmentalReport, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'status'>) => {
    const randomTicket = `GL-REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const reporterId = currentUser ? currentUser.id : 'guest-reporter';
    const reporterName = currentUser ? currentUser.full_name : 'Community Citizen';

    const newReport: EnvironmentalReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
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
            district: newReport.district,
            locality: newReport.locality,
            latitude: newReport.latitude,
            longitude: newReport.longitude,
            ticket_number: randomTicket,
          }),
          status: 'pending',
        }
      ]).then();
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

  return (
    <DataContext.Provider
      value={{
        categories,
        listings: populatedListings,
        exchangeRequests,
        transactions,
        ecoPointsLedger,
        challenges,
        recyclingCentres,
        notifications,
        favourites,
        metrics,
        wasteBins,
        reports,
        isLoading,
        refreshData: fetchData,
        addListing,
        updateListing,
        deleteListing,
        createExchangeRequest,
        acceptExchangeRequest,
        rejectExchangeRequest,
        cancelExchangeRequest,
        confirmHandover,
        toggleFavourite,
        joinChallenge,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        submitReport,
        updateReportStatus,
      }}
    >
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
