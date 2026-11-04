import React, { useState } from 'react';
import { 
  Award, 
  Leaf, 
  TrendingUp, 
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImpactCharts } from '../../components/charts/ImpactCharts';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { EmptyState } from '../../components/ui/Skeleton';

export const ImpactDashboardPage: React.FC = () => {
  const { metrics, ecoPointsLedger, categories } = useData();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'factors'>('overview');

  const currentUserId = currentUser?.id || '';
  const userPointsHistory = ecoPointsLedger.filter((pt) => pt.user_id === currentUserId);
  const userBalance = currentUser ? currentUser.eco_points_balance : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Empirical Telemetry</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Kerala Circular Ledger
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Environmental Impact & EcoPoints
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Transparent empirical tracking of landfill diversion, greenhouse gas mitigation, and community circular contributions.
          </p>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-sm flex items-center gap-3 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-heading font-bold text-sm">
            {userBalance}
          </div>
          <div>
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider block font-semibold">Your EcoPoints</span>
            <span className="font-heading font-semibold text-xs text-primary">
              {currentUser ? `${currentUser.full_name} (${currentUser.role})` : 'Guest Visitor'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards - Empirical from real transactions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Waste Diverted"
          value={metrics.total_waste_diverted_kg}
          unit="kg"
          subtext="Verified material exchanges"
          icon={<Leaf className="w-5 h-5" />}
        />

        <MetricCard
          label="Avoided CO₂e Emissions"
          value={metrics.total_co2e_avoided_kg}
          unit="kg"
          subtext="Mitigated via circular recovery"
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <MetricCard
          label="Landfill Space Saved"
          value={metrics.total_landfill_area_saved_sqm}
          unit="m²"
          subtext="Estimated landfill area conserved"
          icon={<ShieldCheck className="w-5 h-5" />}
        />

        <MetricCard
          label="Completed Exchanges"
          value={metrics.total_completed_exchanges}
          unit="cycles"
          subtext="Verified handover exchanges"
          icon={<Award className="w-5 h-5" />}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'overview'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Visualizations & Charts
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'points'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          My EcoPoints Ledger ({userPointsHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('factors')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'factors'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Carbon Calculation Factors
        </button>
      </div>

      {/* Tab 1: Charts */}
      {activeTab === 'overview' && (
        <Card variant="elevated" className="p-6">
          <ImpactCharts metrics={metrics} />
        </Card>
      )}

      {/* Tab 2: EcoPoints Ledger */}
      {activeTab === 'points' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-title-md text-primary">
              Personal EcoPoints Transaction History
            </h3>
            <span className="font-label-sm text-xs font-semibold text-primary bg-secondary-container px-3 py-1 rounded-full">
              Balance: {userBalance} PTS
            </span>
          </div>

          {userPointsHistory.length === 0 ? (
            <EmptyState
              icon={<Award className="w-6 h-6" />}
              title="No EcoPoints Recorded Yet"
              description="Publish waste materials or complete circular handovers to earn verified EcoPoints."
              actionLabel="List Unwanted Material"
              actionLink="/marketplace/new"
            />
          ) : (
            <div className="divide-y divide-outline-variant/40">
              {userPointsHistory.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-body-sm">
                  <div>
                    <span className="font-heading font-semibold text-on-surface block">
                      {item.description}
                    </span>
                    <span className="font-body-sm text-xs text-outline">
                      {new Date(item.created_at).toLocaleDateString()} • Action: {item.action_type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="font-heading font-bold text-base text-primary">
                    +{item.points} PTS
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Carbon Factors */}
      {activeTab === 'factors' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <h3 className="font-heading font-semibold text-title-md text-primary">
            Empirical Material Diversion Factors
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Standard lifecycle coefficients used by GreenLoop to compute carbon avoidance and landfill prevention.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-low font-label-sm text-xs text-outline uppercase border-b border-outline-variant">
                <tr>
                  <th className="p-3">Material Category</th>
                  <th className="p-3">Standard Unit</th>
                  <th className="p-3">CO₂e Avoided per Unit</th>
                  <th className="p-3">Landfill Area Saved per Unit</th>
                  <th className="p-3">Circular Pathway</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low/50">
                    <td className="p-3 font-semibold text-on-surface">{c.name}</td>
                    <td className="p-3 text-outline">{c.standard_unit}</td>
                    <td className="p-3 text-primary font-bold">{c.default_co2_factor.toFixed(2)} kg CO₂e</td>
                    <td className="p-3 text-on-surface-variant">{c.default_landfill_factor.toFixed(2)} m²</td>
                    <td className="p-3 text-xs capitalize text-secondary font-medium">
                      {c.is_organic ? 'Decentralized Composting' : 'Material Recovery & Upcycling'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
