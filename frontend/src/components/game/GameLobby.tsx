'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Users, Loader2 } from 'lucide-react';
import { OnlineMatchInfo } from '@/types/gameMode';

interface GameLobbyProps {
  matchInfo: OnlineMatchInfo;
  currentPlayerId: string;
  onGameStart: () => void;
  onCancel: () => void;
}

export default function GameLobby({ 
  matchInfo, 
  currentPlayerId, 
  onGameStart, 
  onCancel 
}: GameLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isHost = matchInfo.player1Id === currentPlayerId;
  const hasOpponent = !!matchInfo.player2Id;
  const gameCode = matchInfo.matchId.slice(-6).toUpperCase(); // Last 6 chars as game code

  useEffect(() => {
    if (hasOpponent && countdown === null) {
      setCountdown(3);
    }
  }, [hasOpponent, countdown]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onGameStart();
    }
  }, [countdown, onGameStart]);

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    const url = `${window.location.origin}/game?join=${gameCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative">
      <Card className="w-full max-w-md relative z-10 bg-black/80 backdrop-blur-sm border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isHost ? 'Waiting for Opponent' : 'Joining Game'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Code Display */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Game Code</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-3xl font-mono font-bold tracking-wider bg-gray-100 px-4 py-2 rounded">
                {gameCode}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={copyGameCode}
                className="ml-2 relative z-20"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Players Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">Player 1 (Host)</span>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">Player 2</span>
              </div>
              {hasOpponent ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              )}
            </div>
          </div>

          {/* Status Message */}
          {!hasOpponent ? (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Share the game code with your friend to start playing!
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">
                Opponent joined! Starting in {countdown}...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {isHost && !hasOpponent && (
              <Button
                variant="outline"
                className="w-full"
                onClick={shareLink}
              >
                Share Invite Link
              </Button>
            )}
            
            <Button
              variant={hasOpponent ? "outline" : "destructive"}
              className="w-full"
              onClick={onCancel}
              disabled={hasOpponent}
            >
              {hasOpponent ? 'Game Starting...' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}