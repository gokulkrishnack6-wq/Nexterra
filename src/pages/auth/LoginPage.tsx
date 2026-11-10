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
  KeyRound,
  RefreshCw,
  Send,
  Inbox,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

export interface LoginPageProps {
  initialMode?: 'signin' | 'register' | 'forgot_password' | 'check_email';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';
  const { signIn, signUp, resetPassword, resendConfirmation, currentUser, loading: authLoading } = useAuth();

  // Mode state: 'signin' | 'register' | 'forgot_password' | 'check_email'
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot_password' | 'check_email'>(() => {
    if (initialMode) return initialMode;
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') return 'register';
    if (modeParam === 'forgot' || modeParam === 'forgot_password') return 'forgot_password';
    if (modeParam === 'check_email') return 'check_email';
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
  const [countryCode, setCountryCode] = useState('+91');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Email confirmation & unconfirmed account states
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [showUnconfirmedNotice, setShowUnconfirmedNotice] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState('');

  // Handle URL query parameters on load
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setPendingConfirmationEmail(emailParam);
    }

    if (searchParams.get('verified') === 'true' || searchParams.get('confirmed') === 'true') {
      setSuccessMsg('Your email address has been successfully verified! You can now sign in.');
    }

    const errorCode = searchParams.get('error_code');
    const errorParam = searchParams.get('error');
    if (errorCode === 'otp_expired' || errorParam === 'otp_expired') {
      setError('Your verification link has expired or was already used. Please request a new confirmation email below.');
      setShowUnconfirmedNotice(true);
    }
  }, [location.search]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

  const roleOptions: { role: UserRole; title: string; desc: string; icon: any }[] = [
    { role: 'individual', title: 'Individual / Household', desc: 'List domestic recyclables, husk & garden biomass', icon: Home },
    { role: 'business', title: 'Business / Restaurant', desc: 'Divert commercial food surplus, cartons & packaging', icon: Building2 },
    { role: 'farmer', title: 'Farmer / Gardener', desc: 'Source organic waste & compostable materials', icon: Sprout },
    { role: 'recycler', title: 'Recycler / Collection Centre', desc: 'Aggregate sorted dry plastics, paper, glass & metals', icon: Recycle },
    { role: 'ngo', title: 'NGO / Community Group', desc: 'Organise waste collection drives & local initiatives', icon: Users },
  ];

  // Reset notifications on mode switch
  const switchMode = (newMode: 'signin' | 'register' | 'forgot_password' | 'check_email') => {
    setError('');
    setSuccessMsg('');
    setResendNotice('');
    setShowUnconfirmedNotice(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMode(newMode);
  };

  // Resend confirmation email handler with rate limit cooldown
  const handleResendConfirmation = async (targetEmail?: string) => {
    const toSend = (targetEmail || pendingConfirmationEmail || email).trim();
    if (!toSend) {
      setError('Please provide your email address to receive a new confirmation link.');
      return;
    }

    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setError('');
    setResendNotice('');

    try {
      const res = await resendConfirmation(toSend);
      if (!res.success) {
        setError(res.error || 'Failed to resend confirmation email. Please verify the address.');
      } else {
        setResendNotice(`A fresh confirmation link has been sent to ${toSend}. Please check your inbox.`);
        setResendCooldown(60);
      }
    } catch (err: any) {
      setError(err?.message || 'Error requesting confirmation link.');
    } finally {
      setResendLoading(false);
    }
  };

  // 1. Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setResendNotice('');
    setShowUnconfirmedNotice(false);
    setLoading(true);

    try {
      const res = await signIn(email.trim(), password);
      if (!res.success) {
        if (res.isEmailUnconfirmed) {
          setShowUnconfirmedNotice(true);
          setPendingConfirmationEmail(email.trim());
          setError(
            res.error || 'Your email has not been verified yet. Please check your inbox or request a new confirmation email below.'
          );
        } else {
          setError(res.error || 'Invalid email or password.');
        }
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
    setResendNotice('');

    if (!name.trim()) {
      setError('Please enter your full name or organization name.');
      return;
    }

    // WhatsApp Number Validation
    const cleanDigits = whatsappNumber.replace(/\D/g, '');
    const cleanCode = countryCode.trim().startsWith('+') ? countryCode.trim() : `+${countryCode.trim()}`;
    const totalDigits = cleanCode.replace(/\D/g, '') + cleanDigits;
    const fullWaNumber = `${cleanCode} ${cleanDigits}`.trim();

    if (!cleanDigits) {
      setError('WhatsApp number is required to coordinate exchange collections.');
      return;
    }

    if (cleanDigits.length < 7 || totalDigits.length < 10 || totalDigits.length > 15) {
      setError('Please enter a valid international mobile number (10–15 digits total).');
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
      const res = await signUp(
        email.trim(),
        password,
        name.trim(),
        role,
        district,
        fullWaNumber,
        true
      );
      if (!res.success) {
        setError(res.error || 'Registration failed.');
      } else if (res.requiresEmailConfirmation) {
        // Transition to clear post-registration "Check your email" view
        setPendingConfirmationEmail(email.trim());
        setMode('check_email');
      } else {
        // Immediate session created
        if (currentUser) {
          navigate(from, { replace: true });
        } else {
          setSuccessMsg('Account created successfully! You can now sign in.');
          setMode('signin');
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
    setResendNotice('');

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
          <div className="w-10 h-10 rounded-md bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9] flex items-center justify-center mx-auto shadow-subtle">
            <img src="/logo.png" alt="GreenLoop" className="w-6 h-6 object-contain" />
          </div>
        </Link>

        <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
          {mode === 'signin' && 'Sign In to GreenLoop'}
          {mode === 'register' && 'Create Your GreenLoop Account'}
          {mode === 'forgot_password' && 'Reset Your Password'}
          {mode === 'check_email' && 'Check Your Email'}
        </h1>

        <p className="font-sans text-xs sm:text-sm text-[#5C6E66] max-w-md mx-auto">
          {mode === 'signin' && "Sign in to manage your listings and exchanges."}
          {mode === 'register' && "Sign up to give waste a second life in your area."}
          {mode === 'forgot_password' && "Enter your email address and we'll send you a link to reset your password."}
          {mode === 'check_email' && "We've sent a verification link to your email. Confirm your account to get started."}
        </p>
      </div>

      <div className="space-y-4 p-5 sm:p-7 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle">
        {/* Status Alerts */}
        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-lg text-body-sm font-medium border border-error/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
            <div className="leading-snug space-y-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Unconfirmed Account Resend Banner (Triggered during failed login with unconfirmed email) */}
        {showUnconfirmedNotice && mode === 'signin' && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-body-sm space-y-2.5">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
              <p className="font-medium text-xs sm:text-sm">
                Need another confirmation link for <strong>{pendingConfirmationEmail || email}</strong>?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={resendLoading}
                disabled={resendCooldown > 0}
                onClick={() => handleResendConfirmation(pendingConfirmationEmail || email)}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resendLoading
                  ? 'Sending...'
                  : 'Resend Confirmation Email'}
              </Button>
            </div>
          </div>
        )}

        {resendNotice && (
          <div className="p-3 bg-secondary-container/60 text-primary rounded-lg text-body-sm font-medium border border-primary/20 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span className="leading-snug">{resendNotice}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-secondary-container/60 text-primary rounded-lg text-body-sm font-medium border border-primary/20 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CHECK EMAIL (POST-REGISTRATION) SCREEN                        */}
        {/* ------------------------------------------------------------- */}
        {mode === 'check_email' && (
          <div className="space-y-6 text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-secondary-container/80 text-primary flex items-center justify-center mx-auto ring-8 ring-secondary-container/30">
              <Inbox className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="font-heading font-semibold text-lg text-on-surface">
                Verify Your Email Address
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                We sent a confirmation link to:
              </p>
              <div className="inline-block px-3.5 py-1.5 bg-surface-container rounded-lg font-mono text-body-sm font-semibold text-primary border border-outline-variant">
                {pendingConfirmationEmail || email}
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-4 text-left border border-outline-variant/60 space-y-2 text-xs sm:text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Next steps:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                <li>Check your inbox (and spam or junk folder).</li>
                <li>Click the confirmation link inside the email.</li>
                <li>You'll be verified and ready to exchange materials on GreenLoop!</li>
              </ol>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="md"
                disabled={resendCooldown > 0 || resendLoading}
                loading={resendLoading}
                onClick={() => handleResendConfirmation(pendingConfirmationEmail || email)}
                icon={<RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />}
              >
                {resendCooldown > 0
                  ? `Resend link available in ${resendCooldown}s`
                  : 'Resend Confirmation Email'}
              </Button>

              <Button
                type="button"
                variant="primary"
                fullWidth
                size="md"
                onClick={() => switchMode('signin')}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Proceed to Sign In
              </Button>
            </div>
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

            {/* WhatsApp Number with Country Code */}
            <div className="space-y-1.5">
              <label className="block font-label-md text-label-md text-on-surface font-semibold">
                WhatsApp Number (for Collection Coordination) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+91"
                  className="w-20 px-3 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 font-mono text-center text-sm transition-all"
                  aria-label="Country Code"
                />
                <div className="relative flex-1">
                  <MessageSquare className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 font-mono text-sm transition-all"
                    autoComplete="tel-national"
                  />
                </div>
              </div>
              <p className="text-[11px] text-outline">
                Default: India (+91). Enter your mobile number for direct WhatsApp handover coordination.
              </p>
            </div>

            {/* Privacy Notice */}
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-start gap-2.5 text-xs text-on-surface-variant">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-primary block">Zero Public Exposure Guarantee</span>
                <span className="block mt-0.5 leading-relaxed">
                  Your WhatsApp number is strictly confidential and never displayed on public listings or profile searches. It is shared only with verified exchange partners once an exchange is accepted.
                </span>
              </div>
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

          {mode === 'check_email' && (
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
      </div>
    </div>
  );
};
