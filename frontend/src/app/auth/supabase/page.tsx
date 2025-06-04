'use client';

import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function SupabaseAuthPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [pendingVerification, setPendingVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');

    const { signUp, signIn, isLoading, resendVerification, isAuthenticated, user } = useSupabaseAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Handle post-verification redirect
    useEffect(() => {
        const verified = searchParams.get('verified');
        if (verified === 'true' && isAuthenticated && user?.email_confirmed_at) {
            console.log('Email verified user detected, redirecting to main page');
            setMessage('Email verified successfully! Redirecting...');
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
    }, [searchParams, isAuthenticated, user, router]);

    // Show configuration message if Supabase is not set up
    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>⚠️ Supabase Not Configured</CardTitle>
                        <CardDescription>
                            Supabase credentials are required to test email verification
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <div className="space-y-2">
                                <p className="font-medium">To set up Supabase:</p>
                                <ol className="list-decimal list-inside text-sm space-y-1">
                                    <li>Create a project at <a href="https://supabase.com" target="_blank" className="text-blue-600 hover:underline">supabase.com</a></li>
                                    <li>Copy your Project URL and anon key</li>
                                    <li>Create <code className="bg-gray-100 px-1 rounded">.env.local</code> file in frontend/</li>
                                    <li>Add your credentials (see .env.local.example)</li>
                                </ol>
                            </div>
                        </Alert>
                        
                        <Button 
                            onClick={() => router.push('/auth')}
                            className="w-full"
                        >
                            ← Back to Nakama Auth
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!email || !password || !username) {
            setError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            const result = await signUp(email, password, username);
            
            if (result.error) {
                setError(result.error.message || 'Sign up failed');
            } else {
                // Check if user needs to verify email
                if (result.user && !result.user.email_confirmed_at) {
                    setPendingVerification(true);
                    setVerificationEmail(email);
                    setMessage('Please check your email and click the verification link to complete registration.');
                } else {
                    setMessage('Account created successfully!');
                    router.push('/game');
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            console.log('Attempting sign in with email:', email);
            const result = await signIn(email, password);
            console.log('Sign in result:', { 
                hasUser: !!result.user, 
                hasSession: !!result.session, 
                hasError: !!result.error,
                emailConfirmed: result.user?.email_confirmed_at 
            });
            
            if (result.error) {
                console.error('Sign in error:', result.error.message);
                setError(result.error.message || 'Sign in failed');
            } else if (result.user && result.session) {
                if (result.user.email_confirmed_at) {
                    console.log('User email is confirmed, redirecting to main page');
                    setMessage('Signed in successfully! Redirecting...');
                    // Use a longer delay to ensure auth state is fully updated
                    setTimeout(() => {
                        console.log('Executing redirect to main page');
                        router.push('/');
                    }, 1000);
                } else {
                    console.log('User email not confirmed yet');
                    setError('Please verify your email before signing in. Check your inbox for the verification link.');
                }
            } else {
                console.error('Sign in failed: no user or session returned');
                setError('Sign in failed - please try again');
            }
        } catch (err) {
            console.error('Sign in exception:', err);
            setError('An unexpected error occurred');
        }
    };

    const handleResendVerification = async () => {
        if (!verificationEmail) return;
        
        try {
            const result = await resendVerification(verificationEmail);
            if (result.error) {
                setError(result.error.message || 'Failed to resend verification');
            } else {
                setMessage('Verification email sent! Please check your inbox.');
            }
        } catch (err) {
            setError('Failed to resend verification email');
        }
    };

    if (pendingVerification) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Check Your Email</CardTitle>
                        <CardDescription>
                            We've sent a verification link to {verificationEmail}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {message && (
                            <Alert>
                                <p>{message}</p>
                            </Alert>
                        )}
                        
                        {error && (
                            <Alert className="border-red-200 bg-red-50 text-red-800">
                                <p>{error}</p>
                            </Alert>
                        )}

                        <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Didn't receive the email? Check your spam folder or resend it.
                            </p>
                            
                            <Button 
                                onClick={handleResendVerification}
                                variant="outline"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Resend Verification Email'}
                            </Button>

                            <Button 
                                onClick={() => {
                                    setPendingVerification(false);
                                    setVerificationEmail('');
                                    setEmail('');
                                    setPassword('');
                                    setUsername('');
                                }}
                                variant="ghost"
                            >
                                Back to Sign In
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </CardTitle>
                    <CardDescription>
                        {isSignUp 
                            ? 'Sign up for a new account with email verification' 
                            : 'Sign in to your verified account'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                        {isSignUp && (
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium mb-1">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    required={isSignUp}
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                required
                            />
                            {isSignUp && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Must be at least 6 characters
                                </p>
                            )}
                        </div>

                        {error && (
                            <Alert className="border-red-200 bg-red-50 text-red-800">
                                <p>{error}</p>
                            </Alert>
                        )}

                        {message && (
                            <Alert>
                                <p>{message}</p>
                            </Alert>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading 
                                ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                                : (isSignUp ? 'Create Account' : 'Sign In')
                            }
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                                setMessage('');
                                setEmail('');
                                setPassword('');
                                setUsername('');
                            }}
                        >
                            {isSignUp 
                                ? 'Already have an account? Sign In' 
                                : 'Need an account? Sign Up'
                            }
                        </Button>
                    </div>

                    <div className="mt-4 text-center">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/auth')}
                            className="text-sm"
                        >
                            ← Back to Nakama Auth
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}