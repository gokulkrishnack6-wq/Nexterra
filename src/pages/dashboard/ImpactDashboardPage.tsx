import React, { useState } from 'react';
import { 
  Award, 
  Leaf, 
  Flame, 
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Users,
  Info
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImpactCharts } from '../../components/charts/ImpactCharts';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MetricCard } from '../../components/ui/MetricCard';

export const ImpactDashboardPage: React.FC = () => {
  const { metrics, ecoPointsLedger, categories } = useData();
  const { currentUser, allDemoUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'leaderboard' | 'factors'>('overview');

  const userPointsHistory = ecoPointsLedger.filter((pt) => pt.user_id === currentUser.id);

  const sortedLeaderboard = [...allDemoUsers].sort(
    (a, b) => b.eco_points_balance - a.eco_points_balance
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Empirical Telemetry</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Kerala State Ecological Ledger
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Environmental Impact & EcoPoints
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Transparent empirical telemetry on landfill diversion, avoided methane, and greenhouse gas mitigation in Kerala.
          </p>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-sm flex items-center gap-3 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-heading font-bold text-sm">
            {currentUser.eco_points_balance}
          </div>
          <div>
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider block font-semibold">Your EcoPoints</span>
            <span className="font-heading font-semibold text-xs text-primary">{currentUser.full_name} ({currentUser.role})</span>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Waste Diverted"
          value={metrics.total_waste_diverted_kg.toLocaleString()}
          unit="kg"
          subtext="Redirected into organic & secondary loops"
          icon={<Leaf className="w-5 h-5" />}
        />

        <MetricCard
          label="Avoided CO₂e Emissions"
          value={metrics.total_co2e_avoided_kg.toLocaleString()}
          unit="kg"
          subtext="Mitigated via local decentralized diversion"
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <MetricCard
          label="Landfill Space Saved"
          value={metrics.total_landfill_area_saved_sqm.toLocaleString()}
          unit="m²"
          subtext="Estimated municipal landfill area conserved"
          icon={<ShieldCheck className="w-5 h-5" />}
        />

        <MetricCard
          label="Completed Exchanges"
          value={metrics.total_completed_exchanges}
          unit="cycles"
          subtext="Completed with QR handover code verification"
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
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Community Leaderboard
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
            <span className="font-label-sm text-xs font-semibold text-primary bg-tertiary-fixed px-3 py-1 rounded-full">
              Balance: {currentUser.eco_points_balance} PTS
            </span>
          </div>

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
        </Card>
      )}

      {/* Tab 3: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <h3 className="font-heading font-semibold text-title-md text-primary">
            Kerala Circular Contributors Leaderboard
          </h3>

          <div className="divide-y divide-outline-variant/40">
            {sortedLeaderboard.map((user, idx) => (
              <div key={user.id} className="py-3 flex items-center justify-between text-body-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface'
                  }`}>
                    {idx + 1}
                  </span>
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant"
                  />
                  <div>
                    <span className="font-heading font-semibold text-on-surface block">
                      {user.full_name} {user.id === currentUser.id && '(You)'}
                    </span>
                    <span className="text-xs text-outline capitalize">
                      {user.role} • {user.district}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading font-bold text-base text-primary block">
                    {user.eco_points_balance} PTS
                  </span>
                  <span className="text-[10px] text-surface-tint font-semibold uppercase">Verified Contributor</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Carbon Factors */}
      {activeTab === 'factors' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <h3 className="font-heading font-semibold text-title-md text-primary">
            State-Specific Carbon & Landfill Avoidance Factors
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Coefficients aligned with Suchitwa Mission benchmarks and Kerala State Pollution Control Board life-cycle assessment models.
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
                    <td className="p-3 text-xs capitalize text-surface-tint font-medium">
                      {c.is_organic ? 'Decentralized Composting' : 'Material Recovery & Remanufacture'}
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
