import React, { useState } from 'react';
import { 
  BarChart3, 
  Leaf, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  Scale, 
  Droplets, 
  Flame, 
  ExternalLink,
  ShieldCheck,
  History,
  Users
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImpactCharts } from '../../components/charts/ImpactCharts';

export const ImpactDashboardPage: React.FC = () => {
  const { metrics, ecoPointsLedger, transactions, categories } = useData();
  const { currentUser, allDemoUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'leaderboard' | 'factors'>('overview');

  // Filter user's specific EcoPoint records
  const userPointsHistory = ecoPointsLedger.filter((pt) => pt.user_id === currentUser.id);

  // Leaderboard ranking
  const sortedLeaderboard = [...allDemoUsers].sort(
    (a, b) => b.eco_points_balance - a.eco_points_balance
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-lime/30 text-forest-dark border border-lime/40 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5 text-forest" /> Verified Carbon & Resource Recovery
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-forest-dark">
            Environmental Impact & EcoPoints
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Empirical telemetry on landfill diversion, greenhouse gas mitigation, and circular economy rewards.
          </p>
        </div>

        {/* User Balance Card */}
        <div className="bg-forest p-4 rounded-2xl text-white shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-lime text-forest-dark flex items-center justify-center font-heading font-black text-xl">
            {currentUser.eco_points_balance}
          </div>
          <div>
            <span className="text-[10px] text-sage-light uppercase tracking-wider font-bold block">
              Your EcoPoints Balance
            </span>
            <span className="font-bold text-xs text-white">
              {currentUser.full_name.split(' ')[0]} ({currentUser.role})
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Total Waste Diverted</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-black text-3xl text-forest-dark">
              {metrics.total_waste_diverted_kg}
            </span>
            <span className="text-sm font-bold text-forest">kg</span>
          </div>
          <p className="text-[11px] text-slate-500">Redirected into organic & secondary loops</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Avoided CO₂e Emissions</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-black text-3xl text-forest">
              {metrics.total_co2e_avoided_kg}
            </span>
            <span className="text-sm font-bold text-lime-600">kg CO₂e</span>
          </div>
          <p className="text-[11px] text-slate-500">Prevented via local diversion</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Landfill Volume Saved</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-black text-3xl text-forest-dark">
              {metrics.total_landfill_area_saved_sqm}
            </span>
            <span className="text-sm font-bold text-forest">m²</span>
          </div>
          <p className="text-[11px] text-slate-500">Municipal landfill area conserved</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Verified Exchanges</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-black text-3xl text-forest-dark">
              {metrics.total_completed_exchanges}
            </span>
            <span className="text-sm font-bold text-forest">Cycles</span>
          </div>
          <p className="text-[11px] text-slate-500">Completed with handover verification</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-sage/40 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest hover:bg-white'
          }`}
        >
          Impact Visualizations & Telemetry
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'points'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest hover:bg-white'
          }`}
        >
          My EcoPoints Ledger ({userPointsHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest hover:bg-white'
          }`}
        >
          Community Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('factors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'factors'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest hover:bg-white'
          }`}
        >
          Conversion Factors & IPCC Citations
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <ImpactCharts metrics={metrics} />

          {/* Badges & Achievements */}
          <div className="bg-white p-6 rounded-3xl border border-sage/40 shadow-soft space-y-4">
            <h3 className="font-heading font-bold text-base text-forest-dark">
              Your Environmental Achievements & Badges
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-sage-light/40 border border-sage/60 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-forest text-lime flex items-center justify-center mx-auto">
                  <Leaf className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-xs text-forest-dark">Circular Pioneer</h4>
                <p className="text-[10px] text-slate-500">Joined GreenLoop & logged first verified exchange.</p>
                <span className="inline-block bg-forest text-lime text-[9px] font-bold px-2 py-0.5 rounded-full">UNLOCKED</span>
              </div>

              <div className="p-4 bg-sage-light/40 border border-sage/60 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-forest text-lime flex items-center justify-center mx-auto">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-xs text-forest-dark">Carbon Warrior</h4>
                <p className="text-[10px] text-slate-500">Avoided over 50kg of greenhouse gas emissions.</p>
                <span className="inline-block bg-forest text-lime text-[9px] font-bold px-2 py-0.5 rounded-full">UNLOCKED</span>
              </div>

              <div className="p-4 bg-offwhite border border-slate-200 rounded-2xl text-center space-y-2 opacity-60">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-xs text-slate-600">Zero-Waste Champion</h4>
                <p className="text-[10px] text-slate-400">Complete 10 circular transactions across Kerala.</p>
                <span className="inline-block bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">LOCKED (3/10)</span>
              </div>

              <div className="p-4 bg-offwhite border border-slate-200 rounded-2xl text-center space-y-2 opacity-60">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-xs text-slate-600">E-Waste Safeguard</h4>
                <p className="text-[10px] text-slate-400">Divert 25kg of toxic electronics to Clean Kerala Co.</p>
                <span className="inline-block bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">LOCKED (15/25)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'points' && (
        <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-bold text-base text-forest-dark">
                EcoPoints Ledger History
              </h3>
              <p className="text-xs text-slate-500">Cryptographically auditable points log with anti-tamper ledger.</p>
            </div>
            <span className="bg-forest text-lime font-bold text-xs px-3 py-1 rounded-full">
              {currentUser.eco_points_balance} Total Points
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {userPointsHistory.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-bold text-forest-dark">{item.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Action: {item.action_type}
                  </p>
                </div>
                <span className="font-heading font-black text-forest text-sm bg-sage-light/60 px-2.5 py-1 rounded-lg shrink-0">
                  +{item.points} PTS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4">
          <div>
            <h3 className="font-heading font-bold text-base text-forest-dark">
              Kerala Community Circular Leaderboard
            </h3>
            <p className="text-xs text-slate-500">Recognizing top waste diverting households, restaurants, farmers, and recyclers.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {sortedLeaderboard.map((user, idx) => (
              <div
                key={user.id}
                className={`py-3.5 px-3 rounded-xl flex items-center justify-between gap-4 transition-colors ${
                  user.id === currentUser.id ? 'bg-sage-light/40 border border-sage/60 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-heading font-black text-sm ${
                    idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-400'
                  }`}>
                    #{idx + 1}
                  </span>
                  <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <h4 className="font-heading font-bold text-xs text-forest-dark">
                      {user.full_name} {user.id === currentUser.id && '(You)'}
                    </h4>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {user.role} • {user.district}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading font-black text-forest text-sm block">
                    {user.eco_points_balance} PTS
                  </span>
                  <span className="text-[10px] text-slate-400">Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'factors' && (
        <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4">
          <div>
            <h3 className="font-heading font-bold text-base text-forest-dark">
              Documented Environmental Conversion Factors
            </h3>
            <p className="text-xs text-slate-500">
              Per TERRACODE 2026 guidelines, carbon reduction figures are anchored in empirical studies from the Kerala State Pollution Control Board and the Intergovernmental Panel on Climate Change (IPCC).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-offwhite text-forest-dark font-heading uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Waste Category</th>
                  <th className="py-2.5 px-3">CO₂e Saved / kg</th>
                  <th className="py-2.5 px-3">Landfill Avoided / kg</th>
                  <th className="py-2.5 px-3">Authoritative Citation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-forest-dark">Organic & Kitchen Food Peels</td>
                  <td className="py-2.5 px-3">1.80 kg</td>
                  <td className="py-2.5 px-3">1.20 kg</td>
                  <td className="py-2.5 px-3 text-[11px]">Kerala State Pollution Control Board (KSPCB) / IPCC Waste Model 2019</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-forest-dark">Coconut Husks & Agricultural Biomass</td>
                  <td className="py-2.5 px-3">1.50 kg</td>
                  <td className="py-2.5 px-3">1.10 kg</td>
                  <td className="py-2.5 px-3 text-[11px]">Kerala Agricultural University (KAU) Biochar & Mulch Reports</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-forest-dark">Paper & Corrugated Cardboard</td>
                  <td className="py-2.5 px-3">2.10 kg</td>
                  <td className="py-2.5 px-3">1.30 kg</td>
                  <td className="py-2.5 px-3 text-[11px]">Central Pollution Control Board (CPCB) Secondary Fibre Protocol</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-forest-dark">Clean Sorted Plastics (HDPE/PET)</td>
                  <td className="py-2.5 px-3">2.50 kg</td>
                  <td className="py-2.5 px-3">1.05 kg</td>
                  <td className="py-2.5 px-3 text-[11px]">Suchitwa Mission Kerala Secondary Material Recovery Data</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-forest-dark">E-Waste & Electronics</td>
                  <td className="py-2.5 px-3">5.80 kg</td>
                  <td className="py-2.5 px-3">0.95 kg</td>
                  <td className="py-2.5 px-3 text-[11px]">Clean Kerala Company E-Waste Resource Recovery Baseline 2024</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
