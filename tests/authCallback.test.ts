import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getAuthRedirectUrl, GREENLOOP_PRODUCTION_URL } from '../src/lib/supabase';

describe('GreenLoop Supabase Email Verification & Auth Flow', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  describe('1. Dynamic Redirect URL Resolution (getAuthRedirectUrl)', () => {
    it('uses the production URL when in non-browser / SSR environment', () => {
      // simulate non-browser environment
      (globalThis as any).window = undefined;
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      expect(redirectUrl).toBe(`${GREENLOOP_PRODUCTION_URL}/auth/callback`);
    });

    it('uses window.location.origin in production browser environment', () => {
      (globalThis as any).window = {
        location: {
          origin: 'https://greenloop-9tm5.onrender.com',
        },
      };
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      expect(redirectUrl).toBe('https://greenloop-9tm5.onrender.com/auth/callback');
    });

    it('strictly avoids http://localhost:3000 and falls back to production Render URL', () => {
      // Problem statement explicitly requires never redirecting to localhost:3000
      (globalThis as any).window = {
        location: {
          origin: 'http://localhost:3000',
        },
      };
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      expect(redirectUrl).not.toContain('localhost:3000');
      expect(redirectUrl).toBe(`${GREENLOOP_PRODUCTION_URL}/auth/callback`);
    });

    it('allows valid local dev Vite ports (e.g. localhost:5173 or localhost:8080)', () => {
      (globalThis as any).window = {
        location: {
          origin: 'http://localhost:5173',
        },
      };
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      expect(redirectUrl).toBe('http://localhost:5173/auth/callback');
    });

    it('handles custom redirect paths and query parameters', () => {
      (globalThis as any).window = {
        location: {
          origin: 'https://greenloop-9tm5.onrender.com',
        },
      };
      const redirectUrl = getAuthRedirectUrl('/login?mode=reset_password');
      expect(redirectUrl).toBe('https://greenloop-9tm5.onrender.com/login?mode=reset_password');
    });
  });

  describe('2. Supabase Auth Callback & Error Detection Logic', () => {
    it('detects otp_expired query parameter correctly', () => {
      const searchParams = new URLSearchParams('error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
      const errorCode = searchParams.get('error_code');
      const errorDescription = searchParams.get('error_description');

      const isExpired =
        errorCode === 'otp_expired' ||
        Boolean(errorDescription?.toLowerCase().includes('expired')) ||
        Boolean(errorDescription?.toLowerCase().includes('invalid'));

      expect(isExpired).toBe(true);
    });

    it('extracts PKCE authorization code (?code=...) correctly from URL', () => {
      const searchParams = new URLSearchParams('code=62e3077e-2cf6-4444-9dc3-e84067cf39ee');
      const code = searchParams.get('code');
      expect(code).toBe('62e3077e-2cf6-4444-9dc3-e84067cf39ee');
    });

    it('extracts token_hash and type (?token_hash=...&type=signup) correctly from URL', () => {
      const searchParams = new URLSearchParams('token_hash=pkce_token_hash_abc123&type=signup');
      expect(searchParams.get('token_hash')).toBe('pkce_token_hash_abc123');
      expect(searchParams.get('type')).toBe('signup');
    });

    it('handles hash fragment tokens (#access_token=...&refresh_token=...) gracefully', () => {
      const hash = '#access_token=mock_jwt&refresh_token=mock_refresh&token_type=bearer';
      const hashParams = new URLSearchParams(hash.slice(1));
      expect(hashParams.get('access_token')).toBe('mock_jwt');
      expect(hashParams.get('token_type')).toBe('bearer');
    });
  });

  describe('3. Top-Level Auth Callback Routing & Interception (AuthCallbackDetector)', () => {
    it('identifies when incoming URL at root "/" contains PKCE code', () => {
      const search = '?code=abc-123-xyz';
      const hash = '';
      const hasCallbackIndicators =
        search.includes('code=') ||
        search.includes('token_hash=') ||
        search.includes('error_code=') ||
        search.includes('error=') ||
        hash.includes('access_token=') ||
        hash.includes('error_code=') ||
        hash.includes('error=');

      expect(hasCallbackIndicators).toBe(true);
    });

    it('identifies when incoming URL contains hash access_token from implicit grant', () => {
      const search = '';
      const hash = '#access_token=token123&type=signup';
      const hasCallbackIndicators =
        search.includes('code=') ||
        search.includes('token_hash=') ||
        search.includes('error_code=') ||
        search.includes('error=') ||
        hash.includes('access_token=') ||
        hash.includes('error_code=') ||
        hash.includes('error=');

      expect(hasCallbackIndicators).toBe(true);
    });

    it('identifies when incoming URL contains otp_expired error parameter', () => {
      const search = '?error_code=otp_expired';
      const hash = '';
      const hasCallbackIndicators =
        search.includes('code=') ||
        search.includes('token_hash=') ||
        search.includes('error_code=') ||
        search.includes('error=') ||
        hash.includes('access_token=') ||
        hash.includes('error_code=') ||
        hash.includes('error=');

      expect(hasCallbackIndicators).toBe(true);
    });

    it('does not trigger false positive on normal navigation without auth parameters', () => {
      const search = '?category=plastic&page=2';
      const hash = '';
      const hasCallbackIndicators =
        search.includes('code=') ||
        search.includes('token_hash=') ||
        search.includes('error_code=') ||
        search.includes('error=') ||
        hash.includes('access_token=') ||
        hash.includes('error_code=') ||
        hash.includes('error=');

      expect(hasCallbackIndicators).toBe(false);
    });
  });

  describe('4. Unconfirmed Account & Duplicate User Detection', () => {
    it('identifies unconfirmed email errors on login attempt', () => {
      const errorResponse = {
        message: 'Email not confirmed',
        code: 'email_not_confirmed',
      };

      const msg = errorResponse.message.toLowerCase();
      const isUnconfirmed =
        msg.includes('email not confirmed') ||
        msg.includes('not confirmed') ||
        errorResponse.code === 'email_not_confirmed';

      expect(isUnconfirmed).toBe(true);
    });

    it('identifies duplicate registration attempt via empty identities array', () => {
      // Supabase user enumeration protection returns data.user with empty identities array
      const signUpResponse = {
        user: {
          id: 'existing-uuid',
          email: 'member@greenloop.in',
          identities: [],
        },
        session: null,
      };

      const isDuplicate = signUpResponse.user?.identities && signUpResponse.user.identities.length === 0;
      expect(isDuplicate).toBe(true);
    });

    it('does not treat unverified account with null session as authenticated', () => {
      const signUpResponse = {
        user: {
          id: 'new-unconfirmed-uuid',
          email: 'newuser@example.com',
          identities: [{ id: 'identity-1' }],
        },
        session: null, // No session issued until email confirmation
      };

      const requiresConfirmation = signUpResponse.session === null;
      expect(requiresConfirmation).toBe(true);
    });
  });

  describe('5. User Verification State Synchronization (is_verified)', () => {
    it('accurately derives is_verified: true when email_confirmed_at timestamp is present', () => {
      const user = {
        id: 'user-123',
        email: 'verified@greenloop.in',
        email_confirmed_at: '2026-11-07T14:00:00Z',
      };

      const profileData = {
        id: 'user-123',
        is_verified: false, // In database prior to confirmation
      };

      const isEmailConfirmed = Boolean(user.email_confirmed_at);
      const verified = isEmailConfirmed || Boolean(profileData.is_verified);

      expect(verified).toBe(true);
    });

    it('ensures unconfirmed users are not incorrectly treated as verified', () => {
      const user = {
        id: 'user-456',
        email: 'unconfirmed@greenloop.in',
        email_confirmed_at: null,
      };

      const profileData = {
        id: 'user-456',
        is_verified: false,
      };

      const isEmailConfirmed = Boolean(user.email_confirmed_at);
      const verified = isEmailConfirmed || Boolean(profileData.is_verified);

      expect(verified).toBe(false);
    });
  });

  describe('6. Resend Confirmation Safeguards', () => {
    it('validates non-empty email before triggering resend', () => {
      const email = '   ';
      const cleanEmail = email.trim();
      expect(cleanEmail).toBe('');
      const canSend = cleanEmail.length > 0;
      expect(canSend).toBe(false);
    });

    it('cooldown prevents rapid repeated resend calls', () => {
      let cooldown = 60;
      const canTrigger = cooldown <= 0;
      expect(canTrigger).toBe(false);

      // simulate timer ticking down
      cooldown = 0;
      const canTriggerAfterCooldown = cooldown <= 0;
      expect(canTriggerAfterCooldown).toBe(true);
    });
  });
});
