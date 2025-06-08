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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Join Online Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="matchId" className="block text-sm font-medium mb-2">
                Enter Game Code
              </label>
              <input
                id="matchId"
                type="text"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                placeholder="Enter 6-character code"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowJoinGame(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1"
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Choose Game Mode</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Local Mode */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={handleLocalMode}
          >
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Users className="w-16 h-16 text-blue-500" />
              </div>
              <CardTitle className="text-xl text-center">Local Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">
                Play with a friend on the same device. Take turns making moves.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li>• Same device gameplay</li>
                <li>• No internet required</li>
                <li>• Perfect for in-person games</li>
              </ul>
            </CardContent>
          </Card>

          {/* Online Mode */}
          <Card className="border-2 border-blue-500">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Globe className="w-16 h-16 text-green-500" />
              </div>
              <CardTitle className="text-xl text-center">Online Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600 mb-4">
                Play with friends anywhere in the world. Real-time multiplayer.
              </p>
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={handleOnlineMode}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Create Game
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={handleQuickMatch}
                  disabled
                >
                  Quick Match (Coming Soon)
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
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