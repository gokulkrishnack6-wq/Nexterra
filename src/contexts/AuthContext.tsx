import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_PROFILES } from '../lib/mockData';

interface AuthContextType {
  currentUser: UserProfile;
  allDemoUsers: UserProfile[];
  switchUser: (userId: string) => void;
  updateProfile: (updatedData: Partial<UserProfile>) => void;
  registerUser: (name: string, email: string, role: UserRole, district: string) => Promise<void>;
  loginUser: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'greenloop_current_user_id';
const STORAGE_KEY_PROFILES = 'greenloop_user_profiles';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved profiles', e);
      }
    }
    return INITIAL_PROFILES;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_USER);
    if (savedId && INITIAL_PROFILES.some(u => u.id === savedId)) {
      return savedId;
    }
    return INITIAL_PROFILES[0].id; // Default: Gokul Krishna (Individual)
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, currentUserId);
  }, [currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const switchUser = (userId: string) => {
    const exists = users.find((u) => u.id === userId);
    if (exists) {
      setCurrentUserId(userId);
    }
  };

  const updateProfile = (updatedData: Partial<UserProfile>) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === currentUserId
          ? { ...user, ...updatedData, updated_at: new Date().toISOString() }
          : user
      )
    );
  };

  const registerUser = async (
    name: string,
    email: string,
    role: UserRole,
    district: string
  ) => {
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      full_name: name,
      email,
      role,
      district,
      state: 'Kerala',
      latitude: 10.9760,
      longitude: 76.2254,
      eco_points_balance: 100, // Welcome Bonus
      is_verified: role === 'individual',
      created_at: new Date().toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    };

    setUsers((prev) => [newUser, ...prev]);
    setCurrentUserId(newUser.id);
  };

  const loginUser = async (email: string): Promise<boolean> => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUserId(found.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    // Reset to default guest/first profile
    setCurrentUserId(INITIAL_PROFILES[0].id);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allDemoUsers: users,
        switchUser,
        updateProfile,
        registerUser,
        loginUser,
        logout,
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

