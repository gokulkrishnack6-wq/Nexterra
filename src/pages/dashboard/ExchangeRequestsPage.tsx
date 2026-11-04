import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Key, 
  Check, 
  Plus
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExchangeStatus } from '../../types';

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
        return <span className="bg-[#FAF3E0] text-[#7A5B04] text-[11px] font-medium px-2 py-0.5 rounded border border-[#E8DEC0]">Pending</span>;
      case 'accepted':
        return <span className="bg-olive/60 text-forest text-[11px] font-medium px-2 py-0.5 rounded border border-[#C5D5BD]">Ready for Pickup</span>;
      case 'completed':
        return <span className="bg-[#EBF0E6] text-forest text-[11px] font-semibold px-2 py-0.5 rounded border border-[#D0DEC9]">Completed</span>;
      case 'rejected':
        return <span className="bg-[#FBEAE8] text-[#9E2A2B] text-[11px] font-medium px-2 py-0.5 rounded">Declined</span>;
      case 'cancelled':
        return <span className="bg-[#F0F0F0] text-charcoal-muted text-[11px] font-medium px-2 py-0.5 rounded">Cancelled</span>;
    }
  };

  const getUserName = (userId: string) => {
    const u = allDemoUsers.find((x) => x.id === userId);
    return u ? `${u.full_name} (${u.role})` : 'Participant';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
            Exchange Management
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Coordinate collection handovers and verify material transactions with secure 6-digit codes.
          </p>
        </div>

        <Link
          to="/marketplace/new"
          className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-xs font-semibold px-3.5 py-2 rounded-md transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Post Listing</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E2D8] text-xs">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'incoming'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Incoming Requests ({incomingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'outgoing'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          My Outgoing Requests ({outgoingRequests.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'incoming' ? (
          incomingRequests.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E2E2D8] p-12 text-center text-xs space-y-2">
              <Clock className="w-6 h-6 text-charcoal-muted mx-auto" />
              <h3 className="font-heading font-semibold text-sm text-charcoal">
                No incoming collection requests
              </h3>
              <p className="text-charcoal-muted">
                When someone requests materials you have listed, their proposals will appear here.
              </p>
            </div>
          ) : (
            incomingRequests.map((req) => {
              const listing = listings.find((l) => l.id === req.listing_id);
              const feedback = statusFeedback[req.id];

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-4 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0F0E6]">
                    <div>
                      <span className="text-[11px] text-charcoal-muted block">
                        Listing: {listing?.title}
                      </span>
                      <h3 className="font-heading font-semibold text-sm text-charcoal">
                        Request from {getUserName(req.requester_id)}
                      </h3>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-cream rounded-md border border-[#E2E2D8]">
                    <div>
                      <span className="text-[11px] text-charcoal-muted block">Requested Quantity</span>
                      <span className="font-semibold text-charcoal block mt-0.5">
                        {req.requested_quantity} {listing?.unit || 'kg'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-charcoal-muted block">Proposed Purpose</span>
                      <span className="font-semibold text-charcoal block mt-0.5">
                        {req.proposed_action}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-charcoal-muted block">Request Date</span>
                      <span className="text-charcoal-muted block mt-0.5">
                        {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {req.message && (
                    <div className="p-3 bg-cream rounded-md text-charcoal text-[11px] leading-relaxed">
                      <span className="font-medium text-charcoal block mb-0.5">Note:</span>
                      "{req.message}"
                    </div>
                  )}

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0F0E6]">
                      <button
                        onClick={() => rejectExchangeRequest(req.id)}
                        className="px-3 py-1.5 text-xs text-charcoal hover:bg-cream rounded border border-[#D5D5CA]"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => acceptExchangeRequest(req.id)}
                        className="px-4 py-1.5 bg-forest hover:bg-forest-dark text-white font-medium text-xs rounded transition-colors"
                      >
                        Accept & Authorize Pickup
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <div className="p-3.5 bg-cream rounded-md border border-[#D5D5CA] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-charcoal flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-forest" />
                          <span>Enter Collector's Pickup Code</span>
                        </span>
                        <span className="text-[11px] text-charcoal-muted">
                          (Demo code: <code className="bg-white border px-1 rounded font-mono font-medium">{req.completion_code}</code>)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="e.g. GL-8924"
                          value={codeInput[req.id] || ''}
                          onChange={(e) =>
                            setCodeInput((prev) => ({ ...prev, [req.id]: e.target.value.toUpperCase() }))
                          }
                          className="px-3 py-1.5 bg-white border border-[#D5D5CA] rounded text-xs font-mono font-semibold tracking-wider text-charcoal uppercase w-36 focus:outline-none focus:ring-1 focus:ring-forest"
                        />
                        <button
                          onClick={() => handleConfirmHandover(req.id)}
                          className="px-4 py-1.5 bg-forest hover:bg-forest-dark text-white font-medium text-xs rounded transition-colors"
                        >
                          Verify Handover
                        </button>
                      </div>

                      {feedback && (
                        <p className={`text-[11px] font-medium pt-1 ${feedback.success ? 'text-forest' : 'text-red-600'}`}>
                          {feedback.msg}
                        </p>
                      )}
                    </div>
                  )}

                  {req.status === 'completed' && (
                    <div className="p-2.5 bg-cream rounded-md border border-[#E2E2D8] flex items-center justify-between text-xs text-charcoal">
                      <span className="font-medium">Handover confirmed & recorded in environmental telemetry.</span>
                      <Link to="/impact" className="text-forest hover:underline font-medium">
                        View impact metrics →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          outgoingRequests.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E2E2D8] p-12 text-center text-xs space-y-2">
              <h3 className="font-heading font-semibold text-sm text-charcoal">
                No outgoing requests
              </h3>
              <p className="text-charcoal-muted">
                You haven't requested any materials yet.
              </p>
              <Link to="/marketplace" className="text-xs text-forest font-semibold hover:underline inline-block pt-1">
                Browse marketplace →
              </Link>
            </div>
          ) : (
            outgoingRequests.map((req) => {
              const listing = listings.find((l) => l.id === req.listing_id);

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-4 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0F0E6]">
                    <div>
                      <h3 className="font-heading font-semibold text-sm text-charcoal">
                        {listing?.title || 'Material Request'}
                      </h3>
                      <p className="text-charcoal-muted text-[11px]">
                        {listing?.locality}, {listing?.district}
                      </p>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-cream rounded-md border border-[#E2E2D8]">
                    <div>
                      <span className="text-[11px] text-charcoal-muted block">Requested Quantity</span>
                      <span className="font-semibold text-charcoal block mt-0.5">
                        {req.requested_quantity} {listing?.unit || 'kg'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-charcoal-muted block">Proposed Purpose</span>
                      <span className="font-semibold text-charcoal block mt-0.5">
                        {req.proposed_action}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-charcoal-muted block">Pickup Code (Present to owner)</span>
                      <span className="font-mono font-bold text-forest text-sm block mt-0.5">
                        {req.completion_code}
                      </span>
                    </div>
                  </div>

                  {req.status === 'accepted' && (
                    <div className="p-3 bg-cream rounded-md border border-[#D5D5CA] text-xs space-y-1">
                      <span className="font-semibold text-forest block">Request Accepted</span>
                      <p className="text-charcoal-muted text-[11px]">
                        Share the code <strong className="text-charcoal font-mono">{req.completion_code}</strong> with the generator during physical collection to confirm the exchange.
                      </p>
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => cancelExchangeRequest(req.id)}
                        className="text-xs text-charcoal-muted hover:text-red-600"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};
