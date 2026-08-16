'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { Sparkles, Shield, Mail, Lock, User, HelpCircle } from 'lucide-react';
import ParticleEffect from '@/components/effects/ParticleEffect';
import GameTutorial from '@/components/tutorial/GameTutorial';

function UnifiedAuthPageContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden flex items-center justify-center p-4">
        {/* Animated background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,80,200,0.3)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(80,120,200,0.3)_0%,transparent_50%)]"></div>
        </div>
        
        <ParticleEffect />
        
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-purple-500/30 shadow-2xl relative z-10">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-10 h-10 text-white" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl font-bold text-purple-100">Mystical Verification Required</CardTitle>
            <CardDescription className="text-purple-300/80">
              A magical link has been sent to {verificationEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert className="border-emerald-500/50 bg-emerald-900/20 text-emerald-300">
                <p>{message}</p>
              </Alert>
            )}
            
            {error && (
              <Alert className="border-red-500/50 bg-red-900/20 text-red-300">
                <p>{error}</p>
              </Alert>
            )}

            <div className="text-center space-y-4">
              <p className="text-sm text-purple-200/80">
                Haven't received the email? Check your spam folder or request another.
              </p>
              
              <button
                onClick={handleResendVerification}
                disabled={isLoading}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group bg-gradient-to-br from-purple-800/80 via-purple-700/80 to-purple-900/80 hover:from-purple-700/90 hover:via-purple-600/90 hover:to-purple-800/90 text-purple-100 border border-purple-500/50 shadow-lg shadow-purple-900/50"
              >
                <span className="relative z-10">
                  {isLoading ? 'Sending...' : 'Resend Verification Email'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <button
                onClick={() => {
                  setPendingVerification(false);
                  setVerificationEmail('');
                  setEmail('');
                  setPassword('');
                  setUsername('');
                  setIsSignUp(false);
                }}
                className="text-purple-300 hover:text-purple-100 transition-colors duration-200 text-sm font-medium"
              >
                Return to Portal Entrance
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Deep space background effect */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.15)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.15)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(217,70,239,0.1)_0%,transparent_70%)]"></div>
      </div>
      
      {/* Floating particles */}
      <ParticleEffect />
      
      {/* Mystical nebula effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Floating mystical cards */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-20 h-28 transform rotate-12 animate-float opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-amber-600/30 to-orange-700/30 rounded-lg border border-amber-400/30 shadow-lg shadow-amber-600/20">
            <div className="flex items-center justify-center h-full text-amber-400/50 text-3xl">☀️</div>
          </div>
        </div>
        <div className="absolute top-1/3 right-1/4 w-20 h-28 transform -rotate-12 animate-float opacity-20" style={{ animationDelay: '1s' }}>
          <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-indigo-700/30 rounded-lg border border-purple-400/30 shadow-lg shadow-purple-600/20">
            <div className="flex items-center justify-center h-full text-purple-400/50 text-3xl">⚡</div>
          </div>
        </div>
        <div className="absolute bottom-1/4 right-1/3 w-20 h-28 transform rotate-6 animate-float opacity-20" style={{ animationDelay: '2s' }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-600/30 to-blue-700/30 rounded-lg border border-cyan-400/30 shadow-lg shadow-cyan-600/20">
            <div className="flex items-center justify-center h-full text-cyan-400/50 text-3xl">✨</div>
          </div>
        </div>
        <div className="absolute bottom-1/3 left-1/3 w-20 h-28 transform -rotate-6 animate-float opacity-20" style={{ animationDelay: '1.5s' }}>
          <div className="w-full h-full bg-gradient-to-br from-emerald-600/30 to-green-700/30 rounded-lg border border-emerald-400/30 shadow-lg shadow-emerald-600/20">
            <div className="flex items-center justify-center h-full text-emerald-400/50 text-3xl">🍀</div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Mystical hand and cards animation */}
        <div className="relative mb-8">
          <div className="relative w-64 h-64 mx-auto">
            {/* Glowing hand silhouette */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl">
                  <div className="w-40 h-48 bg-gradient-to-t from-purple-600/60 to-blue-600/60 rounded-full transform scale-150 animate-pulse"></div>
                </div>
                <div className="absolute inset-0 blur-md">
                  <div className="w-36 h-44 bg-gradient-to-t from-purple-500/40 to-blue-500/40 rounded-full transform scale-125"></div>
                </div>
                <div className="relative text-8xl filter drop-shadow-2xl" style={{ 
                  textShadow: '0 0 40px rgba(139, 92, 246, 0.9), 0 0 80px rgba(139, 92, 246, 0.5), 0 0 120px rgba(139, 92, 246, 0.3)',
                  color: 'rgba(200, 180, 255, 0.95)',
                  animation: 'handGlow 3s ease-in-out infinite'
                }}>
                  ✋
                </div>
              </div>
            </div>
            
            {/* Orbiting cards around hand with magical trails */}
            <div className="absolute inset-0" style={{ animation: 'rotate 20s linear infinite' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-16 h-24">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-orange-600/20 blur-md animate-pulse"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-amber-700 to-orange-800 rounded-lg border-2 border-amber-500 shadow-2xl shadow-amber-600/70 transform hover:scale-110 transition-transform">
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-amber-400/20 rounded-lg"></div>
                    <div className="flex items-center justify-center h-full text-amber-300 text-2xl font-bold">☀️</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0" style={{ animation: 'rotate 20s linear infinite', animationDelay: '-6.66s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-16 h-24">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 blur-md animate-pulse"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-700 to-indigo-800 rounded-lg border-2 border-purple-500 shadow-2xl shadow-purple-600/70">
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-purple-400/20 rounded-lg"></div>
                    <div className="flex items-center justify-center h-full text-purple-300 text-2xl font-bold">🌙</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0" style={{ animation: 'rotate 20s linear infinite', animationDelay: '-13.33s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-16 h-24">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 blur-md animate-pulse"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-cyan-700 to-blue-800 rounded-lg border-2 border-cyan-500 shadow-2xl shadow-cyan-600/70">
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-cyan-400/20 rounded-lg"></div>
                    <div className="flex items-center justify-center h-full text-cyan-300 text-2xl font-bold">⭐</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-400 to-cyan-400 mb-2 tracking-wider">
              HAND OF FATE
            </h1>
            <p className="text-purple-200/80 text-lg">Embrace Your Mystical Destiny</p>
          </div>
        </div>
        
        <Card className="bg-black/40 backdrop-blur-xl border border-purple-500/30 shadow-2xl">
          <CardHeader className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent rounded-t-lg" />
            <CardTitle className="text-2xl font-bold text-purple-100 relative z-10">
              {isSignUp ? 'Begin Your Journey' : 'Return to the Realm'}
            </CardTitle>
            <CardDescription className="text-purple-300/80 relative z-10">
              {isSignUp 
                ? 'Create your destiny in the mystical realm' 
                : 'Your cards await your return'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              {isSignUp && (
                <div className="relative">
                  <label htmlFor="username" className="block text-sm font-medium mb-2 text-purple-200">
                    <User className="inline w-4 h-4 mr-1" aria-hidden="true" />
                    Username
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a unique username"
                      className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-purple-100 placeholder-purple-400/50 transition-all duration-200"
                      required={isSignUp}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-lg pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              )}

              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-purple-200">
                  <Mail className="inline w-4 h-4 mr-1" aria-hidden="true" />
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-purple-100 placeholder-purple-400/50 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-purple-200">
                  <Lock className="inline w-4 h-4 mr-1" aria-hidden="true" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUp ? "Minimum 6 characters" : "Enter your password"}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-purple-100 placeholder-purple-400/50 transition-all duration-200"
                    required
                  />
                </div>
                {isSignUp && (
                  <p className="text-xs text-purple-300/60 mt-2 flex items-center">
                    <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              {error && (
                <Alert className="border-red-500/50 bg-red-900/20 text-red-300">
                  <p>{error}</p>
                </Alert>
              )}

              {message && (
                <Alert className="border-emerald-500/50 bg-emerald-900/20 text-emerald-300">
                  <p>{message}</p>
                </Alert>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 text-white shadow-lg shadow-purple-900/50 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                  {isLoading 
                    ? (isSignUp ? 'Forging Your Destiny...' : 'Opening Portal...')
                    : (isSignUp ? 'Forge Your Destiny' : 'Enter the Realm')
                  }
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setMessage('');
                    setPassword('');
                    if (!isSignUp) setUsername('');
                  }}
                  className="text-purple-300 hover:text-purple-100 transition-colors duration-200 text-sm font-medium"
                >
                  {isSignUp 
                    ? 'Already have powers? Sign In to your realm' 
                    : 'New to this realm? Begin your mystical journey'
                  }
                </button>
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setShowTutorial(true)}
                  className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-100 transition-colors duration-200 text-sm font-medium"
                >
                  <HelpCircle className="w-4 h-4" />
                  How to Play
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tutorial Modal */}
      {showTutorial && (
        <GameTutorial onClose={() => setShowTutorial(false)} />
      )}
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes handGlow {
          0%, 100% { 
            filter: brightness(1) drop-shadow(0 0 40px rgba(139, 92, 246, 0.9));
          }
          50% { 
            filter: brightness(1.2) drop-shadow(0 0 60px rgba(139, 92, 246, 1));
          }
        }
      `}</style>
    </div>
  );
}

export default function UnifiedAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 flex items-center justify-center">
        <div className="text-purple-100 text-xl">Loading...</div>
      </div>
    }>
      <UnifiedAuthPageContent />
    </Suspense>
  );
}