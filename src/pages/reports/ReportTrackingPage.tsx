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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-5">
        <div>
          <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
            Reported Issues
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#5C6E66] mt-1">
            Track community-reported waste alerts and cleanup progress.
          </p>
        </div>

        <Link to="/report-issue">
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
            Report an Issue
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex p-0.5 bg-white border border-[#E8E4DA] rounded-md overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filter === 'all'
              ? 'bg-[#103D2A] text-white font-medium shadow-subtle'
              : 'text-[#5C6E66] hover:text-[#1C2826]'
          }`}
        >
          All Reports ({reports.length})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filter === 'in_progress'
              ? 'bg-[#103D2A] text-white font-medium shadow-subtle'
              : 'text-[#5C6E66] hover:text-[#1C2826]'
          }`}
        >
          In Progress ({reports.filter(r => r.status !== 'resolved').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filter === 'resolved'
              ? 'bg-[#103D2A] text-white font-medium shadow-subtle'
              : 'text-[#5C6E66] hover:text-[#1C2826]'
          }`}
        >
          Cleared &amp; Verified ({reports.filter(r => r.status === 'resolved').length})
        </button>
      </div>

      {/* Tickets Feed */}
      {filteredReports.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6 text-[#7B8B83]" />}
          title="No Incident Tickets Logged"
          description="There are currently no environmental reports matching this status. Help keep Kerala's communities clean by reporting overflowing public bins or unauthorized dumps."
          actionLabel="Report an Environmental Issue"
          actionLink="/report-issue"
        />
      ) : (
        <div className="space-y-3.5">
          {filteredReports.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all"
            >
              <div className="flex items-start gap-3.5 flex-1">
                {ticket.photo_url && (
                  <img
                    src={ticket.photo_url}
                    alt={ticket.title}
                    className="w-20 h-20 rounded-md object-cover border border-[#E8E4DA] shrink-0 bg-[#F4F1EA]"
                  />
                )}

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {ticket.status === 'resolved' ? (
                      <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Cleared
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> In Progress
                      </span>
                    )}

                    <span className="font-mono text-xs font-medium text-[#103D2A]">
                      #{ticket.ticket_number}
                    </span>
                    <span className="text-[#DCD6CB] text-xs">•</span>
                    <span className="text-xs text-[#5C6E66]">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-sans font-medium text-sm text-[#1C2826]">
                    {ticket.title}
                  </h3>

                  <p className="text-xs text-[#5C6E66] leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="p-2.5 rounded-md bg-[#F8F6EF] text-xs text-[#1C2826] space-y-1 border border-[#E8E4DA] mt-2">
                    <div className="flex flex-wrap items-center gap-x-4">
                      <span className="flex items-center gap-1 text-xs text-[#1C2826]">
                        <MapPin className="w-3.5 h-3.5 text-[#103D2A]" /> {ticket.locality}, {ticket.ward} ({ticket.landmark})
                      </span>
                    </div>
                    {ticket.resolution_notes && (
                      <p className="text-xs text-[#5C6E66] italic pt-0.5">
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
                  >
                    Mark as Cleared
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => updateReportStatus(ticket.id, 'in_progress', 'Re-opened for additional site review.')}
                  >
                    Re-open Ticket
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
