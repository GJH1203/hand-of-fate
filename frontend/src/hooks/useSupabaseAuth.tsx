'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { SupabaseAuthService } from '@/services/supabaseAuthService';
import { UserSyncService } from '@/services/userSyncService';
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
    const userSyncService = new UserSyncService();
    const syncingUsersRef = useRef<Map<string, Promise<any>>>(new Map());

    const syncUserIfNeeded = async (user: User, session: Session) => {
        const existingSync = syncingUsersRef.current.get(user.id);
        if (existingSync) {
            console.log('Sync already in progress for user:', user.id, 'waiting for completion...');
            try {
                await existingSync;
            } catch (error) {
                console.error('Previous sync failed:', error);
            }
            return;
        }
        
        console.log('Starting new sync for user:', user.id);
        
        const syncPromise = (async () => {
            try {
                const backendPlayer = await userSyncService.syncUserWithBackend(user);
                if (!backendPlayer) {
                    console.error('Failed to sync user with backend - no player returned');
                } else {
                    console.log('Successfully synced user with backend:', backendPlayer);
                    
                    // Also integrate with Nakama if not already done
                    try {
                        console.log('Attempting to integrate with Nakama...');
                        const nakamaResult = await userSyncService.integrateWithNakama(user);
                        console.log('Nakama integration result:', nakamaResult);
                    } catch (nakamaError) {
                        console.warn('Nakama integration failed (this is optional):', nakamaError);
                        // Don't throw here as Nakama integration is optional
                    }
                }
            } catch (error) {
                console.error('Failed to sync user with backend:', error);
                throw error;
            } finally {
                syncingUsersRef.current.delete(user.id);
            }
        })();
        
        syncingUsersRef.current.set(user.id, syncPromise);
        
        try {
            await syncPromise;
            console.log('Backend sync completed successfully');
        } catch (error) {
            console.error('Backend sync failed:', error);
            // Don't prevent auth from working even if backend sync fails
        }
    };

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
                console.log('Initial session check:', {
                    hasUser: !!currentUser,
                    hasSession: !!currentSession,
                    userId: currentUser?.id,
                    emailConfirmed: currentUser?.email_confirmed_at
                });
                setUser(currentUser);
                setSession(currentSession);
                
                // If there's a user with confirmed email, trigger sync
                if (currentUser && currentUser.email_confirmed_at && currentSession) {
                    console.log('Found existing verified user session, will sync with backend');
                    await syncUserIfNeeded(currentUser, currentSession);
                }
            } catch (error) {
                console.warn('Failed to get initial session:', error);
            } finally {
                setIsLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        try {
            const { data: { subscription } } = authService.onAuthStateChange(async (user, session) => {
                console.log('Auth state change:', { 
                    userId: user?.id, 
                    emailConfirmed: user?.email_confirmed_at, 
                    sessionExists: !!session,
                    currentPath: window.location.pathname
                });
                
                setUser(user);
                setSession(session);
                
                // If user is signed in and email is verified, sync with backend
                if (user && user.email_confirmed_at && session) {
                    console.log('User authenticated with verified email, triggering sync');
                    await syncUserIfNeeded(user, session);
                }
                
                setIsLoading(false);
                console.log('Auth state change complete, isLoading set to false');
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