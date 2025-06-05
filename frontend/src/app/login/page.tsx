'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

export default function UnifiedAuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin, isAuthenticated } = useUnifiedAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Handle post-verification redirect
  useEffect(() => {
    const checkVerification = async () => {
      const verified = searchParams.get('verified');
      if (verified === 'true') {
        setMessage('Email verified successfully! You can now sign in.');
        setIsSignUp(false); // Switch to login mode
      }
    };

    checkVerification();
  }, [searchParams]);

  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>⚠️ Configuration Required</CardTitle>
            <CardDescription>
              Supabase credentials are required for authentication
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

    setIsLoading(true);

    try {
      const result = await unifiedAuthService.signUp(email, password, username);
      
      if (!result.success) {
        setError(result.error || 'Sign up failed');
      } else if (result.needsEmailVerification) {
        setPendingVerification(true);
        setVerificationEmail(email);
        setMessage(result.message || 'Please check your email and click the verification link');
      } else {
        setMessage('Account created successfully!');
        // Shouldn't happen in normal flow as email verification is required
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);

    try {
      const result = await unifiedAuthService.signIn(email, password);
      
      if (!result.success) {
        setError(result.error || 'Sign in failed');
      } else {
        setMessage('Signed in successfully! Redirecting...');
        // Update auth context with the login data
        if (result.data) {
          authLogin(result.data);
        }
        // The redirect will happen automatically via the useEffect when isAuthenticated becomes true
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const result = await unifiedAuthService.resendVerification(verificationEmail);
      if (result.error) {
        setError(result.error.message || 'Failed to resend verification');
      } else {
        setMessage('Verification email sent! Please check your inbox.');
      }
    } catch (err) {
      setError('Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  // Pending verification screen
  if (pendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>📧 Check Your Email</CardTitle>
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
                  setIsSignUp(false);
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
            {isSignUp ? '🎮 Create Your Account' : '👋 Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Sign up to start playing Hand of Fate' 
              : 'Sign in to continue your adventure'
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
                  placeholder="Choose a unique username"
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
              <Alert className="border-green-200 bg-green-50 text-green-800">
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
                // Don't clear email, but clear password and username
                setPassword('');
                if (!isSignUp) setUsername('');
              }}
            >
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : 'Need an account? Sign Up'
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}