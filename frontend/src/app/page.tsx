// src/app/page.tsx
'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
// import Leaderboard from '@/components/leaderboard/Leaderboard'

export default function Home() {
  const { isAuthenticated, user, logout, isLoading } = useUnifiedAuth();
  const router = useRouter();

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
      <div className="min-h-screen flex flex-col p-8">
        {/* Header with user info and logout */}
        <header className="flex justify-between items-center mb-8 max-w-4xl w-full mx-auto">
          <div>
            <h2 className="text-xl font-semibold">Welcome, {user?.username}!</h2>
            <p className="text-sm text-muted-foreground">Player ID: {user?.playerId}</p>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-1">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Queen&apos;s Blood</h1>
            <p className="text-lg text-muted-foreground">
              A strategic card placement game
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Main Content */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Start Playing</CardTitle>
                  <CardDescription>
                    Choose your mode to begin the game
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Link href="/game">
                    <Button size="lg">
                      Start New Game
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg">
                    Practice Mode
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How to Play</CardTitle>
                  <CardDescription>
                    Learn the rules and strategies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Place cards strategically on a 3x5 grid</li>
                    <li>Each card has a power value</li>
                    <li>Score the most points by placing cards strategically</li>
                    <li>Cards must be placed adjacent to your existing cards</li>
                  </ul>
                </CardContent>
              </Card>

              {/* User Stats Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
                  <CardDescription>
                    Your gaming statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Games Played</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">0</div>
                      <div className="text-sm text-muted-foreground">Total Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
  )
}
