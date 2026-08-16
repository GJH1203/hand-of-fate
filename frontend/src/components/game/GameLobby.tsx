'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Users, Loader2, Sparkles, Shield } from 'lucide-react';
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
      <div className="absolute top-40 left-40 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <Card className="w-full max-w-md relative z-10 bg-gradient-to-br from-purple-800/60 to-blue-800/60 backdrop-blur-md border-purple-500/50 shadow-2xl">
        <CardHeader className="border-b border-purple-500/30">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            {isHost ? 'Summoning Opponent' : 'Entering Arena'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Game Code Display */}
          <div className="text-center">
            <p className="text-sm text-purple-200 mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Sacred Battle Code
              <Sparkles className="w-4 h-4" />
            </p>
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-lg blur-xl" />
              <div className="relative flex items-center gap-2 bg-black/50 px-6 py-3 rounded-lg border-2 border-yellow-500/50">
                <code className="text-4xl font-mono font-bold tracking-widest text-yellow-400 drop-shadow-lg">
                  {gameCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyGameCode}
                  className="ml-2 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Players Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg border border-green-700/50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="font-medium text-green-200">Champion (Host)</span>
              </div>
              <CheckCircle className="w-6 h-6 text-green-400 drop-shadow-lg" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-700/50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-medium text-purple-200">Challenger</span>
              </div>
              {hasOpponent ? (
                <CheckCircle className="w-6 h-6 text-green-400 drop-shadow-lg" />
              ) : (
                <div className="relative">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <div className="absolute inset-0 w-6 h-6 animate-ping text-purple-400 opacity-75">
                    <Loader2 className="w-6 h-6" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {!hasOpponent ? (
            <div className="text-center space-y-2">
              <p className="text-purple-200">
                Share the sacred code with your opponent
              </p>
              <p className="text-sm text-purple-300/70">
                The mystical arena awaits both warriors...
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent animate-pulse">
                Battle commencing in {countdown}...
              </p>
              <p className="text-sm text-purple-200 mt-2">
                Prepare your mystical cards!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {isHost && !hasOpponent && (
              <Button
                variant="outline"
                className="w-full bg-purple-800/30 hover:bg-purple-700/40 border-purple-500/50 text-purple-200 hover:text-purple-100 transition-all duration-300"
                onClick={shareLink}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Share Portal Link
              </Button>
            )}
            
            <Button
              variant={hasOpponent ? "outline" : "destructive"}
              className={hasOpponent 
                ? "w-full bg-gray-800/30 border-gray-600/50 text-gray-400 cursor-not-allowed" 
                : "w-full bg-red-900/40 hover:bg-red-800/50 border-red-500/50 text-red-300 hover:text-red-200 transition-all duration-300"
              }
              onClick={onCancel}
              disabled={hasOpponent}
            >
              {hasOpponent ? 'Portal Opening...' : 'Abandon Match'}
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