import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { KERALA_DISTRICT_COORDS } from '../../hooks/useGeolocation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Building2,
  Sprout,
  Recycle,
  Users,
  KeyRound
} from 'lucide-react';

export interface LoginPageProps {
  initialMode?: 'signin' | 'register' | 'forgot_password';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';
  const { signIn, signUp, resetPassword, currentUser, loading: authLoading } = useAuth();

  // Mode state: 'signin' | 'register' | 'forgot_password'
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot_password'>(() => {
    if (initialMode) return initialMode;
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') return 'register';
    if (modeParam === 'forgot' || modeParam === 'forgot_password') return 'forgot_password';
    if (location.pathname === '/register') return 'register';
    return 'signin';
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [currentUser, authLoading, navigate, from]);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('individual');
  const [district, setDistrict] = useState('Ernakulam');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

  const roleOptions: { role: UserRole; title: string; desc: string; icon: any }[] = [
    { role: 'individual', title: 'Individual / Household', desc: 'List domestic recyclables, husk & garden biomass', icon: Home },
    { role: 'business', title: 'Business / Restaurant', desc: 'Divert commercial food surplus, cartons & packaging', icon: Building2 },
    { role: 'farmer', title: 'Farmer / Gardener', desc: 'Source organic waste & compostable materials', icon: Sprout },
    { role: 'recycler', title: 'Recycler / Collection Centre', desc: 'Aggregate sorted dry plastics, paper, glass & metals', icon: Recycle },
    { role: 'ngo', title: 'NGO / Community Group', desc: 'Organise waste collection drives & local initiatives', icon: Users },
  ];

  // Reset notifications on mode switch
  const switchMode = (newMode: 'signin' | 'register' | 'forgot_password') => {
    setError('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMode(newMode);
  };

  // 1. Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await signIn(email.trim(), password);
      if (!res.success) {
        setError(res.error || 'Invalid email or password.');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Please enter your full name or organization name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setLoading(true);

    try {
      const res = await signUp(email.trim(), password, name.trim(), role, district);
      if (!res.success) {
        setError(res.error || 'Registration failed.');
      } else {
        setSuccessMsg(
          'Account created successfully! If your account requires email confirmation, please check your inbox before logging in.'
        );
        // If session is already created immediately, redirect
        if (currentUser) {
          navigate(from, { replace: true });
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Registration error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please enter your email address to receive password reset instructions.');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(email.trim());
      if (!res.success) {
        setError(res.error || 'Unable to send password reset email. Please verify your email address.');
      } else {
        setSuccessMsg(
          'Password reset link sent! Please check your email inbox for instructions to reset your password.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mx-auto px-4 py-8 space-y-6 transition-all ${mode === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
          <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary flex items-center justify-center mx-auto shadow-sm">
            <img src="/logo.png" alt="GreenLoop" className="w-6 h-6 object-contain" />
          </div>
        </Link>

        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
          {mode === 'signin' && 'Sign In to GreenLoop'}
          {mode === 'register' && 'Create Your GreenLoop Account'}
          {mode === 'forgot_password' && 'Reset Your Password'}
        </h1>

        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
          {mode === 'signin' && "Access Kerala's circular resource exchange network."}
          {mode === 'register' && "Join households, businesses, farmers, and recycling networks across Kerala."}
          {mode === 'forgot_password' && "Enter your registered email address and we'll send you a link to reset your password."}
        </p>
      </div>

      <Card variant="elevated" className="space-y-5 p-6 sm:p-8">
        {/* Status Alerts */}
        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-lg text-body-sm font-medium border border-error/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-secondary-container/60 text-primary rounded-lg text-body-sm font-medium border border-primary/20 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SIGN IN FORM                                                  */}
        {/* ------------------------------------------------------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-outline hover:text-on-surface transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => switchMode('forgot_password')}
                  className="font-label-md text-xs font-semibold text-primary hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* REGISTRATION FORM                                             */}
        {/* ------------------------------------------------------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Role Selection Grid */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2 font-semibold">
                Select Your Role in the Circular Chain *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = role === opt.role;
                  return (
                    <div
                      key={opt.role}
                      onClick={() => setRole(opt.role)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-secondary-container/50 border-primary text-primary ring-1 ring-primary'
                          : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-heading font-semibold text-xs block text-on-surface">
                          {opt.title}
                        </span>
                        <span className="text-[11px] text-on-surface-variant block mt-0.5">
                          {opt.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name / Organization Name *"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anjali Nair / Kochi Organic Farm"
                autoComplete="name"
              />

              <Input
                label="Email Address *"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password *"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-outline hover:text-on-surface transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <Input
                label="Confirm Password *"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 text-outline hover:text-on-surface transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Kerala District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 py-2.5 px-3 transition-all"
              >
                {keralaDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              {loading ? 'Creating Account...' : 'Register / Create Account'}
            </Button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FORGOT PASSWORD FORM                                          */}
        {/* ------------------------------------------------------------- */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              label="Registered Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              helperText="We will send a password reset link to this email address."
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              icon={<KeyRound className="w-4 h-4" />}
              iconPosition="right"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM NAVIGATION LINKS                                       */}
        {/* ------------------------------------------------------------- */}
        <div className="pt-4 border-t border-outline-variant/60 text-center">
          {mode === 'signin' && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-semibold text-primary hover:underline transition-colors focus:outline-none"
              >
                Create an account
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-semibold text-primary hover:underline transition-colors focus:outline-none"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'forgot_password' && (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="inline-flex items-center gap-1.5 font-semibold text-xs text-primary hover:underline transition-colors focus:outline-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};
