'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GameMode } from '@/types/gameMode';
import { Users, Globe, Zap, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { onlineGameService, ActiveGame } from '@/services/onlineGameService';

interface GameModeSelectionProps {
  onModeSelect: (mode: GameMode, matchId?: string) => void;
}

export default function GameModeSelection({ onModeSelect }: GameModeSelectionProps) {
  const { user } = useUnifiedAuth();
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [matchId, setMatchId] = useState('');
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [checkingActiveGame, setCheckingActiveGame] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Check for active games when component mounts
  useEffect(() => {
    if (user?.playerId) {
      checkForActiveGame();
    }
  }, [user]);

  const checkForActiveGame = async () => {
    if (!user?.playerId) return;
    
    setCheckingActiveGame(true);
    try {
      const result = await onlineGameService.checkActiveGame(user.playerId);
      if (result.hasActiveGame) {
        setActiveGame(result);
      }
    } catch (error) {
      console.error('Error checking for active game:', error);
    } finally {
      setCheckingActiveGame(false);
    }
  };

  const handleLocalMode = () => {
    onModeSelect(GameMode.LOCAL);
  };

  const handleOnlineMode = () => {
    // If user has active game, show confirmation
    if (activeGame) {
      setShowConfirmDialog(true);
    } else {
      onModeSelect(GameMode.ONLINE);
    }
  };

  const handleConfirmNewGame = () => {
    setShowConfirmDialog(false);
    setActiveGame(null); // Clear activeGame to avoid stale state
    onModeSelect(GameMode.ONLINE);
  };

  const handleReconnect = () => {
    if (activeGame?.matchId) {
      // Extract the match ID from the Nakama match ID (format: "nakama_XXXXXX")
      const matchCode = activeGame.matchId.replace('nakama_', '');
      onModeSelect(GameMode.ONLINE, matchCode);
    }
  };

  const handleQuickMatch = () => {
    // TODO: Implement matchmaking
    onModeSelect(GameMode.ONLINE);
  };

  const handleJoinGame = () => {
    if (matchId.trim()) {
      onModeSelect(GameMode.ONLINE, matchId.trim());
    }
  };

  if (showJoinGame) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
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
        
        {/* Mystical orb effects */}
        <div className="absolute top-40 right-40 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <Card className="w-full max-w-md relative z-10 bg-gradient-to-br from-purple-800/60 to-blue-800/60 backdrop-blur-md border-purple-500/50 shadow-2xl">
          <CardHeader className="border-b border-purple-500/30">
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Join Mystical Battle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div>
              <label htmlFor="matchId" className="block text-sm font-medium mb-3 text-purple-200">
                Enter the Sacred Code
              </label>
              <div className="relative">
                <input
                  id="matchId"
                  type="text"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  className="w-full px-4 py-3 bg-black/40 border-2 border-purple-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-white placeholder-gray-500 font-mono text-center text-2xl tracking-widest transition-all duration-300"
                  maxLength={6}
                />
                <div className="absolute inset-0 bg-purple-600/10 rounded-lg blur-xl -z-10" />
              </div>
              <p className="text-xs text-purple-300 mt-2 text-center">Share this code with your opponent</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-gray-800/40 hover:bg-gray-700/50 border-gray-600/50 text-gray-200 hover:text-white transition-all duration-300"
                onClick={() => setShowJoinGame(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleJoinGame}
                disabled={!matchId.trim()}
              >
                Join Battle
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(40)].map((_, i) => (
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
      
      {/* Mystical orb effects */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
          <Card className="w-full max-w-md bg-gradient-to-br from-purple-800/90 to-blue-800/90 backdrop-blur-md border-purple-500/50 shadow-2xl">
            <CardHeader className="border-b border-purple-500/30">
              <CardTitle className="text-xl text-yellow-400">Active Battle Detected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-gray-200">
                  You have an ongoing battle. Creating a new game will abandon your current match.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-gray-800/40 hover:bg-gray-700/50 border-gray-600/50 text-gray-200 hover:text-white transition-all duration-300"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-red-500/30 transition-all duration-300"
                  onClick={handleConfirmNewGame}
                >
                  Abandon & Start New
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="relative z-10 w-full max-w-4xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-lg">
            Choose Your Path
          </h1>
          <p className="text-xl text-purple-200 font-light">
            Select your battlefield for mystical card combat
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Local Mode */}
          <Card 
            className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-blue-800/50 to-purple-800/50 backdrop-blur-md border-blue-500/50 hover:border-blue-400 hover:shadow-blue-500/20 group"
            onClick={handleLocalMode}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-center mb-4 relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all duration-300" />
                <Users className="w-20 h-20 text-blue-400 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-2xl text-center bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">
                Local Duel
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-center text-gray-300 mb-4">
                Face your opponent in person, sharing the same mystical arena
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-blue-300">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span>Same device gameplay</span>
                </div>
                <div className="flex items-center gap-2 text-blue-300">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span>No internet required</span>
                </div>
                <div className="flex items-center gap-2 text-blue-300">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span>Perfect for friends & family</span>
                </div>
              </div>
              <div className="mt-6 text-center">
                <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Click to enter local arena
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Online Mode */}
          <Card className="bg-gradient-to-br from-purple-800/50 to-pink-800/50 backdrop-blur-md border-2 border-purple-500/70 hover:border-purple-400 shadow-xl hover:shadow-purple-500/30 transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-center mb-4 relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl group-hover:bg-green-500/30 transition-all duration-300" />
                <Globe className="w-20 h-20 text-green-400 relative z-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
              </div>
              <CardTitle className="text-2xl text-center bg-gradient-to-r from-green-300 to-emerald-100 bg-clip-text text-transparent">
                Global Arena
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-center text-gray-300 mb-6">
                Challenge mystics across realms in real-time battles
              </p>
              <div className="space-y-2">
                {/* Show active game alert if exists */}
                {activeGame && !checkingActiveGame && (
                  <Alert className="border-green-500/50 bg-green-500/10 mb-2">
                    <AlertCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-gray-200 text-sm">
                      You have an active game!
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Reconnect button - shown when there's an active game */}
                {activeGame && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleReconnect}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect to Game
                  </Button>
                )}
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleOnlineMode}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Create Game
                </Button>
                <Button 
                  variant="outline"
                  className="w-full bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 text-white opacity-50"
                  onClick={handleQuickMatch}
                  disabled
                >
                  Quick Match (Coming Soon)
                </Button>
                <Button 
                  variant="outline"
                  className="w-full bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 text-white"
                  onClick={() => setShowJoinGame(true)}
                >
                  Join with Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}