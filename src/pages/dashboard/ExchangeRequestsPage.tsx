import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Check, 
  Plus, 
  Repeat, 
  MessageCircle, 
  Clock, 
  ShieldAlert, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExchangeStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Skeleton';
import { ProfileSettingsModal } from '../../components/profile/ProfileSettingsModal';
import { createWhatsAppLink, buildExchangeWhatsAppMessage } from '../../utils/whatsapp';
import { getExchangePartnerId } from '../../lib/exchangeUtils';

interface WhatsAppActionButtonProps {
  requestId: string;
  otherParticipantId: string | null;
  listingTitle: string;
  isAccepted: boolean;
  onOpenSettings?: () => void;
}

// In-memory contact cache keyed by `${requestId}:${partnerId}` to prevent button disappearing or flickering during re-renders
const whatsappContactCache = new Map<string, {
  whatsapp: string | null;
  has_whatsapp_consent: boolean;
  contact_state?: 'missing_number' | 'invalid_number' | 'sharing_disabled' | 'sharing_enabled' | 'error';
  notice?: string;
}>();

const WhatsAppActionButton: React.FC<WhatsAppActionButtonProps> = ({
  requestId,
  otherParticipantId,
  listingTitle,
  isAccepted,
  onOpenSettings,
}) => {
  const { getWhatsAppContact } = useData();
  const { currentUser } = useAuth();
  const cacheKey = `${requestId}:${otherParticipantId}`;
  const cachedData = otherParticipantId ? whatsappContactCache.get(cacheKey) : undefined;

  const [loading, setLoading] = useState(!cachedData && Boolean(isAccepted && otherParticipantId));
  const [retryKey, setRetryKey] = useState(0);
  const [contactData, setContactData] = useState<{
    whatsapp: string | null;
    has_whatsapp_consent: boolean;
    contact_state?: 'missing_number' | 'invalid_number' | 'sharing_disabled' | 'sharing_enabled' | 'error';
    notice?: string;
  } | null>(cachedData || null);

  const handleRetry = () => setRetryKey((k) => k + 1);

  useEffect(() => {
    let isMounted = true;
    if (!isAccepted || !otherParticipantId) {
      return;
    }

    if (currentUser?.id && otherParticipantId === currentUser.id) {
      return;
    }

    const currentCached = whatsappContactCache.get(cacheKey);
    if (currentCached && currentCached.whatsapp && retryKey === 0) {
      setContactData(currentCached);
      setLoading(false);
      return;
    }

    setLoading(true);
    getWhatsAppContact(requestId, otherParticipantId)
      .then((data) => {
        if (isMounted) {
          whatsappContactCache.set(cacheKey, data);
          setContactData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Failed to load WhatsApp contact:', err);
          const fallbackError = {
            whatsapp: null,
            has_whatsapp_consent: false,
            contact_state: 'error' as const,
            notice: 'Unable to connect to WhatsApp contact service',
          };
          if (!whatsappContactCache.has(cacheKey)) {
            setContactData(fallbackError);
          }
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestId, otherParticipantId, isAccepted, getWhatsAppContact, retryKey, cacheKey, currentUser?.id]);

  if (!isAccepted) return null;
  if (currentUser?.id && otherParticipantId === currentUser.id) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-outline border border-outline-variant/40">
        <AlertCircle className="w-3.5 h-3.5 text-outline shrink-0" />
        <span>Self-messaging unavailable</span>
      </div>
    );
  }

  // Show small loading indicator only while retrieving contact information
  if (loading && !contactData) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-gl-charcoal-muted border border-outline-variant/30">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-gl-forest shrink-0" />
        <span>Checking WhatsApp contact...</span>
      </div>
    );
  }

  if (!otherParticipantId) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-outline border border-outline-variant/40">
        <AlertCircle className="w-3.5 h-3.5 text-outline shrink-0" />
        <span>Exchange partner details unavailable</span>
      </div>
    );
  }

  if (!contactData) return null;

  // Explicit state 1: missing_number
  if (contactData.contact_state === 'missing_number') {
    return (
      <div className="p-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface-variant/90 border border-outline-variant/40 space-y-1 max-w-sm">
        <div className="flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-outline shrink-0" />
          <span>Partner has not added a WhatsApp number yet.</span>
        </div>
        <p className="text-[11px] text-gl-charcoal-muted">
          Coordination can continue via the built-in chat or handover verification code.
        </p>
      </div>
    );
  }

  // Explicit state 2: invalid_number
  if (contactData.contact_state === 'invalid_number') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-amber-700 border border-amber-200">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Partner's WhatsApp number is invalid.</span>
      </div>
    );
  }

  // Explicit state 3: error
  if (contactData.contact_state === 'error') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 text-xs text-rose-700 border border-rose-200">
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span>{contactData.notice || 'Unable to retrieve WhatsApp contact'}</span>
        <button
          type="button"
          onClick={handleRetry}
          className="text-gl-forest font-bold hover:underline text-[11px] ml-1"
        >
          Retry
        </button>
      </div>
    );
  }

  // Explicit state 4: WhatsApp contact available (saved number is sufficient)
  if (contactData.whatsapp) {
    let waUrl = '#';
    try {
      const prefilledText = buildExchangeWhatsAppMessage({ listingTitle });
      waUrl = createWhatsAppLink(contactData.whatsapp, prefilledText);
    } catch (linkErr) {
      console.warn('Failed to build WhatsApp link:', linkErr);
      const digitsOnly = contactData.whatsapp.replace(/\D/g, '');
      waUrl = `https://wa.me/${digitsOnly}`;
    }

    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium text-xs shadow-subtle transition-colors w-full sm:w-auto"
        title="Open WhatsApp chat with exchange partner"
      >
        <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
        <span>Message on WhatsApp</span>
      </a>
    );
  }

  return null;
};

