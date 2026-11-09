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

interface WhatsAppActionButtonProps {
  requestId: string;
  otherParticipantId: string;
  listingTitle: string;
  isAccepted: boolean;
  onOpenSettings?: () => void;
}

const WhatsAppActionButton: React.FC<WhatsAppActionButtonProps> = ({
  requestId,
  otherParticipantId,
  listingTitle,
  isAccepted,
  onOpenSettings,
}) => {
  const { getWhatsAppContact } = useData();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [contactData, setContactData] = useState<{
    whatsapp: string | null;
    has_whatsapp_consent: boolean;
    contact_state?: 'missing_number' | 'invalid_number' | 'sharing_disabled' | 'sharing_enabled' | 'error';
    notice?: string;
  } | null>(null);

  const handleRetry = () => setRetryKey((k) => k + 1);

  useEffect(() => {
    let isMounted = true;
    if (!isAccepted || !otherParticipantId) {
      setContactData(null);
      return;
    }

    if (currentUser?.id && otherParticipantId === currentUser.id) {
      setContactData(null);
      return;
    }

    setLoading(true);
    getWhatsAppContact(requestId, otherParticipantId)
      .then((data) => {
        if (isMounted) {
          setContactData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Failed to load WhatsApp contact:', err);
          setContactData({
            whatsapp: null,
            has_whatsapp_consent: false,
            contact_state: 'error',
            notice: 'Unable to connect to WhatsApp contact service',
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestId, otherParticipantId, isAccepted, getWhatsAppContact, retryKey]);

  if (!isAccepted) return null;
  if (currentUser?.id && otherParticipantId === currentUser.id) return null;

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
        className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-95 w-full sm:w-auto"
        title="Open WhatsApp chat with exchange partner"
      >
        <MessageCircle className="w-4 h-4 fill-white shrink-0" />
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
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Pending</span>;
      case 'accepted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gl-sage-light text-gl-dark border border-gl-sage">Accepted</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Completed</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">Declined</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">Cancelled</span>;
    }
  };

  const currentList = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-gl-charcoal tracking-tight">
            Exchange Requests
          </h1>
          <p className="text-sm text-gl-charcoal-muted mt-1">
            Coordinate pickups on WhatsApp and verify material handovers with secure completion codes.
          </p>
        </div>

        <Link to="/marketplace/new">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} className="rounded-xl shadow-sm">
            Add Listing
          </Button>
        </Link>
      </div>

      {/* Graceful WhatsApp Prompt for Existing Users without WhatsApp Number */}
      {currentUser && (!currentUser.whatsapp_number || !currentUser.whatsapp_number.trim()) && (
        <div className="p-4 rounded-2xl bg-gl-sage-light/50 border border-gl-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="font-heading font-semibold text-xs sm:text-sm text-gl-charcoal">
                Add your WhatsApp number for easy pickup coordination
              </h4>
              <p className="text-[11px] sm:text-xs text-gl-charcoal-muted mt-0.5">
                Connecting your WhatsApp allows accepted exchange partners to contact you directly. Your number is never shown publicly.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowProfileSettings(true)}
            className="shrink-0 text-xs rounded-xl"
          >
            Add WhatsApp Number
          </Button>
        </div>
      )}


      {/* Segmented Tabs */}
      <div className="inline-flex p-1 bg-gl-cream/80 border border-gl-border rounded-xl">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 text-xs sm:text-sm rounded-lg transition-all text-center ${
            activeTab === 'incoming'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          Requests Received ({incomingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 text-xs sm:text-sm rounded-lg transition-all text-center ${
            activeTab === 'outgoing'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          My Requests ({outgoingRequests.length})
        </button>
      </div>

      {/* Requests Pipeline */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <EmptyState
            icon={<Repeat className="w-6 h-6 text-gl-charcoal-muted" />}
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

            // Robust derivation of provider ID and other participant's ID
            const providerId = req.provider_id || req.listing?.user_id || listing?.user_id || listings.find((l) => l.id === req.listing_id)?.user_id || '';
            const isCurrentUserProvider = Boolean(currentUser?.id && providerId && currentUser.id === providerId);
            const isCurrentUserRequester = Boolean(currentUser?.id && req.requester_id && currentUser.id === req.requester_id);

            // If current user is provider, target is requester. If current user is requester, target is provider.
            const otherParticipantId = isCurrentUserProvider
              ? req.requester_id
              : (isCurrentUserRequester ? providerId : (activeTab === 'incoming' ? req.requester_id : providerId));

            return (
              <Card
                key={req.id}
                variant="elevated"
                className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white border border-gl-border rounded-2xl shadow-card hover:shadow-card-hover transition-all"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {req.status !== 'accepted' && getStatusBadge(req.status)}
                    <span className="text-xs text-gl-charcoal-muted font-medium">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-gl-charcoal">
                    {listing?.title || 'Material Batch'}
                  </h3>

                  <div className="p-3.5 rounded-xl bg-gl-cream/50 text-xs text-gl-charcoal space-y-1.5 border border-gl-border">
                    <div className="flex flex-wrap items-center gap-x-3 text-gl-charcoal">
                      <span><strong>Quantity:</strong> {req.requested_quantity} {listing?.unit || 'units'}</span>
                      <span className="text-gl-charcoal-muted">•</span>
                      <span><strong>Purpose:</strong> {req.proposed_action}</span>
                    </div>
                    {req.message && (
                      <p className="text-gl-charcoal-muted text-xs italic">
                        "{req.message}"
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-gl-charcoal-muted">
                    {activeTab === 'incoming' ? (
                      <span>Requester: <strong className="text-gl-charcoal">{req.requester?.full_name || 'Buyer'}</strong></span>
                    ) : (
                      <span>Owner: <strong className="text-gl-charcoal">{req.provider?.full_name || listing?.user?.full_name || 'Seller'}</strong></span>
                    )}
                  </div>

                  {feedback && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${
                      feedback.success ? 'bg-gl-sage-light text-gl-dark border border-gl-sage' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {feedback.msg}
                    </div>
                  )}
                </div>

                {/* Actions & Verification */}
                <div className="flex flex-col items-start md:items-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  {/* Status: Pending */}
                  {req.status === 'pending' && (
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-gl-charcoal-muted italic">
                        <Clock className="w-3.5 h-3.5 text-gl-charcoal-muted" />
                        <span>Waiting for owner approval</span>
                      </div>

                      {activeTab === 'incoming' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAccept(req.id)}
                            disabled={isLoadingAction}
                            icon={<Check className="w-3.5 h-3.5" />}
                            className="rounded-xl shadow-sm"
                          >
                            {isLoadingAction ? 'Processing...' : 'Accept'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(req.id)}
                            disabled={isLoadingAction}
                            className="rounded-xl"
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
                          className="rounded-xl"
                        >
                          {isLoadingAction ? 'Cancelling...' : 'Cancel Request'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Status: Accepted (Ready for Handover & WhatsApp Enabled) */}
                  {req.status === 'accepted' && (
                    <div className="space-y-3 w-full md:w-auto flex flex-col items-start md:items-end">
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
                        <div className="p-3.5 bg-gl-sage-light/70 rounded-xl text-center space-y-1 border border-gl-sage w-full sm:w-auto">
                          <span className="text-[10px] text-gl-dark uppercase tracking-wider block font-bold">
                            Pickup Verification Code
                          </span>
                          <span className="font-heading font-extrabold text-2xl text-gl-forest tracking-widest block font-mono">
                            {req.completion_code}
                          </span>
                          <span className="text-[11px] text-gl-charcoal-muted block">
                            Share this code with the owner at pickup to confirm handover.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2 w-full sm:w-auto">
                          <span className="text-xs text-gl-charcoal-muted block font-medium">
                            Enter pickup code from buyer:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={10}
                              placeholder="Code"
                              value={codeInput[req.id] || ''}
                              onChange={(e) => setCodeInput({ ...codeInput, [req.id]: e.target.value })}
                              className="w-28 px-3 py-1.5 bg-white border border-gl-border rounded-xl text-center font-mono font-bold tracking-widest text-gl-forest focus:outline-none focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 text-sm shadow-2xs"
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleConfirmHandover(req.id)}
                              disabled={isLoadingAction}
                              className="rounded-xl shadow-sm"
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
                    <div className="flex items-center gap-1.5 text-gl-forest font-semibold text-xs bg-gl-sage-light border border-gl-sage px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-gl-fresh" /> Handover Completed
                    </div>
                  )}
                </div>
              </Card>
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
