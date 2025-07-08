// src/app/page.tsx
'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sparkles, Trophy, Swords, ScrollText, LogOut, Star, Zap, Shield, BookOpen } from 'lucide-react'
import { playerService } from '@/services/playerService'
import GuidedTutorial from '@/components/tutorial/GuidedTutorial'

export default function Home() {
  const { isAuthenticated, user, logout, isLoading } = useUnifiedAuth();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [playerData, setPlayerData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    console.log('Main page auth check:', {
      isAuthenticated,
      isLoading,
      user
    });
    
    if (!isLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login page');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, user]);

  // Fetch player data when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.playerId) {
      const fetchPlayerData = async () => {
        try {
          setLoadingStats(true);
          const data = await playerService.getPlayer(user.playerId);
          console.log('Fetched player data:', data);
          setPlayerData(data);
        } catch (error) {
          console.error('Failed to fetch player data:', error);
        } finally {
          setLoadingStats(false);
        }
      };
      fetchPlayerData();
    }
  }, [isAuthenticated, user?.playerId]);

  // Check onboarding status when authenticated (simplified)
  useEffect(() => {
    if (isAuthenticated && user?.playerId && needsOnboarding === null) {
      // For now, check if user has completed tutorial via localStorage
      const hasCompletedTutorial = localStorage.getItem(`tutorial_completed_${user.playerId}`);
      const needsTutorial = !hasCompletedTutorial;
      
      setNeedsOnboarding(needsTutorial);
      if (needsTutorial) {
        setShowTutorial(true);
      }
    }
  }, [isAuthenticated, user?.playerId, needsOnboarding]);

  // Tutorial completion handlers
  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setNeedsOnboarding(false);
    // Mark tutorial as completed in localStorage
    if (user?.playerId) {
      localStorage.setItem(`tutorial_completed_${user.playerId}`, 'true');
    }
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
    setNeedsOnboarding(false);
    // Also mark as completed when skipped
    if (user?.playerId) {
      localStorage.setItem(`tutorial_completed_${user.playerId}`, 'true');
    }
  };

  const handleRedoTutorial = async () => {
    if (user?.playerId) {
      // Remove completion flag and restart tutorial
      localStorage.removeItem(`tutorial_completed_${user.playerId}`);
      setShowTutorial(true);
      setNeedsOnboarding(true);
    }
  };

  // Track mouse for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-lg font-medium text-purple-300 animate-pulse">Awakening the magic...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show tutorial if user needs onboarding
  if (showTutorial && user?.playerId) {
    return (
      <GuidedTutorial
        playerId={user.playerId}
        playerName={user.username || 'Apprentice'}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
    );
  }

  // Use fetched player data for stats
  const userStats = {
    gamesPlayed: playerData?.gamesPlayed || 0,
    wins: playerData?.wins || 0,
    lifetimeScore: playerData?.lifetimeScore || 0,
    rank: playerData?.rank || 'Apprentice',
    winRate: playerData?.gamesPlayed ? Math.round((playerData?.wins / playerData?.gamesPlayed) * 100) : 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 20}s`
            }}
          >
            <div className="w-1 h-1 bg-purple-400 rounded-full opacity-60 blur-sm" />
          </div>
        ))}
      </div>

      {/* Magical mist overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-purple-900/50 via-transparent to-blue-900/50"
        style={{
          transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`
        }}
      />

      {/* Mystical orb effects */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with mystical styling */}
        <header className="bg-black/20 backdrop-blur-md border-b border-purple-500/20">
          <div className="flex justify-between items-center p-6 max-w-7xl w-full mx-auto">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  {user?.username}
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-900/50 text-purple-300 border-purple-500/50">
                    {userStats.rank}
                  </Badge>
                  <span className="text-sm text-gray-400">ID: {user?.playerId?.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRedoTutorial}
                className="bg-blue-900/20 hover:bg-blue-800/30 border-blue-500/50 text-blue-300 hover:text-blue-200 transition-all duration-300"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Redo Tutorial
              </Button>
              <Button 
                variant="outline" 
                onClick={logout}
                className="bg-red-900/20 hover:bg-red-800/30 border-red-500/50 text-red-300 hover:text-red-200 transition-all duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl w-full">
            {/* Title Section with magical effects */}
            <div className="text-center mb-12 relative">
              <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-lg">
                Hand of Fate
              </h1>
              <p className="text-xl text-purple-200 font-light">
                Master the arcane arts of strategic card placement
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Stats Card - Magical Tome Style */}
              <Card className="md:col-span-1 bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:border-purple-400">
                <CardHeader className="border-b border-purple-500/30">
                  <CardTitle className="flex items-center gap-2 text-yellow-400">
                    <Trophy className="w-5 h-5" />
                    Mystic Records
                  </CardTitle>
                  <CardDescription className="text-purple-300">
                    Your journey through the realms
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative">
                      {/* Mystical glow effect */}
                      <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" />
                      <div className="relative bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-2xl p-8 border-2 border-yellow-600/50 shadow-2xl">
                        <div className="text-center">
                          <div className="text-sm text-yellow-200 mb-2 uppercase tracking-wider">Power Score</div>
                          <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                            {loadingStats ? (
                              <div className="animate-pulse">...</div>
                            ) : (
                              userStats.lifetimeScore
                            )}
                          </div>
                          <div className="mt-2 text-xs text-yellow-300/70">
                            Mystical energy accumulated
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 text-center text-sm text-purple-300/70 max-w-xs">
                      Your power grows with each battle. Harness the mystical forces to climb the eternal rankings.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Actions - Portal Style */}
              <Card className="md:col-span-2 bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50 shadow-2xl">
              <CardHeader className="border-b border-purple-500/30">
                <CardTitle className="flex items-center gap-2 text-yellow-400">
                  <Sparkles className="w-5 h-5" />
                  Enter the Arena
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Choose your path to glory
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Link href="/game" className="group">
                    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-800/50 to-blue-800/50 p-6 border border-purple-500/50 hover:border-purple-400 transition-all duration-300 h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative z-10">
                        <Swords className="w-12 h-12 text-purple-300 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Battle Mode</h3>
                        <p className="text-purple-200 text-sm">
                          Challenge opponents in mystical card duels
                        </p>
                        <div className="mt-4 flex items-center text-purple-300 group-hover:text-purple-200">
                          <span className="text-sm font-medium">Enter Battle</span>
                          <Zap className="w-4 h-4 ml-2 group-hover:animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="group cursor-not-allowed opacity-75">
                    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-800/50 to-gray-700/50 p-6 border border-gray-600/50 h-full">
                      <div className="relative z-10">
                        <ScrollText className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">Campaign Mode</h3>
                        <p className="text-gray-400 text-sm">
                          Uncover ancient secrets and master new spells
                        </p>
                        <div className="mt-4 flex items-center text-gray-500">
                          <span className="text-sm font-medium">Coming Soon</span>
                          <Star className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

              {/* Game Rules - Spell Book Style */}
              <Card className="md:col-span-3 bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50 shadow-2xl">
                <CardHeader className="border-b border-purple-500/30">
                  <CardTitle className="flex items-center gap-2 text-yellow-400">
                    <ScrollText className="w-5 h-5" />
                    Ancient Rules of Engagement
                  </CardTitle>
                  <CardDescription className="text-purple-300">
                    Master these sacred principles
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-purple-300 font-semibold flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        Basic Principles
                      </h4>
                      <ul className="space-y-2 text-gray-300 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">◈</span>
                          Command a mystical 3x5 grid battlefield
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">◈</span>
                          Each card channels unique power values
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">◈</span>
                          Cards must be placed adjacent to your summoned allies
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-purple-300 font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Victory Conditions
                      </h4>
                      <ul className="space-y-2 text-gray-300 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">◈</span>
                          Control the most columns to claim victory
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">◈</span>
                          Each column's power determines its master
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">◈</span>
                          Strategic placement unleashes true power
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}