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

export const AdminDashboardPage: React.FC = () => {
  const { listings, recyclingCentres, transactions, deleteListing, reports, updateReportStatus } = useData();
  const { currentUser, allDemoUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'reports' | 'users' | 'centres'>('listings');

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Lock className="w-8 h-8 text-outline mx-auto" />
        <h2 className="font-heading font-bold text-xl text-primary">
          Administrator Console
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          You are currently signed in as <strong>{currentUser.full_name}</strong> ({currentUser.role}). 
          Switch to the <strong>Administrator</strong> persona using the top switcher to review administrative moderation controls.
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
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Kerala Municipal Moderation & Verification
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Platform Administration Console
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Content moderation, reported incident resolution, facility approvals, and security audit logs.
          </p>
        </div>

        <span className="font-label-sm text-xs font-semibold text-primary bg-tertiary-fixed px-3 py-1.5 rounded-full border border-primary/20 self-start sm:self-auto">
          Role: Platform Administrator
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Registered Users"
          value={allDemoUsers.length}
          subtext="Verified community personas"
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          label="Total Listings"
          value={listings.length}
          subtext="Active circular batches"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <MetricCard
          label="Reported Issues"
          value={reports.length}
          subtext="Municipal incident tickets"
          icon={<AlertTriangle className="w-5 h-5 text-error" />}
          iconColor="text-error"
        />
        <MetricCard
          label="Verified Facilities"
          value={recyclingCentres.length}
          subtext="Haritha Karma Sena & MCFs"
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'listings'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Listing Moderation ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'reports'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Civic Incident Tickets ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'users'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          User Accounts ({allDemoUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('centres')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'centres'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Facility Approvals ({recyclingCentres.length})
        </button>
      </div>

      {/* Tab 1: Listings Moderation Table */}
      {activeTab === 'listings' && (
        <Card variant="elevated" className="overflow-x-auto p-0">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low font-label-sm text-xs text-outline uppercase border-b border-outline-variant">
              <tr>
                <th className="p-3">Material Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Location</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-surface-container-low/50">
                  <td className="p-3 font-semibold text-on-surface">{l.title}</td>
                  <td className="p-3 text-on-surface-variant">{l.category?.name || 'Recyclable'}</td>
                  <td className="p-3 font-medium text-primary">{l.quantity} {l.unit}</td>
                  <td className="p-3 text-outline">{l.locality}, {l.district}</td>
                  <td className="p-3">
                    <span className="font-label-sm text-[10px] font-bold text-primary uppercase bg-surface-container px-2 py-0.5 rounded-full">
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Remove listing "${l.title}"?`)) {
                          deleteListing(l.id);
                        }
                      }}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tab 2: Civic Reports Table */}
      {activeTab === 'reports' && (
        <Card variant="elevated" className="overflow-x-auto p-0">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low font-label-sm text-xs text-outline uppercase border-b border-outline-variant">
              <tr>
                <th className="p-3">Ticket</th>
                <th className="p-3">Issue Title</th>
                <th className="p-3">Locality & Ward</th>
                <th className="p-3">Assigned Crew</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container-low/50">
                  <td className="p-3 font-mono font-bold text-primary">#{r.ticket_number}</td>
                  <td className="p-3 font-semibold text-on-surface">{r.title}</td>
                  <td className="p-3 text-outline">{r.locality}, {r.ward}</td>
                  <td className="p-3 text-on-surface-variant text-xs">{r.assigned_team || 'Sanitation Squad'}</td>
                  <td className="p-3">
                    <span className={`font-label-sm text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      r.status === 'resolved' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-secondary'
                    }`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {r.status !== 'resolved' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateReportStatus(r.id, 'resolved', 'Cleared and verified by municipal supervisor.')}
                      >
                        Resolve
                      </Button>
                    ) : (
                      <span className="text-xs text-surface-tint font-semibold">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tab 3: Users */}
      {activeTab === 'users' && (
        <Card variant="elevated" className="overflow-x-auto p-0">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low font-label-sm text-xs text-outline uppercase border-b border-outline-variant">
              <tr>
                <th className="p-3">Full Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">District</th>
                <th className="p-3">EcoPoints Balance</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {allDemoUsers.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low/50">
                  <td className="p-3 font-semibold text-on-surface flex items-center gap-2">
                    <img src={u.avatar_url || ''} alt="" className="w-6 h-6 rounded-full object-cover" />
                    <span>{u.full_name}</span>
                  </td>
                  <td className="p-3 capitalize text-on-surface-variant">{u.role}</td>
                  <td className="p-3 text-outline">{u.district}</td>
                  <td className="p-3 font-bold text-primary">{u.eco_points_balance} PTS</td>
                  <td className="p-3">
                    <span className="font-label-sm text-[10px] text-surface-tint font-bold uppercase bg-surface-container px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tab 4: Facilities */}
      {activeTab === 'centres' && (
        <Card variant="elevated" className="overflow-x-auto p-0">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low font-label-sm text-xs text-outline uppercase border-b border-outline-variant">
              <tr>
                <th className="p-3">Facility Name</th>
                <th className="p-3">Operator Type</th>
                <th className="p-3">District</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {recyclingCentres.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low/50">
                  <td className="p-3 font-semibold text-on-surface">{c.name}</td>
                  <td className="p-3 capitalize text-on-surface-variant">{c.operator_type.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-outline">{c.district}</td>
                  <td className="p-3 text-xs">{c.phone}</td>
                  <td className="p-3">
                    <span className="font-label-sm text-[10px] text-primary font-bold uppercase bg-tertiary-fixed px-2 py-0.5 rounded-full">
                      KSPCB Approved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
