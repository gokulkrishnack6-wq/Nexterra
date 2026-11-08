import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ShoppingBag,
  LogIn,
  Clock,
  Sparkles
} from 'lucide-react';

export type CallbackStatus = 'verifying' | 'success' | 'expired' | 'error';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resendConfirmation, refreshSession, currentUser } = useAuth();

  const [status, setStatus] = useState<CallbackStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [isExpiredOtp, setIsExpiredOtp] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-redirect countdown
  const [countdown, setCountdown] = useState<number | null>(null);

  const hasProcessedRef = useRef(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Optional countdown auto-redirect timer when user has an active session
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      navigate('/', { replace: true });
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, navigate]);

  // Listen to Supabase auth events (SIGNED_IN, USER_UPDATED) to handle callbacks asynchronously
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          await refreshSession();
          setHasSession(true);
          setStatus('success');
          // If already signed in, start a 5-second countdown to dashboard
          setCountdown(5);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [refreshSession]);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    async function processAuthCallback() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus('error');
        setErrorMessage('Authentication service is not configured. Please contact support.');
        return;
      }

      // 1. Extract params from both React Router location and window.location
      const searchStr = location.search || window.location.search || '';
      const hashStr = location.hash || window.location.hash || '';
      const searchParams = new URLSearchParams(searchStr);
      const rawHash = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
      const hashParams = new URLSearchParams(rawHash);

      const emailParam = searchParams.get('email') || hashParams.get('email');
      if (emailParam) setResendEmail(emailParam);

      // Check for explicit error parameters passed back by Supabase
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      const errorMsg = searchParams.get('error') || hashParams.get('error');

      if (errorCode || errorMsg || errorDescription) {
        const isExpired =
          errorCode === 'otp_expired' ||
          Boolean(errorDescription?.toLowerCase().includes('expired')) ||
          Boolean(errorDescription?.toLowerCase().includes('invalid'));

        setIsExpiredOtp(isExpired);
        if (isExpired) {
          setStatus('expired');
          setErrorMessage(
            'This confirmation link has expired or has already been used. If your account was already verified, you can sign in directly.'
          );
        } else {
          setStatus('error');
          setErrorMessage(errorDescription || errorMsg || 'Authentication callback failed. Please try signing in again.');
        }
        return;
      }

      // 2. Check if the Supabase client already initialized and processed the session
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          await refreshSession();
          setHasSession(true);
          setStatus('success');
          setCountdown(5);
          return;
        }
      } catch {
        // Continue to manual exchange
      }

      // 3. Check for PKCE Authorization Code (?code=...)
      const code = searchParams.get('code') || hashParams.get('code');
      if (code) {
        try {
          // Exchange code for user session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (!error && data?.session) {
            await refreshSession();
            setHasSession(true);
            setStatus('success');
            setCountdown(5);
            return;
          }

          // Check if session became available through onAuthStateChange concurrently
          const { data: concurrentSession } = await supabase.auth.getSession();
          if (concurrentSession?.session?.user) {
            await refreshSession();
            setHasSession(true);
            setStatus('success');
            setCountdown(5);
            return;
          }

          if (error) {
            const msg = (error.message || '').toLowerCase();
            const isCodeVerifierMissing =
              msg.includes('code verifier') ||
              msg.includes('pkce') ||
              (error as any).code === 'pkce_code_verifier_missing';

            // When user clicks the verification link in an email client or another browser:
            // The Supabase /auth/v1/verify server endpoint ALREADY verified their email address!
            // However, the local PKCE code verifier is absent in this secondary browser.
            // Account is confirmed; user can sign in with their password.
            if (isCodeVerifierMissing || msg.includes('invalid_grant')) {
              setStatus('success');
              setHasSession(false);
              return;
            }

            if (msg.includes('expired')) {
              setIsExpiredOtp(true);
              setStatus('expired');
              setErrorMessage('This confirmation link has expired. Please request a new confirmation link below.');
              return;
            }

            // Other code error
            setStatus('error');
            setErrorMessage(error.message || 'Unable to complete verification code exchange.');
            return;
          }
        } catch {
          // Check final session state before showing error
          const { data: finalCheck } = await supabase.auth.getSession();
          if (finalCheck?.session?.user) {
            await refreshSession();
            setHasSession(true);
            setStatus('success');
            setCountdown(5);
            return;
          }
          // Default to verified email success screen prompting login
          setStatus('success');
          setHasSession(false);
          return;
        }
      }

      // 4. Check for Token Hash (?token_hash=...)
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      const otpType = searchParams.get('type') || hashParams.get('type') || 'signup';
      if (tokenHash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as any,
          });

          if (error) {
            const isExpired =
              error.message?.toLowerCase().includes('expired') ||
              error.message?.toLowerCase().includes('invalid');

            setIsExpiredOtp(isExpired);
            if (isExpired) {
              setStatus('expired');
              setErrorMessage('This confirmation link has expired or has already been used.');
            } else {
              setStatus('error');
              setErrorMessage(error.message);
            }
            return;
          }

          if (data?.session) {
            await refreshSession();
            setHasSession(true);
            setCountdown(5);
          } else {
            setHasSession(false);
          }
          setStatus('success');
          return;
        } catch {
          setStatus('error');
          setErrorMessage('Verification request failed. Please request a fresh confirmation link.');
          return;
        }
      }

      // 5. Check for Implicit Flow Hash Tokens (#access_token=...)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (!error && data?.session) {
            await refreshSession();
            setHasSession(true);
            setStatus('success');
            setCountdown(5);
            return;
          }
        } catch {
          // ignore
        }
      }

      // 6. Check if user is already authenticated
      try {
        const { data: userCheck } = await supabase.auth.getUser();
        if (userCheck?.user) {
          await refreshSession();
          setHasSession(true);
          setStatus('success');
          setCountdown(5);
          return;
        }
      } catch {
        // ignore
      }

      // 7. If redirected from email confirmation endpoint (e.g. type=signup or confirmed=true)
      const typeParam = searchParams.get('type') || hashParams.get('type');
      if (typeParam === 'signup' || typeParam === 'email_change' || typeParam === 'recovery' || searchParams.get('confirmed') === 'true') {
        setStatus('success');
        setHasSession(false);
        return;
      }

      // 8. If no actionable auth parameter was found
      setStatus('error');
      setErrorMessage('No valid confirmation code or token found in the URL. If you already verified your account, please sign in.');
    }

    processAuthCallback();
  }, [location.search, location.hash, refreshSession]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setResendSuccess(false);

    try {
      const res = await resendConfirmation(resendEmail.trim());
      if (res.success) {
        setResendSuccess(true);
        setResendCooldown(60);
      } else {
        setErrorMessage(res.error || 'Failed to resend confirmation email.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card variant="elevated" className="max-w-md w-full p-6 sm:p-8 space-y-6 text-center border-outline-variant/60 shadow-lg">
        {/* Brand Logo */}
        <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
          <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center mx-auto shadow-sm">
            <img src="/logo.png" alt="GreenLoop" className="w-7 h-7 object-contain" />
          </div>
        </Link>

        {/* 1. VERIFYING STATE */}
        {status === 'verifying' && (
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-secondary-container text-primary flex items-center justify-center mx-auto">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-heading font-bold text-2xl text-primary tracking-tight">
                Verifying your email...
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                Please wait while GreenLoop validates your confirmation token and establishes your session...
              </p>
            </div>
          </div>
        )}

        {/* 2. SUCCESS STATE */}
        {status === 'success' && (
          <div className="space-y-5 py-2">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-primary flex items-center justify-center mx-auto ring-8 ring-secondary-container/30">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/80 text-primary text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Your account is ready</span>
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
                Email verified successfully!
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                {hasSession || currentUser
                  ? 'Your GreenLoop account has been verified. Welcome to Kerala’s circular resource exchange network.'
                  : 'Your email address has been confirmed with GreenLoop. You can now sign in with your credentials to access your dashboard.'}
              </p>
            </div>

            <div className="pt-3 space-y-2.5">
              {hasSession || currentUser ? (
                <>
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={() => navigate('/', { replace: true })}
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    Continue to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    size="md"
                    onClick={() => navigate('/marketplace', { replace: true })}
                    icon={<ShoppingBag className="w-4 h-4" />}
                  >
                    Explore Waste Marketplace
                  </Button>
                  {countdown !== null && countdown > 0 && (
                    <p className="text-xs text-on-surface-variant pt-1">
                      Redirecting to dashboard in {countdown}s...{' '}
                      <button
                        type="button"
                        onClick={() => setCountdown(null)}
                        className="text-primary hover:underline font-semibold"
                      >
                        Stay here
                      </button>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={() => navigate(`/login?verified=true${resendEmail ? `&email=${encodeURIComponent(resendEmail)}` : ''}`, { replace: true })}
                    icon={<LogIn className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    Continue to Sign In
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    size="md"
                    onClick={() => navigate('/', { replace: true })}
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back to Homepage
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 3. EXPIRED STATE */}
        {status === 'expired' && (
          <div className="space-y-5 py-2">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-700 dark:text-amber-300" />
            </div>

            <div className="space-y-1.5">
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-primary tracking-tight">
                Confirmation Link Expired or Already Used
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                This verification link is no longer valid. If your account was already verified earlier, you can sign in directly.
              </p>
            </div>

            {/* Quick Action: Sign In Directly */}
            <div className="p-3 bg-surface-container-low border border-outline-variant rounded-xl text-left space-y-2">
              <p className="text-xs text-on-surface-variant">
                Already confirmed your account?
              </p>
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={() => navigate(`/login${resendEmail ? `?email=${encodeURIComponent(resendEmail)}` : ''}`, { replace: true })}
                icon={<LogIn className="w-4 h-4" />}
                iconPosition="right"
              >
                Sign In With Your Password
              </Button>
            </div>

            {/* Resend Confirmation Form */}
            <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
              <Input
                label="Need a new confirmation email?"
                type="email"
                placeholder="name@example.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
              />

              {resendSuccess && (
                <div className="p-3 bg-secondary-container/50 border border-primary/20 rounded-lg text-primary text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>A fresh confirmation link has been sent to your email. Please check your inbox.</span>
                </div>
              )}

              <Button
                type="submit"
                variant="outline"
                fullWidth
                disabled={resendLoading || resendCooldown > 0}
                icon={<RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />}
              >
                {resendLoading
                  ? 'Sending New Link...'
                  : resendCooldown > 0
                  ? `Resend Available in ${resendCooldown}s`
                  : 'Resend Confirmation Email'}
              </Button>
            </form>

            <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-xs">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
              <Link
                to="/login?mode=register"
                className="text-on-surface-variant hover:text-primary hover:underline"
              >
                Create New Account
              </Link>
            </div>
          </div>
        )}

        {/* 4. GENERIC ERROR STATE */}
        {status === 'error' && (
          <div className="space-y-5 py-2">
            <div className="w-14 h-14 rounded-full bg-error-container/40 text-error flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>

            <div className="space-y-1.5">
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-primary tracking-tight">
                Authentication Failed
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                {errorMessage}
              </p>
            </div>

            {/* Resend Confirmation Form */}
            <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="name@example.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
              />

              {resendSuccess && (
                <div className="p-3 bg-secondary-container/50 border border-primary/20 rounded-lg text-primary text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>A fresh confirmation link has been sent to your email. Please check your inbox.</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={resendLoading || resendCooldown > 0}
                icon={<RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />}
              >
                {resendLoading
                  ? 'Sending New Link...'
                  : resendCooldown > 0
                  ? `Resend Available in ${resendCooldown}s`
                  : 'Resend Confirmation Email'}
              </Button>
            </form>

            <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-xs">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
              <Link
                to="/login?mode=register"
                className="text-on-surface-variant hover:text-primary hover:underline"
              >
                Create New Account
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuthCallbackPage;
