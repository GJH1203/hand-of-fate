'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse } from '@/services/authService';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    isAuthenticated: boolean;
    user: {
        playerId: string;
        username: string;
        userId: string;
    } | null;
    login: (authData: AuthResponse) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthContextType['user']>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already authenticated on mount
        const checkAuth = async () => {
            const storedAuth = authService.getStoredAuthData();
            
            if (storedAuth && storedAuth.token) {
                // Validate the stored token
                const validationResult = await authService.validateToken(storedAuth.token);
                
                if (validationResult.isSuccess) {
                    setIsAuthenticated(true);
                    setUser({
                        playerId: validationResult.playerId,
                        username: validationResult.username,
                        userId: validationResult.userId
                    });
                } else {
                    // Token is invalid, clear auth data
                    authService.clearAuthData();
                }
            }
            
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = (authData: AuthResponse) => {
        if (authData.isSuccess) {
            authService.saveAuthData(authData);
            setIsAuthenticated(true);
            setUser({
                playerId: authData.playerId,
                username: authData.username,
                userId: authData.userId
            });
        }
    };

    const logout = () => {
        authService.clearAuthData();
        setIsAuthenticated(false);
        setUser(null);
        router.push('/auth');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}