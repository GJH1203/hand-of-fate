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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative">
        <Card className="w-full max-w-md relative z-10 bg-black/80 backdrop-blur-sm border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Join Online Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="matchId" className="block text-sm font-medium mb-2 text-gray-200">
                Enter Game Code
              </label>
              <input
                id="matchId"
                type="text"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                className="w-full px-3 py-2 bg-black/30 border border-purple-400/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400 font-mono text-center text-xl"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 text-white"
                onClick={() => setShowJoinGame(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleJoinGame}
                disabled={!matchId.trim()}
              >
                Join Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative">
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md bg-black/90 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-xl text-yellow-400">Active Game Found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-gray-200">
                  You have an ongoing game. Creating a new game will abandon your current match.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 text-white"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleConfirmNewGame}
                >
                  Start New Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="w-full max-w-2xl relative z-10 bg-black/80 backdrop-blur-sm border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Choose Game Mode</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Local Mode */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-black/60 border-purple-400/30 hover:border-purple-400"
            onClick={handleLocalMode}
          >
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Users className="w-16 h-16 text-blue-400" />
              </div>
              <CardTitle className="text-xl text-center text-gray-100">Local Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-300">
                Play with a friend on the same device. Take turns making moves.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-400">
                <li>• Same device gameplay</li>
                <li>• No internet required</li>
                <li>• Perfect for in-person games</li>
              </ul>
            </CardContent>
          </Card>

          {/* Online Mode */}
          <Card className="border-2 border-purple-500 bg-black/60 hover:border-purple-400">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Globe className="w-16 h-16 text-green-500" />
              </div>
              <CardTitle className="text-xl text-center text-gray-100">Online Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-300 mb-4">
                Play with friends anywhere in the world. Real-time multiplayer.
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
        </CardContent>
      </Card>
    </div>
  );
}