import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Key, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Store,
  Check,
  AlertCircle
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

  // Incoming requests: Requests for listings created by current user
  const incomingRequests = exchangeRequests.filter((req) => {
    const listing = listings.find((l) => l.id === req.listing_id);
    return listing && listing.user_id === currentUser.id;
  });

  // Outgoing requests: Requests submitted by current user
  const outgoingRequests = exchangeRequests.filter((req) => req.requester_id === currentUser.id);

  const handleConfirmHandover = (requestId: string) => {
    const code = codeInput[requestId] || '';
    if (!code.trim()) {
      alert('Please enter the 6-character pickup verification code provided by the collector.');
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
        return <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Approval</span>;
      case 'accepted':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Accepted & Ready for Pickup</span>;
      case 'completed':
        return <span className="bg-forest text-lime font-black px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1"><Check className="w-3 h-3" /> Completed & Verified</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'cancelled':
        return <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full text-[11px]">Cancelled</span>;
    }
  };

  const getUserName = (userId: string) => {
    const u = allDemoUsers.find((x) => x.id === userId);
    return u ? `${u.full_name} (${u.role})` : 'Eco Collector';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-forest-dark">
            Exchange & Handover Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Coordinate pickups, verify handovers with 6-digit cryptographic security codes, and log verified diversion.
          </p>
        </div>

        <Link
          to="/marketplace/new"
          className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Store className="w-4 h-4 text-lime" />
          <span>Post New Listing</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-sage/40 pb-2">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'incoming'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest hover:bg-white'
          }`}
        >
          Incoming Collection Requests ({incomingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest hover:bg-white'
          }`}
        >
          My Outgoing Requests ({outgoingRequests.length})
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {activeTab === 'incoming' ? (
          incomingRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-sage/40 p-12 text-center shadow-soft space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="font-heading font-bold text-base text-forest-dark">
                No incoming collection requests
              </h3>
              <p className="text-xs text-slate-500">
                When nearby farmers or recyclers request your listed materials, they will appear here for verification.
              </p>
            </div>
          ) : (
            incomingRequests.map((req) => {
              const listing = listings.find((l) => l.id === req.listing_id);
              const feedback = statusFeedback[req.id];

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest block">
                        Listing: {listing?.title || 'Material Batch'}
                      </span>
                      <h3 className="font-heading font-bold text-base text-forest-dark">
                        Request from {getUserName(req.requester_id)}
                      </h3>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-offwhite rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Requested Quantity</span>
                      <span className="font-bold text-forest-dark text-sm">
                        {req.requested_quantity} {listing?.unit || 'kg'}
                      </span>
                    </div>

                    <div className="p-3 bg-offwhite rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Proposed Circular Action</span>
                      <span className="font-bold text-forest-dark text-xs mt-0.5 block">
                        {req.proposed_action}
                      </span>
                    </div>

                    <div className="p-3 bg-offwhite rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Date Requested</span>
                      <span className="font-medium text-slate-600 block mt-0.5">
                        {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {req.message && (
                    <div className="p-3 bg-sage-light/20 rounded-xl border border-sage/40 text-xs text-slate-700">
                      <span className="font-bold text-forest-dark block mb-0.5">Collector's Note:</span>
                      "{req.message}"
                    </div>
                  )}

                  {/* Actions depending on status */}
                  {req.status === 'pending' && (
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => rejectExchangeRequest(req.id)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => acceptExchangeRequest(req.id)}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-forest hover:bg-forest-dark text-white shadow-sm transition-all"
                      >
                        Accept & Approve Pickup
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                          <Key className="w-4 h-4 text-emerald-700" />
                          <span>Handover Verification Code Entry</span>
                        </div>
                        <span className="text-[11px] text-emerald-700">
                          Ask collector for their 6-digit code (or test code: <code className="bg-emerald-200/80 px-1 py-0.5 rounded font-mono font-bold">{req.completion_code}</code>)
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
                          className="px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold tracking-widest text-emerald-950 uppercase w-48 focus:ring-2 focus:ring-forest"
                        />
                        <button
                          onClick={() => handleConfirmHandover(req.id)}
                          className="px-5 py-2 bg-forest hover:bg-forest-dark text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                          Verify & Complete Handover
                        </button>
                      </div>

                      {feedback && (
                        <p className={`text-xs font-medium ${feedback.success ? 'text-emerald-700' : 'text-red-600'}`}>
                          {feedback.msg}
                        </p>
                      )}
                    </div>
                  )}

                  {req.status === 'completed' && (
                    <div className="p-3 bg-forest text-lime rounded-xl flex items-center justify-between text-xs font-bold shadow-inner">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-lime" />
                        <span>Handover Completed & Diverted from Landfill!</span>
                      </div>
                      <Link to="/dashboard/impact" className="underline hover:text-white">
                        View Environmental Impact →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          outgoingRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-sage/40 p-12 text-center shadow-soft space-y-2">
              <Store className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="font-heading font-bold text-base text-forest-dark">
                No outgoing requests
              </h3>
              <p className="text-xs text-slate-500">
                You haven't requested any materials yet. Browse the marketplace or use Smart Match to request materials.
              </p>
              <Link to="/marketplace" className="mt-2 inline-flex items-center text-xs text-forest font-bold hover:underline">
                Explore Marketplace →
              </Link>
            </div>
          ) : (
            outgoingRequests.map((req) => {
              const listing = listings.find((l) => l.id === req.listing_id);

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-heading font-bold text-base text-forest-dark">
                        {listing?.title || 'Requested Waste Batch'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {listing?.locality}, {listing?.district}
                      </p>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-offwhite rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Requested Quantity</span>
                      <span className="font-bold text-forest-dark text-sm">
                        {req.requested_quantity} {listing?.unit || 'kg'}
                      </span>
                    </div>

                    <div className="p-3 bg-offwhite rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">My Proposed Purpose</span>
                      <span className="font-bold text-forest-dark text-xs mt-0.5 block">
                        {req.proposed_action}
                      </span>
                    </div>

                    <div className="p-3 bg-offwhite rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">My Handover Pickup Code</span>
                      <span className="font-mono font-black text-forest text-sm block mt-0.5 tracking-wider">
                        {req.completion_code}
                      </span>
                    </div>
                  </div>

                  {req.status === 'accepted' && (
                    <div className="p-3.5 bg-lime/20 border border-lime/40 rounded-xl text-xs text-forest-dark space-y-1">
                      <p className="font-bold">
                        🎉 Generator accepted your request!
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Present the code <strong>{req.completion_code}</strong> to the generator at pickup to verify handover and credit your +30 EcoPoints.
                      </p>
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => cancelExchangeRequest(req.id)}
                        className="text-xs text-slate-400 hover:text-red-500 font-medium"
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
