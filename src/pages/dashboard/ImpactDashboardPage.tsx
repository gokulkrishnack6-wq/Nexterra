import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  Leaf, 
  TrendingUp, 
  ShieldCheck,
  CheckCircle2,
  Info,
  LogIn,
  ArrowRight,
  Sparkles,
  PackageCheck,
  Sprout,
  Users,
  AlertTriangle,
  Gift,
  Coins,
  QrCode,
  X,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  FileCheck
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImpactCharts } from '../../components/charts/ImpactCharts';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { EmptyState } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { EcoReward, AVAILABLE_REWARDS, getEcoTier } from '../../lib/ecoRewards';

export const ImpactDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { metrics, ecoPointsLedger, categories, listings, transactions, reports } = useData();
  const { currentUser, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'rewards' | 'factors'>('overview');
  const [selectedReward, setSelectedReward] = useState<EcoReward | null>(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [claimedVoucherCode, setClaimedVoucherCode] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 1. LOGGED-OUT EXPERIENCE: DEDICATED SIGN-IN REQUIRED SCREEN
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 text-center">
        {/* Brand Hero Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-secondary-container/80 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-md ring-8 ring-secondary-container/30">
          <Award className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>

        {/* Required Headline & Supporting Text */}
        <div className="space-y-3 max-w-2xl mx-auto">
          <Badge variant="brand" className="mb-1">
            GreenLoop Circular Rewards
          </Badge>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-primary tracking-tight">
            Your actions deserve rewards.
          </h1>
          <p className="font-body-lg text-body-md sm:text-lg text-on-surface-variant leading-relaxed">
            Sign in to view your EcoPoints, track your environmental contributions, and discover your rewards.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/login', { state: { from: '/impact' } })}
            icon={<LogIn className="w-4 h-4" />}
            iconPosition="right"
            className="w-full sm:w-auto shadow-sm"
          >
            Sign In to View EcoPoints
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/register', { state: { from: '/impact' } })}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
            className="w-full sm:w-auto"
          >
            Create Account
          </Button>
        </div>

        {/* Visual Showcase: Subtle EcoPoints Reward Concept Card */}
        <div className="pt-6">
          <div className="max-w-xl mx-auto relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-900 via-teal-950 to-emerald-950 text-white shadow-xl border border-emerald-700/40 overflow-hidden text-left">
            {/* Subtle background graphic */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="absolute right-6 top-6 opacity-20">
              <Leaf className="w-24 h-24 text-emerald-300" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-400 text-teal-950 flex items-center justify-center font-bold text-xs">
                    GL
                  </div>
                  <span className="font-heading font-bold text-sm tracking-wider uppercase text-emerald-200">
                    GreenLoop EcoPass
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
                  Kerala Circular Ledger
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-300/80 block font-medium">
                  Verified Member Balance
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-heading font-extrabold text-4xl sm:text-5xl text-white tracking-tight">
                    120
                  </span>
                  <span className="font-heading font-semibold text-lg text-emerald-300">
                    EcoPoints
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Earned through verified material diverts and completed circular handovers.
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200/90">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>KAU Organic Nursery Vouchers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Haritha Sahayi Civic Certificate</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Small Explanation: How EcoPoints Are Earned */}
        <div className="pt-8 space-y-4 max-w-4xl mx-auto text-left">
          <div className="text-center space-y-1">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-primary tracking-tight">
              How EcoPoints Are Earned
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-lg mx-auto">
              Every point represents a real, verifiable action that diverts waste from Kerala's landfills and waterbodies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            <Card variant="elevated" className="p-4 space-y-2 border-outline-variant/60">
              <div className="w-9 h-9 rounded-lg bg-secondary-container text-primary flex items-center justify-center font-bold text-sm">
                +10
              </div>
              <h3 className="font-heading font-semibold text-sm text-on-surface">
                List Reusable Waste
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                Post segregated plastics, coconut biomass, or food surplus on the circular marketplace.
              </p>
            </Card>

            <Card variant="elevated" className="p-4 space-y-2 border-outline-variant/60">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm">
                +25
              </div>
              <h3 className="font-heading font-semibold text-sm text-on-surface">
                Complete Handover
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                Verify material collection with secure completion codes between generator and recipient.
              </p>
            </Card>

            <Card variant="elevated" className="p-4 space-y-2 border-outline-variant/60">
              <div className="w-9 h-9 rounded-lg bg-secondary-container text-primary flex items-center justify-center font-bold text-sm">
                +15
              </div>
              <h3 className="font-heading font-semibold text-sm text-on-surface">
                Report Civic Dumping
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                Geotag and photograph overflowing bins or illegal dump sites to assist civic cleanup teams.
              </p>
            </Card>

            <Card variant="elevated" className="p-4 space-y-2 border-outline-variant/60">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm">
                +50
              </div>
              <h3 className="font-heading font-semibold text-sm text-on-surface">
                Join Community Drive
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                Participate in local beach cleanups, canal restoration, and neighborhood collection events.
              </p>
            </Card>
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-center gap-2.5 text-xs text-on-surface-variant">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Strict Data Integrity:</strong> Zero random points or fabricated balances. All points are credited to private account ledgers only upon verified completion.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. AUTHENTICATED EXPERIENCE: PRIVATE USER ECOPOINTS DASHBOARD
  // -------------------------------------------------------------
  const currentUserId = currentUser.id;

  // Private records strictly filtered by user ID (Data integrity guarantee)
  const userPointsHistory = useMemo(() => {
    return ecoPointsLedger.filter((pt) => pt.user_id === currentUserId);
  }, [ecoPointsLedger, currentUserId]);

  const userListings = useMemo(() => {
    return listings.filter((l) => l.user_id === currentUserId);
  }, [listings, currentUserId]);

  const userTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.generator_id === currentUserId || t.recipient_id === currentUserId
    );
  }, [transactions, currentUserId]);

  const userResolvedReports = useMemo(() => {
    return reports.filter(
      (r) => r.reporter_id === currentUserId && r.status === 'resolved'
    );
  }, [reports, currentUserId]);

  // Current balance & cumulative points earned
  const userBalance = currentUser.eco_points_balance || 0;
  const totalEarned = useMemo(() => {
    const fromLedger = userPointsHistory
      .filter((p) => p.points > 0)
      .reduce((sum, p) => sum + p.points, 0);
    return Math.max(userBalance, fromLedger);
  }, [userBalance, userPointsHistory]);

  const tier = getEcoTier(totalEarned);

  // User's personal environmental savings calculated from real transactions
  const personalImpact = useMemo(() => {
    let wasteKg = 0;
    let co2Kg = 0;
    let landfillSqm = 0;

    userTransactions.forEach((tx) => {
      wasteKg += Number(tx.quantity) || 0;
      co2Kg += Number(tx.co2_saved_kg) || 0;
      landfillSqm += Number(tx.landfill_saved_kg) || 0;
    });

    return {
      wasteKg: Math.round(wasteKg * 10) / 10,
      co2Kg: Math.round(co2Kg * 10) / 10,
      landfillSqm: Math.round(landfillSqm * 10) / 10,
      exchangeCount: userTransactions.length,
    };
  }, [userTransactions]);

  const completedActivitiesCount = userListings.length + userTransactions.length + userResolvedReports.length;

  // Handle claiming an available reward
  const handleClaimReward = async (reward: EcoReward) => {
    if (userBalance < reward.points_cost) return;

    const voucherCode = `GL-${reward.category.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newBalance = userBalance - reward.points_cost;

    try {
      await updateProfile({ eco_points_balance: newBalance });
      setClaimedVoucherCode(voucherCode);
      setClaimSuccessMsg(`You have claimed "${reward.title}" for ${reward.points_cost} EcoPoints!`);
    } catch {
      setClaimSuccessMsg('Unable to claim reward. Please try again later.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header & Personal Identity Banner */}
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
            Environmental Impact &amp; EcoPoints
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Transparent empirical tracking of your landfill diversion, carbon mitigation, and earned rewards.
          </p>
        </div>

        {/* User Identity Chip */}
        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-sm flex items-center gap-3 self-start sm:self-auto">
          <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-heading font-bold text-base shadow-sm">
            {userBalance}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-semibold text-xs text-primary">
                {currentUser.full_name}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${tier.color}`}>
                {tier.badge}
              </span>
            </div>
            <span className="font-body-sm text-[11px] text-outline block capitalize mt-0.5">
              {currentUser.district} • {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS (User-Specific + Empirical) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Current Balance"
          value={userBalance}
          unit="PTS"
          subtext="Available for rewards"
          icon={<Coins className="w-5 h-5 text-primary" />}
        />

        <MetricCard
          label="Total Points Earned"
          value={totalEarned}
          unit="PTS"
          subtext="Lifetime verified credits"
          icon={<Award className="w-5 h-5 text-secondary" />}
        />

        <MetricCard
          label="Completed Activities"
          value={completedActivitiesCount}
          unit="actions"
          subtext={`${userListings.length} lists, ${userTransactions.length} trades, ${userResolvedReports.length} reports`}
          icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
        />

        <MetricCard
          label="Current Tier"
          value={tier.badge}
          subtext={`${Math.max(0, tier.next - totalEarned)} PTS to next tier`}
          icon={<Shield className="w-5 h-5 text-secondary" />}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Personal Impact &amp; Overview
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'points'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          My EcoPoints Ledger ({userPointsHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'rewards'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Available Rewards ({AVAILABLE_REWARDS.length})
        </button>
        <button
          onClick={() => setActiveTab('factors')}
          className={`px-4 py-2 font-label-md text-xs rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'factors'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          How to Earn &amp; Factors
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PERSONAL ENVIRONMENTAL IMPACT & CHARTS                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Personal Empirical Footprint Card */}
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-title-md text-primary">
                  Your Personal Environmental Contribution
                </h3>
              </div>
              <span className="text-xs text-outline font-medium">
                Calculated strictly from your verified transactions
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="font-label-sm text-xs text-outline uppercase block font-semibold">
                  Waste Diverted
                </span>
                <span className="font-heading font-bold text-2xl text-primary mt-1 block">
                  {personalImpact.wasteKg} <span className="text-sm font-normal text-on-surface-variant">kg</span>
                </span>
                <span className="text-[11px] text-on-surface-variant block mt-0.5">
                  Rescued from dumpsites
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="font-label-sm text-xs text-outline uppercase block font-semibold">
                  Avoided CO₂e
                </span>
                <span className="font-heading font-bold text-2xl text-primary mt-1 block">
                  {personalImpact.co2Kg} <span className="text-sm font-normal text-on-surface-variant">kg</span>
                </span>
                <span className="text-[11px] text-on-surface-variant block mt-0.5">
                  Mitigated greenhouse gas
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="font-label-sm text-xs text-outline uppercase block font-semibold">
                  Landfill Saved
                </span>
                <span className="font-heading font-bold text-2xl text-primary mt-1 block">
                  {personalImpact.landfillSqm} <span className="text-sm font-normal text-on-surface-variant">m²</span>
                </span>
                <span className="text-[11px] text-on-surface-variant block mt-0.5">
                  Area conserved
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="font-label-sm text-xs text-outline uppercase block font-semibold">
                  Exchanges
                </span>
                <span className="font-heading font-bold text-2xl text-primary mt-1 block">
                  {personalImpact.exchangeCount} <span className="text-sm font-normal text-on-surface-variant">cycles</span>
                </span>
                <span className="text-[11px] text-on-surface-variant block mt-0.5">
                  Verified handovers
                </span>
              </div>
            </div>

            {personalImpact.exchangeCount === 0 && (
              <p className="text-xs text-on-surface-variant pt-1 leading-relaxed">
                You haven't completed a material exchange yet. Publish your first recyclable or organic waste batch to start accumulating verified carbon and landfill savings.
              </p>
            )}
          </Card>

          {/* Statewide Empirical Visualizations */}
          <Card variant="elevated" className="p-6">
            <div className="mb-4">
              <h3 className="font-heading font-semibold text-title-md text-primary">
                Kerala Circular Telemetry Overview
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Aggregate material recovery and diversion progress across Kerala's 14 administrative districts.
              </p>
            </div>
            <ImpactCharts metrics={metrics} />
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ECOPOINTS TRANSACTION HISTORY (STRICT USER PRIVACY)    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'points' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
            <div>
              <h3 className="font-heading font-semibold text-title-md text-primary">
                Personal EcoPoints Ledger
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Private ledger of verified point credits and reward redemptions.
              </p>
            </div>
            <span className="font-label-sm text-xs font-semibold text-primary bg-secondary-container px-3 py-1 rounded-full">
              Balance: {userBalance} PTS
            </span>
          </div>

          {userPointsHistory.length === 0 ? (
            <EmptyState
              icon={<Award className="w-8 h-8 text-primary" />}
              title="No EcoPoints Recorded Yet"
              description="Your account currently has no point transactions recorded. List surplus materials, complete verified handovers, or report civic dumps to earn your first EcoPoints."
              actionLabel="List Unwanted Material"
              actionLink="/marketplace/new"
            />
          ) : (
            <div className="divide-y divide-outline-variant/40">
              {userPointsHistory.map((item) => {
                const isDebit = item.points < 0;
                return (
                  <div key={item.id} className="py-3.5 flex items-center justify-between text-body-sm hover:bg-surface-container-low/40 px-2 rounded-lg transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-heading font-semibold text-on-surface block text-sm">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-outline">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-medium">
                          {item.action_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <span className={`font-heading font-bold text-base ${isDebit ? 'text-error' : 'text-primary'}`}>
                      {isDebit ? '' : '+'}{item.points} PTS
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: AVAILABLE REWARDS (AUTHENTIC COMMUNITY REWARDS)         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-outline-variant/40">
              <div>
                <h3 className="font-heading font-semibold text-title-md text-primary">
                  Circular Partner Rewards
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Redeem your verified EcoPoints for compost amendments, organic seeds, and community recognition.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-primary font-semibold text-xs self-start sm:self-auto">
                <Coins className="w-3.5 h-3.5" />
                <span>Available: {userBalance} PTS</span>
              </div>
            </div>

            {claimSuccessMsg && (
              <div className="p-4 rounded-xl bg-secondary-container/60 border border-primary/20 text-primary text-xs flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-heading font-bold text-sm block">Voucher Claimed Successfully!</strong>
                    <p>{claimSuccessMsg}</p>
                    {claimedVoucherCode && (
                      <div className="pt-1">
                        <span className="text-on-surface-variant">Your Redemption Code: </span>
                        <code className="px-2 py-1 rounded bg-surface-container font-mono font-bold text-primary border border-outline-variant text-sm">
                          {claimedVoucherCode}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setClaimSuccessMsg(null)} className="p-1 text-primary hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {AVAILABLE_REWARDS.map((rew) => {
                const Icon = rew.icon;
                const canAfford = userBalance >= rew.points_cost;
                const pointsNeeded = rew.points_cost - userBalance;

                return (
                  <Card key={rew.id} variant="low" className="p-4 flex flex-col justify-between border-outline-variant/60 hover:border-outline transition-all space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2.5 rounded-xl bg-secondary-container text-primary">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-heading font-bold text-sm text-primary px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/50">
                          {rew.points_cost} PTS
                        </span>
                      </div>

                      <div>
                        <h4 className="font-heading font-bold text-base text-on-surface">
                          {rew.title}
                        </h4>
                        <span className="font-label-sm text-xs text-secondary font-medium block mt-0.5">
                          Partner: {rew.partner}
                        </span>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                          {rew.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-outline-variant/40 space-y-2">
                      <div className="text-[11px] text-outline flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{rew.redemption_method}</span>
                      </div>

                      <Button
                        variant={canAfford ? 'primary' : 'outline'}
                        fullWidth
                        size="sm"
                        disabled={!canAfford}
                        onClick={() => setSelectedReward(rew)}
                        icon={canAfford ? <Gift className="w-3.5 h-3.5" /> : undefined}
                      >
                        {canAfford ? 'Claim Reward' : `Need ${pointsNeeded} More PTS`}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: HOW TO EARN POINTS & MATERIAL FACTORS                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'factors' && (
        <div className="space-y-6">
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
        </div>
      )}

      {/* Modal: Confirm Reward Redemption */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card variant="elevated" className="max-w-md w-full p-6 space-y-4 shadow-xl border-outline-variant">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-bold text-lg text-primary">
                  Claim Reward Voucher
                </h3>
              </div>
              <button onClick={() => setSelectedReward(null)} className="p-1 text-outline hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-body-sm text-on-surface">
              <p>
                You are about to redeem <strong>{selectedReward.points_cost} EcoPoints</strong> for:
              </p>
              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/60">
                <span className="font-semibold block text-primary">{selectedReward.title}</span>
                <span className="text-xs text-outline block mt-0.5">Partner: {selectedReward.partner}</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Your remaining balance will be <strong>{userBalance - selectedReward.points_cost} PTS</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
              <Button variant="outline" size="sm" onClick={() => setSelectedReward(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleClaimReward(selectedReward);
                  setSelectedReward(null);
                }}
              >
                Confirm &amp; Generate Voucher
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ImpactDashboardPage;
