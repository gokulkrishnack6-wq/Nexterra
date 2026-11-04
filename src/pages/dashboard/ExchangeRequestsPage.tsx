import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Key, 
  Check, 
  Plus,
  Repeat,
  ShieldCheck,
  QrCode,
  Calendar,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExchangeStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

export const ExchangeRequestsPage: React.FC = () => {
  const { 
    exchangeRequests, 
    listings, 
    acceptExchangeRequest, 
    rejectExchangeRequest, 
    cancelExchangeRequest, 
    confirmHandover 
  } = useData();
  const { currentUser, allDemoUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [codeInput, setCodeInput] = useState<{ [reqId: string]: string }>({});
  const [statusFeedback, setStatusFeedback] = useState<{ [reqId: string]: { success: boolean; msg: string } }>({});

  const incomingRequests = exchangeRequests.filter((req) => {
    const listing = listings.find((l) => l.id === req.listing_id);
    return listing && listing.user_id === currentUser.id;
  });

  const outgoingRequests = exchangeRequests.filter((req) => req.requester_id === currentUser.id);

  const handleConfirmHandover = (requestId: string) => {
    const code = codeInput[requestId] || '';
    if (!code.trim()) {
      alert('Please enter the 6-character pickup verification code.');
      return;
    }

    const res = confirmHandover(requestId, code);
    setStatusFeedback((prev) => ({
      ...prev,
      [requestId]: { success: res.success, msg: res.message },
    }));

    if (res.success) {
      setCodeInput((prev) => ({ ...prev, [requestId]: '' }));
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

  const getUserName = (userId: string) => {
    const u = allDemoUsers.find((x) => x.id === userId);
    return u ? `${u.full_name} (${u.role})` : 'Participant';
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
              Dual-Verification Protocol
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Exchange Management
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Coordinate collection handovers and verify material transactions with secure 6-digit codes.
          </p>
        </div>

        <Link to="/marketplace/new">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Post Material Listing
          </Button>
        </Link>
      </div>

      {/* Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 font-label-md text-label-md rounded-lg transition-all ${
            activeTab === 'incoming'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Incoming Requests for My Listings ({incomingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 font-label-md text-label-md rounded-lg transition-all ${
            activeTab === 'outgoing'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          My Outgoing Claims ({outgoingRequests.length})
        </button>
      </div>

      {/* Requests Pipeline */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <Card variant="flat" className="py-16 text-center space-y-2">
            <Repeat className="w-8 h-8 text-outline mx-auto" />
            <h3 className="font-heading font-semibold text-title-md text-primary">
              No {activeTab} exchange requests at this time
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto">
              {activeTab === 'incoming'
                ? 'When other users request materials from your listings, they will show up here.'
                : 'Browse the waste marketplace to find materials and propose exchanges.'}
            </p>
            {activeTab === 'outgoing' && (
              <Link to="/marketplace">
                <Button variant="secondary" size="sm">
                  Browse Marketplace
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          currentList.map((req) => {
            const listing = listings.find((l) => l.id === req.listing_id);
            const feedback = statusFeedback[req.id];

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
                  </div>

                  <h3 className="font-heading font-semibold text-title-md text-on-surface">
                    {listing?.title || 'Material Batch'}
                  </h3>

                  <div className="p-3 rounded-lg bg-surface-container-low text-body-sm text-on-surface space-y-1 border border-outline-variant/40">
                    <div className="flex flex-wrap items-center gap-x-4">
                      <span><strong>Requested Quantity:</strong> {req.requested_quantity} {listing?.unit}</span>
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
                      <span>Requester: <strong>{getUserName(req.requester_id)}</strong></span>
                    ) : (
                      <span>Generator: <strong>{listing?.user?.full_name || 'Listing Owner'}</strong></span>
                    )}
                  </div>

                  {feedback && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                      feedback.success ? 'bg-tertiary-fixed text-primary' : 'bg-error-container text-on-error-container'
                    }`}>
                      {feedback.msg}
                    </div>
                  )}
                </div>

                {/* Actions & Verification */}
                <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  {/* Status: Pending */}
                  {req.status === 'pending' && activeTab === 'incoming' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => acceptExchangeRequest(req.id)}
                        icon={<Check className="w-3.5 h-3.5" />}
                      >
                        Accept Proposal
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => rejectExchangeRequest(req.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {req.status === 'pending' && activeTab === 'outgoing' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelExchangeRequest(req.id)}
                    >
                      Cancel Request
                    </Button>
                  )}

                  {/* Status: Accepted (Ready for Handover) */}
                  {req.status === 'accepted' && (
                    <div className="space-y-2 w-full md:w-auto">
                      {activeTab === 'outgoing' ? (
                        <div className="p-3 bg-tertiary-fixed rounded-lg text-center space-y-1 border border-primary/20">
                          <span className="font-label-sm text-[10px] text-primary uppercase tracking-wider block font-semibold">
                            Your Handover Pass Code
                          </span>
                          <span className="font-heading font-bold text-2xl text-primary tracking-widest block font-mono">
                            {req.completion_code}
                          </span>
                          <span className="text-[11px] text-on-surface-variant block">
                            Give this code to the material generator at pickup to verify transfer.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="font-label-sm text-[11px] text-outline block">
                            Enter Requester's 6-Digit Pass Code at Handover:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="e.g. 849201"
                              value={codeInput[req.id] || ''}
                              onChange={(e) => setCodeInput({ ...codeInput, [req.id]: e.target.value })}
                              className="w-28 px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-center font-mono font-bold tracking-widest text-primary focus:outline-none focus:border-primary-container"
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleConfirmHandover(req.id)}
                            >
                              Verify & Confirm
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status: Completed */}
                  {req.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-primary font-semibold text-xs bg-tertiary-fixed px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4" /> EcoPoints Credited
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
