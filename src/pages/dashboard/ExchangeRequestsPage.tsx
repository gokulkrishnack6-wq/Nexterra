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
  AlertCircle 
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExchangeStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Skeleton';
import { ProfileSettingsModal } from '../../components/profile/ProfileSettingsModal';

interface WhatsAppActionButtonProps {
  requestId: string;
  otherParticipantId: string;
  listingTitle: string;
  isAccepted: boolean;
}

const WhatsAppActionButton: React.FC<WhatsAppActionButtonProps> = ({
  requestId,
  otherParticipantId,
  listingTitle,
  isAccepted,
}) => {
  const { getWhatsAppContact } = useData();
  const [loading, setLoading] = useState(false);
  const [contactData, setContactData] = useState<{
    whatsapp: string | null;
    has_whatsapp_consent: boolean;
    contact_state?: 'missing_number' | 'invalid_number' | 'sharing_disabled' | 'sharing_enabled';
    notice?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isAccepted || !otherParticipantId) {
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
          setContactData({ whatsapp: null, has_whatsapp_consent: false, contact_state: 'sharing_disabled' });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestId, otherParticipantId, isAccepted, getWhatsAppContact]);

  if (!isAccepted) return null;

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-outline animate-pulse">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Checking WhatsApp availability...</span>
      </div>
    );
  }

  // Explicit state 1: missing_number
  if (contactData?.contact_state === 'missing_number' || (!contactData?.whatsapp && !contactData?.has_whatsapp_consent && contactData?.contact_state !== 'sharing_disabled')) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-outline border border-outline-variant/40">
        <AlertCircle className="w-3.5 h-3.5 text-outline shrink-0" />
        <span>{contactData?.notice || 'WhatsApp number not configured'}</span>
      </div>
    );
  }

  // Explicit state 2: invalid_number
  if (contactData?.contact_state === 'invalid_number') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-outline border border-outline-variant/40">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>{contactData.notice || 'Invalid WhatsApp number format'}</span>
      </div>
    );
  }

  // Explicit state 3: sharing_disabled
  if (contactData?.contact_state === 'sharing_disabled' || !contactData?.has_whatsapp_consent) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-on-surface-variant/80 border border-outline-variant/40">
        <ShieldAlert className="w-3.5 h-3.5 text-outline shrink-0" />
        <span>{contactData?.notice || 'WhatsApp contact not shared'}</span>
      </div>
    );
  }

  // Explicit state 4: sharing_enabled
  if (!contactData.whatsapp) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-outline border border-outline-variant/40">
        <AlertCircle className="w-3.5 h-3.5 text-outline shrink-0" />
        <span>WhatsApp number not configured</span>
      </div>
    );
  }

  // Normalize phone number (digits only, no +, spaces, or dashes)
  let cleanNumber = contactData.whatsapp.replace(/\D/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  }

  // Contextual pre-filled message (never expose the handover completion code!)
  const prefilledText = `Hi, I'm contacting you via GreenLoop regarding our accepted exchange for "${listingTitle}".`;
  const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(prefilledText)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all active:scale-95"
      title="Open WhatsApp chat with exchange partner"
    >
      <MessageCircle className="w-4 h-4 fill-white shrink-0" />
      <span>Chat on WhatsApp</span>
    </a>
  );
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
        return <Badge variant="pending">Pending Approval</Badge>;
      case 'accepted':
        return <Badge variant="active">Ready for Handover</Badge>;
      case 'completed':
        return <Badge variant="success">Completed • Verified</Badge>;
      case 'rejected':
        return <Badge variant="error">Declined</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
    }
  };

  const currentList = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Handover Pipeline</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Direct WhatsApp Coordination
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Exchange Management
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Coordinate collection handovers via WhatsApp and verify material transactions with secure pickup codes.
          </p>
        </div>

        <Link to="/marketplace/new">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Post Material Listing
          </Button>
        </Link>
      </div>

      {/* Graceful WhatsApp Prompt for Existing Users without WhatsApp Number */}
      {currentUser && (!currentUser.whatsapp_number || !currentUser.whatsapp_number.trim()) && (
        <div className="p-4 rounded-2xl bg-secondary-container/50 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="font-heading font-semibold text-xs sm:text-sm text-primary">
                Add your WhatsApp number for 1-click exchange pickups
              </h4>
              <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">
                Connecting your WhatsApp allows accepted exchange partners to coordinate collection details with you directly. Your number is never shown publicly.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowProfileSettings(true)}
            className="shrink-0 text-xs"
          >
            Configure WhatsApp
          </Button>
        </div>
      )}

      {/* Segmented Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-outline-variant/60 pb-2">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-3 sm:px-4 py-2 font-label-md text-xs sm:text-label-md rounded-lg transition-all text-center ${
            activeTab === 'incoming'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="sm:hidden">Incoming ({incomingRequests.length})</span>
          <span className="hidden sm:inline">Incoming Requests for My Listings ({incomingRequests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-3 sm:px-4 py-2 font-label-md text-xs sm:text-label-md rounded-lg transition-all text-center ${
            activeTab === 'outgoing'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="sm:hidden">My Claims ({outgoingRequests.length})</span>
          <span className="hidden sm:inline">My Outgoing Claims ({outgoingRequests.length})</span>
        </button>
      </div>

      {/* Requests Pipeline */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <EmptyState
            icon={<Repeat className="w-6 h-6" />}
            title={`No ${activeTab} exchange requests`}
            description={
              activeTab === 'incoming'
                ? 'When community members request materials from your listings, they will appear here for verification.'
                : 'Browse the waste marketplace to find materials and propose exchanges.'
            }
            actionLabel={activeTab === 'outgoing' ? 'Browse Marketplace' : 'List Material'}
            actionLink={activeTab === 'outgoing' ? '/marketplace' : '/marketplace/new'}
          />
        ) : (
          currentList.map((req) => {
            const listing = req.listing || listings.find((l) => l.id === req.listing_id);
            const feedback = statusFeedback[req.id];
            const isLoadingAction = Boolean(actionLoading[req.id]);

            // Derive the other participant's ID
            const otherParticipantId = activeTab === 'incoming'
              ? req.requester_id
              : (req.provider_id || listing?.user_id || '');

            return (
              <Card
                key={req.id}
                variant="elevated"
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(req.status)}
                    <span className="font-body-sm text-xs text-outline">
                      Created on {new Date(req.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-outline text-xs">•</span>
                    <span className="font-mono text-[11px] text-on-surface-variant">
                      ID: {req.id.slice(0, 8)}...
                    </span>
                  </div>

                  <h3 className="font-heading font-semibold text-title-md text-on-surface">
                    {listing?.title || 'Material Batch'}
                  </h3>

                  <div className="p-3 rounded-lg bg-surface-container-low text-body-sm text-on-surface space-y-1 border border-outline-variant/40">
                    <div className="flex flex-wrap items-center gap-x-4">
                      <span><strong>Requested Quantity:</strong> {req.requested_quantity} {listing?.unit || 'units'}</span>
                      <span>•</span>
                      <span><strong>Purpose:</strong> {req.proposed_action}</span>
                    </div>
                    {req.message && (
                      <p className="text-on-surface-variant text-xs italic">
                        "{req.message}"
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-outline font-label-sm">
                    {activeTab === 'incoming' ? (
                      <span>Requester: <strong>{req.requester?.full_name || 'Community Requester'}</strong></span>
                    ) : (
                      <span>Provider: <strong>{req.provider?.full_name || listing?.user?.full_name || 'Material Generator'}</strong></span>
                    )}
                  </div>

                  {feedback && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                      feedback.success ? 'bg-secondary-container text-primary' : 'bg-error-container text-on-error-container'
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
                      <div className="flex items-center gap-1.5 text-xs text-outline italic">
                        <Clock className="w-3.5 h-3.5 text-outline" />
                        <span>Waiting for provider acceptance</span>
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
                            {isLoadingAction ? 'Processing...' : 'Accept Proposal'}
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
                    <div className="space-y-3 w-full md:w-auto flex flex-col items-start md:items-end">
                      {/* WhatsApp Button (Available ONLY on accepted status) */}
                      <WhatsAppActionButton
                        requestId={req.id}
                        otherParticipantId={otherParticipantId}
                        listingTitle={listing?.title || 'Material Batch'}
                        isAccepted={true}
                      />

                      {activeTab === 'outgoing' ? (
                        <div className="p-3 bg-secondary-container rounded-lg text-center space-y-1 border border-primary/20 w-full sm:w-auto">
                          <span className="font-label-sm text-[10px] text-primary uppercase tracking-wider block font-semibold">
                            Your Handover Pass Code
                          </span>
                          <span className="font-heading font-bold text-2xl text-primary tracking-widest block font-mono">
                            {req.completion_code}
                          </span>
                          <span className="text-[11px] text-on-surface-variant block">
                            Present this code to the provider at pickup to verify transfer.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2 w-full sm:w-auto">
                          <span className="font-label-sm text-[11px] text-outline block">
                            Enter Requester's Pass Code at Handover:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={10}
                              placeholder="Code"
                              value={codeInput[req.id] || ''}
                              onChange={(e) => setCodeInput({ ...codeInput, [req.id]: e.target.value })}
                              className="w-28 px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-center font-mono font-bold tracking-widest text-primary focus:outline-none focus:border-primary"
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleConfirmHandover(req.id)}
                              disabled={isLoadingAction}
                            >
                              Verify & Confirm
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status: Completed (Preserve History, No Contact Disclosure) */}
                  {req.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-primary font-semibold text-xs bg-secondary-container px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4" /> EcoPoints Credited
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
