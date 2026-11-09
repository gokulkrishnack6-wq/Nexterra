import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from '../lib/supabase';

export interface RegisterResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  isEmailUnconfirmed?: boolean;
  email?: string;
  error?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  registerUser: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    district: string,
    whatsappNumber?: string,
    shareWhatsappWithExchange?: boolean
  ) => Promise<RegisterResult>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role?: UserRole,
    district?: string,
    whatsappNumber?: string,
    shareWhatsappWithExchange?: boolean
  ) => Promise<RegisterResult>;
  loginUser: (email: string, password: string) => Promise<LoginResult>;
  signIn: (email: string, password: string) => Promise<LoginResult>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_PROFILE_KEY = 'greenloop_auth_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore corrupted profile
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Sync current user to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (currentUser) {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      }
    }
  }, [currentUser]);

  async function fetchAndSetProfile(user: any) {
    try {
      if (!isSupabaseConfigured || !supabase) return;

      const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
      const metadata = user.user_metadata || {};

      // 1. Try querying the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        const verified = isEmailConfirmed || Boolean(profileData.is_verified);

        // Canonical resolution: check database column first, fall back to auth user metadata
        const dbWa = profileData.whatsapp_number ? String(profileData.whatsapp_number).trim() : null;
        const metaWa = metadata.whatsapp_number ? String(metadata.whatsapp_number).trim() : null;
        const resolvedWa = dbWa || metaWa || undefined;

        // Consent resolution: check database column first, fall back to metadata, default false
        const dbShareWa = profileData.share_whatsapp_with_exchange;
        const metaShareWa = metadata.share_whatsapp_with_exchange;
        const resolvedShareWa = typeof dbShareWa === 'boolean'
          ? dbShareWa
          : typeof metaShareWa === 'boolean'
            ? metaShareWa
            : false;

        const updatedProfile: UserProfile = {
          ...(profileData as UserProfile),
          whatsapp_number: resolvedWa,
          share_whatsapp_with_exchange: resolvedShareWa,
          is_verified: verified,
        };

        // Self-healing synchronization: if auth metadata has the WhatsApp number but the profiles row lacks it,
        // persist it to public.profiles immediately so it stays authoritative and persistent.
        if (!dbWa && metaWa) {
          try {
            await supabase.from('profiles').update({
              whatsapp_number: metaWa,
              share_whatsapp_with_exchange: resolvedShareWa,
              updated_at: new Date().toISOString(),
            }).eq('id', user.id);
          } catch (syncErr: any) {
            console.warn('Auto-syncing metadata WhatsApp number to profiles row:', syncErr);
          }
        }

        // If email is confirmed in Auth but not yet marked in public.profiles table, sync it
        if (verified && !profileData.is_verified) {
          try {
            await supabase.from('profiles').update({ is_verified: true }).eq('id', user.id);
          } catch {
            // ignore non-critical table write errors
          }
        }

        setCurrentUser(updatedProfile);
        setLoading(false);
        return;
      }

      // 2. If no record in profiles table yet, assemble from Supabase user metadata
      const generatedProfile: UserProfile = {
        id: user.id,
        full_name: metadata.full_name || user.email?.split('@')[0] || 'Member',
        email: user.email || '',
        phone: user.phone || metadata.phone || '',
        whatsapp_number: metadata.whatsapp_number || undefined,
        share_whatsapp_with_exchange: metadata.share_whatsapp_with_exchange ?? false,
        role: (metadata.role as UserRole) || 'individual',
        district: metadata.district || '',
        state: metadata.state || 'Kerala',
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        avatar_url: metadata.avatar_url || undefined,
        bio: metadata.bio || '',
        eco_points_balance: 50,
        is_verified: isEmailConfirmed,
        created_at: user.created_at || new Date().toISOString(),
      };

      setCurrentUser(generatedProfile);

      // Attempt to save to public.profiles table if possible
      if (!profileError) {
        try {
          const { error: upsertErr } = await supabase.from('profiles').upsert(generatedProfile);
          if (upsertErr) {
            console.warn('Profile upsert notice:', upsertErr.message);
          }
        } catch (tableErr) {
          console.warn('Profile upsert exception:', tableErr);
        }
      }
    } catch (e) {
      console.warn('Error syncing profile:', e);
    } finally {
      setLoading(false);
    }
  }

  // Load and sync authenticated user from Supabase
  useEffect(() => {
    let isMounted = true;

    async function loadUserSession() {
      try {
        if (!isSupabaseConfigured || !supabase) {
          if (isMounted) setLoading(false);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('Supabase getSession error:', sessionError.message);
        }

        if (session?.user) {
          await fetchAndSetProfile(session.user);
        } else {
          if (isMounted) {
            setCurrentUser(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('Error loading auth session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserSession();

    // Listen for auth state changes (login, logout, token refresh, email verification)
    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            if (session?.user) {
              await fetchAndSetProfile(session.user);
            }
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setLoading(false);
          }
        }
      );

      return () => {
        isMounted = false;
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  const refreshSession = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // Use getUser() to fetch freshly verified user state directly from Supabase auth servers
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        await fetchAndSetProfile(user);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchAndSetProfile(session.user);
        }
      }
    } catch {
      // ignore
    }
  };

  /**
   * User Registration with Canonical Email Redirect Configuration
   */
  const registerUser = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    district: string,
    whatsappNumber?: string,
    shareWhatsappWithExchange?: boolean
  ): Promise<RegisterResult> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured. Please check your credentials.' };
    }

    try {
      const cleanEmail = email.trim();
      const redirectUrl = getAuthRedirectUrl('/auth/callback');

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name,
            role,
            district,
            state: 'Kerala',
            whatsapp_number: whatsappNumber ? whatsappNumber.trim() : undefined,
            share_whatsapp_with_exchange: Boolean(shareWhatsappWithExchange),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || (error as any).status === 429) {
          return {
            success: false,
            error: 'Email confirmation rate limit reached (Supabase allows ~3 emails/hr on free tier). Please wait a few minutes before registering again or sign in with an existing account.',
          };
        }
        return { success: false, error: error.message };
      }

      // Check for existing account (Supabase returns empty identities array when user enumeration protection is enabled)
      if (data.user?.identities && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in or reset your password.',
        };
      }

      // If Supabase created a session immediately (e.g. email confirmations turned off)
      if (data.session && data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          full_name: name,
          email: cleanEmail,
          role,
          district: district || '',
          state: 'Kerala',
          whatsapp_number: whatsappNumber ? whatsappNumber.trim() : undefined,
          share_whatsapp_with_exchange: Boolean(shareWhatsappWithExchange),
          latitude: undefined,
          longitude: undefined,
          eco_points_balance: 50,
          is_verified: true,
          created_at: new Date().toISOString(),
        };

        setCurrentUser(newProfile);

        try {
          const { error: upsertErr } = await supabase.from('profiles').upsert(newProfile);
          if (upsertErr) {
            console.warn('Profile upsert notice on signup:', upsertErr.message);
          }
        } catch (tableErr: any) {
          console.warn('Profile upsert exception on signup:', tableErr);
        }

        return {
          success: true,
          requiresEmailConfirmation: false,
          email: cleanEmail,
        };
      }

      // When email confirmation is required, data.session is null.
      // An unverified account MUST NOT be treated as authenticated.
      return {
        success: true,
        requiresEmailConfirmation: true,
        email: cleanEmail,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  /**
   * User Sign-In with Unconfirmed Account Detection
   */
  const loginUser = async (email: string, password: string): Promise<LoginResult> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    const cleanEmail = email.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message?.toLowerCase() || '';
        const isUnconfirmed =
          msg.includes('email not confirmed') ||
          msg.includes('not confirmed') ||
          (error as any).code === 'email_not_confirmed';

        if (isUnconfirmed) {
          return {
            success: false,
            error: 'Your email address has not been confirmed yet. Please check your inbox or request a new confirmation email below.',
            isEmailUnconfirmed: true,
            email: cleanEmail,
          };
        }

        return { success: false, error: error.message };
      }

      if (data.user) {
        await fetchAndSetProfile(data.user);
      }

      return { success: true, email: cleanEmail };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  /**
   * Resend Email Confirmation Link
   */
  const resendConfirmation = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    try {
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || (error as any).status === 429) {
          return {
            success: false,
            error: 'Email confirmation rate limit reached (Supabase allows ~3 emails/hr on free tier). Please wait a few minutes before registering again or sign in with an existing account.',
          };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to resend confirmation email.' };
    }
  };

  /**
   * Password Reset with Environment-Aware Redirect
   */
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }

    try {
      const redirectUrl = getAuthRedirectUrl('/login?mode=reset_password');
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || (error as any).status === 429) {
          return {
            success: false,
            error: 'Email confirmation rate limit reached (Supabase allows ~3 emails/hr on free tier). Please wait a few minutes before registering again or sign in with an existing account.',
          };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset request failed.' };
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setCurrentUser(null);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      }
    }
  };

  const updateProfile = async (updatedData: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
      const newProfile: UserProfile = {
        ...currentUser,
        ...updatedData,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        // 1. Keep auth.users raw_user_meta_data synchronized with WhatsApp & profile changes
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: {
            full_name: newProfile.full_name,
            role: newProfile.role,
            district: newProfile.district,
            bio: newProfile.bio,
            avatar_url: newProfile.avatar_url,
            phone: newProfile.phone,
            phone_number: newProfile.phone,
            whatsapp_number: newProfile.whatsapp_number,
            share_phone_with_exchange: newProfile.share_phone_with_exchange,
            share_whatsapp_with_exchange: newProfile.share_whatsapp_with_exchange,
          },
        });

        if (authUpdateError) {
          console.warn('Auth user metadata update notice:', authUpdateError.message);
        }

        // 2. Persist to authoritative public.profiles row
        // Exclude server-controlled columns (eco_points_balance, id, created_at) from direct client updates
        const { eco_points_balance, id, created_at, ...safeUpdateData } = updatedData as any;
        safeUpdateData.updated_at = new Date().toISOString();

        if (Object.keys(safeUpdateData).length > 0) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update(safeUpdateData)
            .eq('id', currentUser.id);

          if (profileUpdateError) {
            console.error('Error updating public.profiles row:', profileUpdateError);
            return { success: false, error: profileUpdateError.message || 'Failed to update profile in database' };
          }
        }
      }

      // Update state and localStorage
      setCurrentUser(newProfile);
      return { success: true };
    } catch (err: any) {
      console.error('updateProfile exception:', err);
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  const uploadAvatar = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
      if (isSupabaseConfigured && supabase) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${currentUser.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (data?.publicUrl) {
            await updateProfile({ avatar_url: data.publicUrl });
            return { success: true, url: data.publicUrl };
          }
        }
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Url = e.target?.result as string;
          await updateProfile({ avatar_url: base64Url });
          resolve({ success: true, url: base64Url });
        };
        reader.onerror = () => {
          resolve({ success: false, error: 'Failed to read image file' });
        };
        reader.readAsDataURL(file);
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Upload failed' };
    }
  };

  const signIn = async (email: string, password: string) => loginUser(email, password);

  const signUp = async (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole = 'individual', 
    district: string = '',
    whatsappNumber?: string,
    shareWhatsappWithExchange?: boolean
  ) => registerUser(name, email, password, role, district, whatsappNumber, shareWhatsappWithExchange);

  const signOut = logout;

  const contextValue = React.useMemo<AuthContextType>(
    () => ({
      currentUser,
      loading,
      isAuthenticated: Boolean(currentUser),
      updateProfile,
      uploadAvatar,
      registerUser,
      signUp,
      loginUser,
      signIn,
      resetPassword,
      resendConfirmation,
      refreshSession,
      logout,
      signOut,
    }),
    [currentUser, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
