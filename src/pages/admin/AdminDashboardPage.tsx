import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MetricCard } from '../../components/ui/MetricCard';
import { EmptyState } from '../../components/ui/Skeleton';

export const AdminDashboardPage: React.FC = () => {
  const { listings, recyclingCentres, transactions, deleteListing, reports, updateReportStatus } = useData();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'reports' | 'users' | 'centres'>('listings');

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Lock className="w-8 h-8 text-outline mx-auto" />
        <h2 className="font-heading font-bold text-xl text-primary">
          Administrator Console
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          {currentUser
            ? `You are signed in as ${currentUser.full_name} (${currentUser.role}). This console is restricted to administrators.`
            : 'Please sign in with an administrator account to view moderation controls.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Admin Governance</Badge>
            <span className="text-gl-charcoal-muted text-xs">•</span>
            <span className="text-xs text-gl-forest font-semibold">
              Community Moderation &amp; Verification
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-gl-charcoal tracking-tight">
            Platform Administration Console
          </h1>
          <p className="text-sm text-gl-charcoal-muted mt-0.5">
            Content moderation, reported incident resolution, facility approvals, and platform metrics.
          </p>
        </div>

        <span className="text-xs font-bold text-gl-dark bg-gl-sage-light px-3.5 py-1.5 rounded-full border border-gl-sage self-start sm:self-auto">
          Admin: {currentUser.full_name}
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Active Listings"
          value={listings.length}
          subtext="Available circular batches"
          icon={<ShieldCheck className="w-5 h-5 text-gl-forest" />}
        />
        <MetricCard
          label="Reported Issues"
          value={reports.length}
          subtext="Incident reports"
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          iconColor="text-rose-600"
        />
        <MetricCard
          label="Recycling Facilities"
          value={recyclingCentres.length}
          subtext="Registered collection hubs"
          icon={<Building2 className="w-5 h-5 text-gl-forest" />}
        />
        <MetricCard
          label="Completed Exchanges"
          value={transactions.length}
          subtext="Verified handovers"
          icon={<Users className="w-5 h-5 text-gl-forest" />}
        />
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-gl-cream/80 border border-gl-border rounded-xl overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 text-xs rounded-lg transition-all ${
            activeTab === 'listings'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          Listing Moderation ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-xs rounded-lg transition-all ${
            activeTab === 'reports'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          Incident Tickets ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('centres')}
          className={`px-4 py-2 text-xs rounded-lg transition-all ${
            activeTab === 'centres'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          Facility Approvals ({recyclingCentres.length})
        </button>
      </div>

      {/* Tab 1: Listings Moderation Table */}
      {activeTab === 'listings' && (
        listings.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="No Listings in Marketplace"
            description="There are currently no listings posted for moderation."
          />
        ) : (
          <Card variant="elevated" className="overflow-x-auto p-0 bg-white border border-gl-border rounded-2xl shadow-card">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gl-cream/60 text-xs text-gl-charcoal uppercase font-bold border-b border-gl-border">
                <tr>
                  <th className="p-3.5">Material Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Quantity</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gl-border">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-gl-cream/30">
                    <td className="p-3.5 font-bold text-gl-charcoal">{l.title}</td>
                    <td className="p-3.5 text-gl-charcoal-muted">{l.category?.name || 'Recyclable'}</td>
                    <td className="p-3.5 font-bold text-gl-forest">{l.quantity} {l.unit}</td>
                    <td className="p-3.5 text-gl-charcoal-muted">{l.locality}, {l.district}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold text-gl-dark uppercase bg-gl-sage-light border border-gl-sage px-2 py-0.5 rounded-full">
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Remove listing "${l.title}"?`)) {
                            deleteListing(l.id);
                          }
                        }}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        className="rounded-xl"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {/* Tab 2: Civic Reports Table */}
      {activeTab === 'reports' && (
        reports.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="w-6 h-6" />}
            title="No Incident Tickets"
            description="There are currently no civic reports logged for review."
          />
        ) : (
          <Card variant="elevated" className="overflow-x-auto p-0 bg-white border border-gl-border rounded-2xl shadow-card">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gl-cream/60 text-xs text-gl-charcoal uppercase font-bold border-b border-gl-border">
                <tr>
                  <th className="p-3.5">Ticket</th>
                  <th className="p-3.5">Issue Title</th>
                  <th className="p-3.5">Locality &amp; Ward</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gl-border">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gl-cream/30">
                    <td className="p-3.5 font-mono font-bold text-gl-forest">#{r.ticket_number}</td>
                    <td className="p-3.5 font-bold text-gl-charcoal">{r.title}</td>
                    <td className="p-3.5 text-gl-charcoal-muted">{r.locality}, {r.ward}</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        r.status === 'resolved' ? 'bg-gl-sage-light text-gl-dark border border-gl-sage' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {r.status !== 'resolved' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => updateReportStatus(r.id, 'resolved', 'Cleared and verified.')}
                          className="rounded-xl shadow-sm"
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-xs text-gl-forest font-bold">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {/* Tab 3: Facilities */}
      {activeTab === 'centres' && (
        recyclingCentres.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-6 h-6 text-gl-charcoal-muted" />}
            title="No Facilities Registered"
            description="No registered recycling centres or MCF hubs in the database yet."
          />
        ) : (
          <Card variant="elevated" className="overflow-x-auto p-0 bg-white border border-gl-border rounded-2xl shadow-card">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gl-cream/60 text-xs text-gl-charcoal uppercase font-bold border-b border-gl-border">
                <tr>
                  <th className="p-3.5">Facility Name</th>
                  <th className="p-3.5">Operator Type</th>
                  <th className="p-3.5">District</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gl-border">
                {recyclingCentres.map((c) => (
                  <tr key={c.id} className="hover:bg-gl-cream/30">
                    <td className="p-3.5 font-bold text-gl-charcoal">{c.name}</td>
                    <td className="p-3.5 capitalize text-gl-charcoal-muted">{c.operator_type.replace(/_/g, ' ')}</td>
                    <td className="p-3.5 text-gl-charcoal-muted">{c.district}</td>
                    <td className="p-3.5 text-xs text-gl-charcoal font-medium">{c.phone}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] text-gl-dark font-bold uppercase bg-gl-sage-light border border-gl-sage px-2 py-0.5 rounded-full">
                        Verified Hub
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}
    </div>
  );
};
