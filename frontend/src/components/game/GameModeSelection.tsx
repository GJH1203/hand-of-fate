'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameMode } from '@/types/gameMode';
import { Users, Globe, Zap, Copy } from 'lucide-react';

interface GameModeSelectionProps {
  onModeSelect: (mode: GameMode, matchId?: string) => void;
}

export default function GameModeSelection({ onModeSelect }: GameModeSelectionProps) {
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [matchId, setMatchId] = useState('');

  const handleLocalMode = () => {
    onModeSelect(GameMode.LOCAL);
  };

  const handleOnlineMode = () => {
    onModeSelect(GameMode.ONLINE);
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