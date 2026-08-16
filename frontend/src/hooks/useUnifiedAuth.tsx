'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { unifiedAuthService, UnifiedAuthResponse } from '@/services/unifiedAuthService';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

interface UnifiedAuthContextType {
    isAuthenticated: boolean;
    user: {
        playerId: string;
        username: string;
        nakamaUserId?: string;
        nakamaToken?: string;
    } | null;
    supabaseUser: User | null;
    login: (authData: UnifiedAuthResponse) => void;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UnifiedAuthContextType['user']>(null);
    const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already authenticated on mount
        const checkAuth = async () => {
            try {
                // First check Supabase session
                const { user: sbUser, session } = await unifiedAuthService.getCurrentSession();
                
                if (sbUser && session && sbUser.email_confirmed_at) {
                    setSupabaseUser(sbUser);
                    
                    // Get stored Nakama auth data
                    const storedAuth = unifiedAuthService.getStoredAuthData();
                    
                    if (storedAuth && storedAuth.playerId) {
                        // Validate Nakama token if present
                        if (storedAuth.token) {
                            const validationResult = await unifiedAuthService.validateNakamaToken(storedAuth.token);
                            
                            if (validationResult.isSuccess) {
                                setIsAuthenticated(true);
                                setUser({
                                    playerId: storedAuth.playerId,
                                    username: storedAuth.username || '',
                                    nakamaUserId: storedAuth.userId,
                                    nakamaToken: storedAuth.token
                                });
                            } else {
                                // Nakama token invalid, try to get new one
                                const loginResult = await unifiedAuthService.loginToBackend(sbUser);
                                if (loginResult.isSuccess) {
                                    login(loginResult);
                                }
                            }
                        } else {
                            // No Nakama token, just set basic user info
                            setIsAuthenticated(true);
                            setUser({
                                playerId: storedAuth.playerId,
                                username: storedAuth.username || ''
                            });
                        }
                    } else {
                        // No stored auth data, but we have a verified Supabase user
                        // Don't auto-sync here - let the user login manually
                        // This prevents multiple sync attempts
                        console.log('Verified Supabase user found but no game session - user needs to login');
                    }
                }
            } catch (error) {
                console.error('Auth check error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();

        // Listen for Supabase auth changes
        const { data: { subscription } } = unifiedAuthService.onAuthStateChange((user) => {
            setSupabaseUser(user);
            if (!user) {
                // User signed out
                setIsAuthenticated(false);
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = (authData: UnifiedAuthResponse) => {
        if (authData.isSuccess && authData.playerId) {
            unifiedAuthService.storeAuthData(authData);
            setIsAuthenticated(true);
            setUser({
                playerId: authData.playerId,
                username: authData.username || '',
                nakamaUserId: authData.userId,
                nakamaToken: authData.token
            });
        }
    };

    const logout = async () => {
        await unifiedAuthService.signOut();
        setIsAuthenticated(false);
        setUser(null);
        setSupabaseUser(null);
        router.push('/login');
    };

    return (
        <UnifiedAuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            supabaseUser,
            login, 
            logout, 
            isLoading 
        }}>
            {children}
        </UnifiedAuthContext.Provider>
    );
}

export function useUnifiedAuth() {
    const context = useContext(UnifiedAuthContext);
    if (context === undefined) {
        throw new Error('useUnifiedAuth must be used within an UnifiedAuthProvider');
    }
    return context;
}