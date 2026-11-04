import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Car, 
  ShieldCheck, 
  ArrowLeft,
  Plus,
  Filter
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const ReportTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { reports, updateReportStatus } = useData();
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
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Ward Civic Watch</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Kochi Municipal Corporation (KMC) Real-time
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Environmental Issue & Ticket Tracker
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Real-time public audit of municipal cleanup dispatches, illegal dumping remediation, and Haritha Karma Sena field verification.
          </p>
        </div>

        <Link to="/report-issue">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Submit Geo-Tagged Report
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 font-label-md text-xs rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          All Incident Tickets ({reports.length})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-3 py-1.5 font-label-md text-xs rounded-lg transition-all ${
            filter === 'in_progress'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Action in Progress ({reports.filter(r => r.status !== 'resolved').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-3 py-1.5 font-label-md text-xs rounded-lg transition-all ${
            filter === 'resolved'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Cleared & Verified ({reports.filter(r => r.status === 'resolved').length})
        </button>
      </div>

      {/* Tickets Feed */}
      <div className="space-y-4">
        {filteredReports.map((ticket) => (
          <Card
            key={ticket.id}
            variant="elevated"
            className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-5"
          >
            <div className="flex items-start gap-4 flex-1">
              {ticket.photo_url && (
                <img
                  src={ticket.photo_url}
                  alt={ticket.title}
                  className="w-24 h-24 rounded-lg object-cover border border-outline-variant/60 shrink-0 bg-surface-container"
                />
              )}

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {ticket.status === 'resolved' ? (
                    <span className="font-label-sm text-xs font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Cleared • Verified
                    </span>
                  ) : (
                    <span className="font-label-sm text-xs font-bold text-secondary bg-surface-container px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span> Action in Progress
                    </span>
                  )}

                  <span className="font-mono text-xs font-semibold text-primary">
                    Ticket: #{ticket.ticket_number}
                  </span>
                  <span className="text-outline text-xs">•</span>
                  <span className="text-xs text-outline">
                    Reported {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-heading font-semibold text-title-md text-on-surface">
                  {ticket.title}
                </h3>

                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {ticket.description}
                </p>

                <div className="p-2.5 rounded-lg bg-surface-container-low text-body-sm text-on-surface space-y-1 border border-outline-variant/40 mt-2">
                  <div className="flex flex-wrap items-center gap-x-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {ticket.locality}, {ticket.ward} ({ticket.landmark})
                    </span>
                  </div>
                  {ticket.assigned_team && (
                    <div className="text-xs text-primary font-medium flex items-center gap-1.5 pt-0.5">
                      <Car className="w-3.5 h-3.5 text-surface-tint" />
                      <span>{ticket.assigned_team} — {ticket.assigned_vehicle}</span>
                    </div>
                  )}
                  {ticket.resolution_notes && (
                    <p className="text-xs text-on-surface-variant italic pt-0.5">
                      Notes: {ticket.resolution_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin or Demo Toggle status */}
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
              {ticket.status !== 'resolved' ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => updateReportStatus(ticket.id, 'resolved', 'Cleared by Haritha Karma Sena crew and transferred to bio-depot.')}
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Mark as Cleared
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => updateReportStatus(ticket.id, 'in_progress', 'Re-opened for additional site inspection.')}
                >
                  Re-open Ticket
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