export const ExchangeRequestsPage: React.FC = () => {
  const { 
    exchangeRequests, 
    listings, 
    acceptExchangeRequest, 
    rejectExchangeRequest, 
    cancelExchangeRequest, 
    confirmHandover 
  } = useData();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [codeInput, setCodeInput] = useState<{ [reqId: string]: string }>({});
  const [statusFeedback, setStatusFeedback] = useState<{ [reqId: string]: { success: boolean; msg: string } }>({});
  const [actionLoading, setActionLoading] = useState<{ [reqId: string]: boolean }>({});
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const currentUserId = currentUser?.id || '';

  const incomingRequests = exchangeRequests.filter((req) => {
    const providerId = req.provider_id || req.listing?.user_id || listings.find((l) => l.id === req.listing_id)?.user_id;
    return Boolean(providerId && providerId === currentUserId);
  });

  const outgoingRequests = exchangeRequests.filter((req) => req.requester_id === currentUserId);

  const handleAccept = async (requestId: string) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      await acceptExchangeRequest(requestId);
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: true, msg: 'Exchange proposal accepted! WhatsApp contact is unlocked for coordination.' },
      }));
    } catch (err: any) {
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: false, msg: err.message || 'Failed to accept request' },
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      await rejectExchangeRequest(requestId);
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: true, msg: 'Exchange proposal declined.' },
      }));
    } catch (err: any) {
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: false, msg: err.message || 'Failed to decline request' },
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleCancel = async (requestId: string) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      await cancelExchangeRequest(requestId);
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: true, msg: 'Request cancelled.' },
      }));
    } catch (err: any) {
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: false, msg: err.message || 'Failed to cancel request' },
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleConfirmHandover = async (requestId: string) => {
    const code = codeInput[requestId] || '';
    if (!code.trim()) {
      alert('Please enter the pickup verification code.');
      return;
    }

    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await confirmHandover(requestId, code);
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: res.success, msg: res.message },
      }));

      if (res.success) {
        setCodeInput((prev) => ({ ...prev, [requestId]: '' }));
      }
    } catch (err: any) {
      setStatusFeedback((prev) => ({
        ...prev,
        [requestId]: { success: false, msg: err.message || 'Handover confirmation failed' },
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const getStatusBadge = (status: ExchangeStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">Pending</span>;
      case 'accepted':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9]">Accepted</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Completed</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">Declined</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">Cancelled</span>;
    }
  };

  const currentList = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-5">
        <div>
          <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
            My Exchanges
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#5C6E66] mt-1">
            Coordinate pickups on WhatsApp and verify material handovers with secure completion codes.
          </p>
        </div>

        <Link to="/marketplace/new">
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
            Add Listing
          </Button>
        </Link>
      </div>

      {/* Graceful WhatsApp Prompt for Existing Users without WhatsApp Number */}
      {currentUser && (!currentUser.whatsapp_number || !currentUser.whatsapp_number.trim()) && (
        <div className="p-3.5 rounded-lg bg-[#F8F6EF] border border-[#E8E4DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-start gap-2.5">
            <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="font-sans font-medium text-xs sm:text-sm text-[#1C2826]">
                Add your WhatsApp number for easy pickup coordination
              </h4>
              <p className="text-xs text-[#5C6E66] mt-0.5">
                Connecting your WhatsApp allows accepted exchange partners to contact you directly. Your number is never shown publicly.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowProfileSettings(true)}
            className="shrink-0 text-xs"
          >
            Add WhatsApp Number
          </Button>
        </div>
      )}

      {/* Segmented Tabs */}
      <div className="inline-flex p-0.5 bg-white border border-[#E8E4DA] rounded-md">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-3 py-1.5 text-xs rounded transition-colors text-center ${
            activeTab === 'incoming'
              ? 'bg-[#103D2A] text-white font-medium shadow-subtle'
              : 'text-[#5C6E66] hover:text-[#1C2826]'
          }`}
        >
          Requests Received ({incomingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-3 py-1.5 text-xs rounded transition-colors text-center ${
            activeTab === 'outgoing'
              ? 'bg-[#103D2A] text-white font-medium shadow-subtle'
              : 'text-[#5C6E66] hover:text-[#1C2826]'
          }`}
        >
          My Requests ({outgoingRequests.length})
        </button>
      </div>

      {/* Requests Pipeline */}
      <div className="space-y-3.5">
        {currentList.length === 0 ? (
          <EmptyState
            icon={<Repeat className="w-6 h-6 text-[#7B8B83]" />}
            title={`No ${activeTab === 'incoming' ? 'incoming' : 'outgoing'} requests`}
            description={
              activeTab === 'incoming'
                ? 'When someone requests materials from your listings, they will appear here.'
                : 'Browse the marketplace to find materials and send exchange requests.'
            }
            actionLabel={activeTab === 'outgoing' ? 'Browse Marketplace' : 'Add Listing'}
            actionLink={activeTab === 'outgoing' ? '/marketplace' : '/marketplace/new'}
          />
        ) : (
          currentList.map((req) => {
            const listing = req.listing || listings.find((l) => l.id === req.listing_id);
            const feedback = statusFeedback[req.id];
            const isLoadingAction = Boolean(actionLoading[req.id]);

            // Canonical participant resolution: always resolves the other participant reliably
            const otherParticipantId = getExchangePartnerId(req, currentUserId, listings);

            return (
              <div
                key={req.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {req.status !== 'accepted' && getStatusBadge(req.status)}
                    <span className="text-xs text-[#5C6E66]">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-sans font-medium text-base text-[#1C2826]">
                    {listing?.title || 'Material Batch'}
                  </h3>

                  <div className="p-3 rounded-md bg-[#F8F6EF] text-xs text-[#1C2826] space-y-1 border border-[#E8E4DA]">
                    <div className="flex flex-wrap items-center gap-x-3">
                      <span><strong>Quantity:</strong> {req.requested_quantity} {listing?.unit || 'units'}</span>
                      <span className="text-[#DCD6CB]">•</span>
                      <span><strong>Purpose:</strong> {req.proposed_action}</span>
                    </div>
                    {req.message && (
                      <p className="text-[#5C6E66] text-xs italic">
                        "{req.message}"
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-[#5C6E66]">
                    {activeTab === 'incoming' ? (
                      <span>Requester: <strong className="text-[#1C2826] font-medium">{req.requester?.full_name || 'Buyer'}</strong></span>
                    ) : (
                      <span>Owner: <strong className="text-[#1C2826] font-medium">{req.provider?.full_name || listing?.user?.full_name || 'Seller'}</strong></span>
                    )}
                  </div>

                  {feedback && (
                    <div className={`p-2.5 rounded-md text-xs font-medium ${
                      feedback.success ? 'bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9]' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {feedback.msg}
                    </div>
                  )}
                </div>

                {/* Actions & Verification */}
                <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  {/* Status: Pending */}
                  {req.status === 'pending' && (
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-[#5C6E66]">
                        <Clock className="w-3.5 h-3.5 text-[#7B8B83]" />
                        <span>Waiting for approval</span>
                      </div>

                      {activeTab === 'incoming' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAccept(req.id)}
                            disabled={isLoadingAction}
                            icon={<Check className="w-3.5 h-3.5" />}
                          >
                            {isLoadingAction ? 'Processing...' : 'Accept'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(req.id)}
                            disabled={isLoadingAction}
                          >
                            {isLoadingAction ? 'Processing...' : 'Decline'}
                          </Button>
                        </div>
                      )}

                      {activeTab === 'outgoing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(req.id)}
                          disabled={isLoadingAction}
                        >
                          {isLoadingAction ? 'Cancelling...' : 'Cancel Request'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Status: Accepted (Ready for Handover & WhatsApp Enabled) */}
                  {req.status === 'accepted' && (
                    <div className="space-y-2.5 w-full md:w-auto flex flex-col items-start md:items-end">
                      {/* [ Accepted ] Status Badge */}
                      <div className="flex items-center gap-2">
                        {getStatusBadge(req.status)}
                      </div>

                      {/* [ Message on WhatsApp ] prominent green button */}
                      <WhatsAppActionButton
                        requestId={req.id}
                        otherParticipantId={otherParticipantId}
                        listingTitle={listing?.title || 'Material Batch'}
                        isAccepted={true}
                        onOpenSettings={() => setShowProfileSettings(true)}
                      />

                      {/* [ Pickup Verification Code ] */}
                      {activeTab === 'outgoing' ? (
                        <div className="p-3 bg-[#E8EFE9] rounded-md text-center space-y-0.5 border border-[#C8D6C9] w-full sm:w-auto">
                          <span className="text-[10px] text-[#103D2A] uppercase tracking-wider block font-medium">
                            Pickup Verification Code
                          </span>
                          <span className="font-mono font-bold text-xl text-[#103D2A] tracking-widest block">
                            {req.completion_code}
                          </span>
                          <span className="text-[11px] text-[#5C6E66] block">
                            Share this code at pickup to confirm handover.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 w-full sm:w-auto">
                          <span className="text-xs text-[#5C6E66] block font-normal">
                            Enter pickup code from buyer:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={10}
                              placeholder="Code"
                              value={codeInput[req.id] || ''}
                              onChange={(e) => setCodeInput({ ...codeInput, [req.id]: e.target.value })}
                              className="w-28 px-2.5 py-1.5 bg-white border border-[#DCD6CB] rounded-md text-center font-mono font-bold tracking-widest text-[#103D2A] focus:outline-none focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 text-xs shadow-subtle"
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleConfirmHandover(req.id)}
                              disabled={isLoadingAction}
                            >
                              Verify & Complete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status: Completed */}
                  {req.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-[#103D2A] font-medium text-xs bg-[#E8EFE9] border border-[#C8D6C9] px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Handover Completed
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />
    </div>
  );
};

export default ExchangeRequestsPage;
