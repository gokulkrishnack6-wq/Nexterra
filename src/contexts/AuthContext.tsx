import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  registerUser: (name: string, email: string, password: string, role: UserRole, district: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, role?: UserRole, district?: string) => Promise<{ success: boolean; error?: string }>;
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_PROFILE_KEY = 'greenloop_auth_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Sync current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    }
  }, [currentUser]);

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

    // Listen for auth state changes (login, logout, token refresh)
    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            await fetchAndSetProfile(session.user);
          } else {
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

  async function fetchAndSetProfile(user: any) {
    try {
      // 1. Try querying the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setCurrentUser(profileData as UserProfile);
        setLoading(false);
        return;
      }

      // 2. If no record in profiles table yet (e.g. fresh signup or table pending migration),
      // assemble from Supabase user metadata
      const metadata = user.user_metadata || {};
      const generatedProfile: UserProfile = {
        id: user.id,
        full_name: metadata.full_name || user.email?.split('@')[0] || 'Member',
        email: user.email || '',
        phone: user.phone || metadata.phone || '',
        role: (metadata.role as UserRole) || 'individual',
        district: metadata.district || 'Ernakulam',
        state: 'Kerala',
        latitude: metadata.latitude || 9.9816,
        longitude: metadata.longitude || 76.2999,
        avatar_url: metadata.avatar_url || undefined,
        bio: metadata.bio || '',
        eco_points_balance: 0,
        is_verified: false,
        created_at: user.created_at || new Date().toISOString(),
      };

      setCurrentUser(generatedProfile);

      // Attempt to save to public.profiles table if it exists
      if (!profileError) {
        await supabase.from('profiles').upsert(generatedProfile);
      }
    } catch (e) {
      console.warn('Error syncing profile:', e);
    } finally {
      setLoading(false);
    }
  }

  const registerUser = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    district: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured. Please check your credentials.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role,
            district,
            state: 'Kerala',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          full_name: name,
          email,
          role,
          district,
          state: 'Kerala',
          latitude: 9.9816,
          longitude: 76.2999,
          eco_points_balance: 50, // Welcome points
          is_verified: false,
          created_at: new Date().toISOString(),
        };

        setCurrentUser(newProfile);

        // Try inserting into profiles table
        try {
          await supabase.from('profiles').insert(newProfile);
        } catch (e) {
          // table might be pending migration
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const loginUser = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await fetchAndSetProfile(data.user);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
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
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
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

      setCurrentUser(newProfile);

      if (isSupabaseConfigured && supabase) {
        // Update user metadata in Supabase Auth
        await supabase.auth.updateUser({
          data: {
            full_name: newProfile.full_name,
            role: newProfile.role,
            district: newProfile.district,
            bio: newProfile.bio,
            avatar_url: newProfile.avatar_url,
          },
        });

        // Try updating profiles table
        await supabase.from('profiles').update(updatedData).eq('id', currentUser.id);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  const uploadAvatar = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
      // 1. Try uploading to Supabase Storage 'avatars' bucket
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

      // 2. Fallback to local base64 reader if storage bucket is not created yet
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

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset request failed.' };
    }
  };

  const signIn = async (email: string, password: string) => loginUser(email, password);

  const signUp = async (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole = 'individual', 
    district: string = 'Ernakulam'
  ) => registerUser(name, email, password, role, district);

  const signOut = logout;

  return (
    <AuthContext.Provider
      value={{
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
        logout,
        signOut,
      }}
    >
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
