import React, { useState } from 'react';
import { 
  Award, 
  Leaf, 
  Flame, 
  ShieldCheck
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImpactCharts } from '../../components/charts/ImpactCharts';

export const ImpactDashboardPage: React.FC = () => {
  const { metrics, ecoPointsLedger, categories } = useData();
  const { currentUser, allDemoUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'leaderboard' | 'factors'>('overview');

  const userPointsHistory = ecoPointsLedger.filter((pt) => pt.user_id === currentUser.id);

  const sortedLeaderboard = [...allDemoUsers].sort(
    (a, b) => b.eco_points_balance - a.eco_points_balance
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
            Environmental Impact & Metrics
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Transparent empirical telemetry on landfill diversion and greenhouse gas mitigation in Kerala.
          </p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#E2E2D8] flex items-center gap-3 text-xs self-start sm:self-auto">
          <div className="w-8 h-8 rounded bg-forest text-white flex items-center justify-center font-heading font-bold text-sm">
            {currentUser.eco_points_balance}
          </div>
          <div>
            <span className="text-[10px] text-charcoal-muted uppercase tracking-wider block">Your EcoPoints</span>
            <span className="font-semibold text-charcoal">{currentUser.full_name.split(' ')[0]} ({currentUser.role})</span>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-1">
          <span className="text-charcoal-muted font-medium block">Total Waste Diverted</span>
          <div className="font-heading font-bold text-xl sm:text-2xl text-forest">
            {metrics.total_waste_diverted_kg} <span className="text-xs font-normal text-charcoal-muted">kg</span>
          </div>
          <p className="text-[11px] text-charcoal-muted">Redirected into organic & secondary loops</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-1">
          <span className="text-charcoal-muted font-medium block">Avoided CO₂e Emissions</span>
          <div className="font-heading font-bold text-xl sm:text-2xl text-forest">
            {metrics.total_co2e_avoided_kg} <span className="text-xs font-normal text-charcoal-muted">kg</span>
          </div>
          <p className="text-[11px] text-charcoal-muted">Mitigated via local diversion</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-1">
          <span className="text-charcoal-muted font-medium block">Landfill Space Saved</span>
          <div className="font-heading font-bold text-xl sm:text-2xl text-forest">
            {metrics.total_landfill_area_saved_sqm} <span className="text-xs font-normal text-charcoal-muted">m²</span>
          </div>
          <p className="text-[11px] text-charcoal-muted">Estimated municipal area conserved</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-1">
          <span className="text-charcoal-muted font-medium block">Completed Exchanges</span>
          <div className="font-heading font-bold text-xl sm:text-2xl text-forest">
            {metrics.total_completed_exchanges} <span className="text-xs font-normal text-charcoal-muted">cycles</span>
          </div>
          <p className="text-[11px] text-charcoal-muted">Completed with pickup verification</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E2D8] text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Visualizations
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'points'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          My Points Ledger ({userPointsHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'leaderboard'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Community Participants
        </button>
        <button
          onClick={() => setActiveTab('factors')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'factors'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Conversion Factors (KSPCB / IPCC)
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <ImpactCharts metrics={metrics} />

          {/* Badges */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E2D8] space-y-3">
            <h3 className="font-heading font-semibold text-sm text-charcoal">
              Participation Badges
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-cream rounded-md border border-[#E2E2D8] space-y-1">
                <Leaf className="w-4 h-4 text-forest" />
                <h4 className="font-semibold text-charcoal">Circular Pioneer</h4>
                <p className="text-[11px] text-charcoal-muted">Joined and logged first exchange.</p>
                <span className="text-[10px] font-semibold text-forest block pt-1">Active</span>
              </div>

              <div className="p-3 bg-cream rounded-md border border-[#E2E2D8] space-y-1">
                <Flame className="w-4 h-4 text-forest" />
                <h4 className="font-semibold text-charcoal">Carbon Saver</h4>
                <p className="text-[11px] text-charcoal-muted">Avoided over 50kg greenhouse emissions.</p>
                <span className="text-[10px] font-semibold text-forest block pt-1">Active</span>
              </div>

              <div className="p-3 bg-cream rounded-md border border-[#E2E2D8] space-y-1 opacity-60">
                <Award className="w-4 h-4 text-charcoal-muted" />
                <h4 className="font-semibold text-charcoal">10 Handover Club</h4>
                <p className="text-[11px] text-charcoal-muted">Complete 10 material collections.</p>
                <span className="text-[10px] text-charcoal-muted block pt-1">In progress (3/10)</span>
              </div>

              <div className="p-3 bg-cream rounded-md border border-[#E2E2D8] space-y-1 opacity-60">
                <ShieldCheck className="w-4 h-4 text-charcoal-muted" />
                <h4 className="font-semibold text-charcoal">E-Waste Safeguard</h4>
                <p className="text-[11px] text-charcoal-muted">Divert 25kg of electronic components.</p>
                <span className="text-[10px] text-charcoal-muted block pt-1">In progress (15/25)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'points' && (
        <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-charcoal pb-2 border-b border-[#F0F0E6]">
            Auditable EcoPoints Log
          </h3>

          <div className="divide-y divide-[#F0F0E6] text-xs">
            {userPointsHistory.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-charcoal">{item.description}</p>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {item.action_type}
                  </p>
                </div>
                <span className="font-semibold text-forest bg-cream px-2 py-0.5 rounded border border-[#E2E2D8] shrink-0">
                  +{item.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-charcoal pb-2 border-b border-[#F0F0E6]">
            Community Participants
          </h3>

          <div className="divide-y divide-[#F0F0E6] text-xs">
            {sortedLeaderboard.map((user, idx) => (
              <div
                key={user.id}
                className={`py-2.5 px-2 flex items-center justify-between gap-3 ${
                  user.id === currentUser.id ? 'bg-cream rounded font-medium' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold text-charcoal-muted text-[11px]">
                    #{idx + 1}
                  </span>
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <div>
                    <span className="font-semibold text-charcoal">
                      {user.full_name} {user.id === currentUser.id && '(You)'}
                    </span>
                    <span className="text-[11px] text-charcoal-muted ml-2 uppercase">
                      {user.role} • {user.district}
                    </span>
                  </div>
                </div>

                <span className="font-semibold text-forest">
                  {user.eco_points_balance} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'factors' && (
        <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-4 text-xs">
          <div>
            <h3 className="font-heading font-semibold text-sm text-charcoal">
              Conversion Factors & IPCC References
            </h3>
            <p className="text-charcoal-muted mt-0.5 leading-relaxed">
              GreenLoop uses documented coefficients from the Kerala State Pollution Control Board and the IPCC Waste Model.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream text-charcoal font-semibold border-b border-[#E2E2D8]">
                <tr>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">CO₂e Saved / kg</th>
                  <th className="py-2 px-3">Landfill Conserved / kg</th>
                  <th className="py-2 px-3">Scientific Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0E6] text-charcoal">
                <tr>
                  <td className="py-2 px-3 font-medium">Organic & Kitchen Waste</td>
                  <td className="py-2 px-3">1.80 kg</td>
                  <td className="py-2 px-3">1.20 kg</td>
                  <td className="py-2 px-3 text-charcoal-muted text-[11px]">KSPCB / IPCC Waste Model 2019</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Coconut & Agricultural Biomass</td>
                  <td className="py-2 px-3">1.50 kg</td>
                  <td className="py-2 px-3">1.10 kg</td>
                  <td className="py-2 px-3 text-charcoal-muted text-[11px]">Kerala Agricultural University (KAU)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Paper & Cardboard</td>
                  <td className="py-2 px-3">2.10 kg</td>
                  <td className="py-2 px-3">1.30 kg</td>
                  <td className="py-2 px-3 text-charcoal-muted text-[11px]">CPCB Secondary Fibres Study</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Clean Plastics (HDPE / PET)</td>
                  <td className="py-2 px-3">2.50 kg</td>
                  <td className="py-2 px-3">1.05 kg</td>
                  <td className="py-2 px-3 text-charcoal-muted text-[11px]">Suchitwa Mission Kerala Dataset</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">E-Waste & Electronics</td>
                  <td className="py-2 px-3">5.80 kg</td>
                  <td className="py-2 px-3">0.95 kg</td>
                  <td className="py-2 px-3 text-charcoal-muted text-[11px]">Clean Kerala Company Baseline</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
