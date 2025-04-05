
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<{ error: any | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent potential deadlocks
          setTimeout(async () => {
            await fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Error signing in:', error);
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      // Check if username is already taken
      if (userData?.username) {
        const { data: existingUsers, error: usernameCheckError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', userData.username)
          .limit(1);
          
        if (usernameCheckError) throw usernameCheckError;
        
        if (existingUsers && existingUsers.length > 0) {
          return { 
            error: { 
              message: "profiles_username_unique: Username is already taken" 
            } 
          };
        }
      }
      
      // Set up email confirmation with redirect to login page
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/login`
        },
      });
      
      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        toast({
          title: "Email already registered",
          description: "This email is already registered. Please login instead.",
          variant: "destructive",
        });
        return { error: { message: "Email already registered" } };
      }
      
      if (data?.user && !data.user.confirmed_at) {
        toast({
          title: "Signup Successful",
          description: "Please check your email to confirm your account.",
        });
        
        // Redirect to login page - user needs to verify email
        window.location.href = '/login?verification=pending';
      } else {
        toast({
          title: "Signup Successful",
          description: "Your account has been created successfully.",
        });
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "There was an error logging you out.",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (data: any) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Refresh profile data
      await fetchProfile(user.id);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
