'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseAuthService } from '@/services/supabaseAuthService';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SupabaseAuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isEmailVerified: boolean;
    signUp: (email: string, password: string, username: string) => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    resendVerification: (email: string) => Promise<any>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const authService = new SupabaseAuthService();

    useEffect(() => {
        // Don't initialize if Supabase is not configured
        if (!isSupabaseConfigured) {
            setIsLoading(false);
            return;
        }

        // Get initial session
        const getInitialSession = async () => {
            try {
                const { user: currentUser, session: currentSession } = await authService.getCurrentSession();
                setUser(currentUser);
                setSession(currentSession);
            } catch (error) {
                console.warn('Failed to get initial session:', error);
            } finally {
                setIsLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        try {
            const { data: { subscription } } = authService.onAuthStateChange((user, session) => {
                setUser(user);
                setSession(session);
                setIsLoading(false);
            });

            return () => subscription.unsubscribe();
        } catch (error) {
            console.warn('Failed to set up auth state listener:', error);
            setIsLoading(false);
        }
    }, []);

    const signUp = async (email: string, password: string, username: string) => {
        if (!isSupabaseConfigured) {
            return { user: null, session: null, error: { message: 'Supabase is not configured' } };
        }
        
        setIsLoading(true);
        try {
            const result = await authService.signUp(email, password, username);
            return result;
        } catch (error: any) {
            return { user: null, session: null, error: { message: error.message } };
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            return { user: null, session: null, error: { message: 'Supabase is not configured' } };
        }
        
        setIsLoading(true);
        try {
            const result = await authService.signIn(email, password);
            if (result.user && result.session) {
                // Successful login, redirect will happen via auth state change
            }
            return result;
        } catch (error: any) {
            return { user: null, session: null, error: { message: error.message } };
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        if (!isSupabaseConfigured) {
            return;
        }
        
        setIsLoading(true);
        try {
            await authService.signOut();
            router.push('/auth');
        } catch (error) {
            console.warn('Sign out failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resendVerification = async (email: string) => {
        if (!isSupabaseConfigured) {
            return { error: { message: 'Supabase is not configured' } };
        }
        
        try {
            return await authService.resendVerification(email);
        } catch (error: any) {
            return { error: { message: error.message } };
        }
    };

    const value = {
        isAuthenticated: !!session,
        user,
        session,
        isLoading,
        isEmailVerified: !!user?.email_confirmed_at,
        signUp,
        signIn,
        signOut,
        resendVerification
    };

    return (
        <SupabaseAuthContext.Provider value={value}>
            {children}
        </SupabaseAuthContext.Provider>
    );
}

export function useSupabaseAuth() {
    const context = useContext(SupabaseAuthContext);
    if (context === undefined) {
        throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
    }
    return context;
}