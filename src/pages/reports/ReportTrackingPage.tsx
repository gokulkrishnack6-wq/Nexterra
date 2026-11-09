import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Plus,
  Filter
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Skeleton';

export const ReportTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { reports, updateReportStatus, isLoading } = useData();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'resolved'>('all');

  const filteredReports = reports.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return r.status === 'in_progress' || r.status === 'pending';
    if (filter === 'resolved') return r.status === 'resolved';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-gl-charcoal tracking-tight">
            Reported Issues
          </h1>
          <p className="text-sm text-gl-charcoal-muted mt-1">
            Track community-reported waste alerts and cleanup progress.
          </p>
        </div>

        <Link to="/report-issue">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} className="rounded-xl shadow-sm">
            Report an Issue
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex p-1 bg-gl-cream/80 border border-gl-border rounded-xl overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-xs rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          All Reports ({reports.length})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 text-xs rounded-lg transition-all ${
            filter === 'in_progress'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          In Progress ({reports.filter(r => r.status !== 'resolved').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 text-xs rounded-lg transition-all ${
            filter === 'resolved'
              ? 'bg-gl-forest text-white font-semibold shadow-sm'
              : 'text-gl-charcoal-muted hover:text-gl-charcoal'
          }`}
        >
          Cleared &amp; Verified ({reports.filter(r => r.status === 'resolved').length})
        </button>
      </div>

      {/* Tickets Feed */}
      {filteredReports.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6 text-gl-charcoal-muted" />}
          title="No Incident Tickets Logged"
          description="There are currently no environmental reports matching this status. Help keep Kerala's communities clean by reporting overflowing public bins or unauthorized dumps."
          actionLabel="Report an Environmental Issue"
          actionLink="/report-issue"
        />
      ) : (
        <div className="space-y-4">
          {filteredReports.map((ticket) => (
            <Card
              key={ticket.id}
              variant="elevated"
              className="p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-5 bg-white border border-gl-border rounded-2xl shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start gap-4 flex-1">
                {ticket.photo_url && (
                  <img
                    src={ticket.photo_url}
                    alt={ticket.title}
                    className="w-24 h-24 rounded-xl object-cover border border-gl-border shrink-0 bg-gl-cream"
                  />
                )}

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {ticket.status === 'resolved' ? (
                      <span className="text-xs font-bold text-gl-dark bg-gl-sage-light border border-gl-sage px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gl-fresh" /> Cleared • Verified
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Action in Progress
                      </span>
                    )}

                    <span className="font-mono text-xs font-bold text-gl-forest">
                      Ticket: #{ticket.ticket_number}
                    </span>
                    <span className="text-gl-charcoal-muted text-xs">•</span>
                    <span className="text-xs text-gl-charcoal-muted font-medium">
                      Reported {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base text-gl-charcoal">
                    {ticket.title}
                  </h3>

                  <p className="text-xs text-gl-charcoal-muted leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="p-3 rounded-xl bg-gl-cream/50 text-xs text-gl-charcoal space-y-1 border border-gl-border mt-2">
                    <div className="flex flex-wrap items-center gap-x-4">
                      <span className="flex items-center gap-1 text-xs text-gl-charcoal font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gl-forest" /> {ticket.locality}, {ticket.ward} ({ticket.landmark})
                      </span>
                    </div>
                    {ticket.resolution_notes && (
                      <p className="text-xs text-gl-charcoal-muted italic pt-0.5">
                        Notes: {ticket.resolution_notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Update Action for reporter/community */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                {ticket.status !== 'resolved' ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => updateReportStatus(ticket.id, 'resolved', 'Cleared and remediated by local cleanup initiative.')}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    className="rounded-xl shadow-sm"
                  >
                    Mark as Cleared
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => updateReportStatus(ticket.id, 'in_progress', 'Re-opened for additional site review.')}
                    className="rounded-xl"
                  >
                    Re-open Ticket
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
