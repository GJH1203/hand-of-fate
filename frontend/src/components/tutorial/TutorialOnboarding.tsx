'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, BookOpen, Swords, Trophy, SkipForward, Play } from 'lucide-react';
import { tutorialService, TutorialProgress } from '@/services/tutorialService';
import { GameState } from '@/types/game';
import { TutorialGameBoard } from './TutorialGameBoard';

interface TutorialOnboardingProps {
  playerId: string;
  playerName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function TutorialOnboarding({ playerId, playerName, onComplete, onSkip }: TutorialOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [tutorialGame, setTutorialGame] = useState<GameState | null>(null);
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTutorialGame = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const game = await tutorialService.startTutorial(playerId);
      setTutorialGame(game);
      setCurrentStep(3); // Move to game step
      
      // Start polling for progress
      pollProgress(game.id);
    } catch (error) {
      console.error('Failed to start tutorial:', error);
      setError('Failed to start tutorial. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pollProgress = async (gameId: string) => {
    try {
      const progressData = await tutorialService.getTutorialProgress(gameId);
      setProgress(progressData);
      
      // If game is completed, handle completion
      if (progressData.gameState === 'COMPLETED') {
        setTimeout(() => {
          completeTutorial(gameId);
        }, 2000); // Give user time to see the final state
      }
    } catch (error) {
      console.error('Failed to get tutorial progress:', error);
    }
  };

  const completeTutorial = async (gameId: string) => {
    try {
      await tutorialService.completeTutorial(playerId, gameId);
      onComplete();
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
      setError('Failed to complete tutorial. Please try again.');
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await tutorialService.skipTutorial(playerId);
      onSkip();
    } catch (error) {
      console.error('Failed to skip tutorial:', error);
      setError('Failed to skip tutorial. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tutorialSteps = [
    {
      title: "Welcome to Hand of Fate!",
      description: "Master the arcane arts of strategic card placement",
      icon: <Sparkles className="w-8 h-8" />,
      content: (
        <div className="space-y-4">
          <p className="text-purple-200">
            Welcome, <span className="font-bold text-yellow-400">{playerName}</span>! 
            You're about to embark on a mystical journey of strategic card battles.
          </p>
          <p className="text-purple-300">
            In this tutorial, you'll learn the fundamental rules and strategies needed to become a master of the arcane arts.
          </p>
          <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
            <h4 className="font-semibold text-yellow-400 mb-2">What you'll learn:</h4>
            <ul className="space-y-1 text-sm text-purple-200">
              <li>• How to place cards on the mystical grid</li>
              <li>• Understanding card power and positioning</li>
              <li>• Column control and victory conditions</li>
              <li>• Strategic timing and card selection</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "The Mystical Battlefield",
      description: "Understanding the 3x5 grid of power",
      icon: <BookOpen className="w-8 h-8" />,
      content: (
        <div className="space-y-4">
          <p className="text-purple-200">
            The battlefield consists of a <span className="font-bold text-yellow-400">3x5 grid</span> - 
            3 columns and 5 rows of mystical energy.
          </p>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i} 
                className="aspect-square bg-purple-900/30 border border-purple-500/50 rounded flex items-center justify-center text-xs text-purple-400"
              >
                {Math.floor(i / 3)},{i % 3}
              </div>
            ))}
          </div>
          <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
            <h4 className="font-semibold text-yellow-400 mb-2">Victory Condition:</h4>
            <p className="text-sm text-blue-200">
              Control the most columns by having the highest total power in each column. 
              Each column is scored independently!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Ready for Battle?",
      description: "Let's start your first tutorial game",
      icon: <Swords className="w-8 h-8" />,
      content: (
        <div className="space-y-4">
          <p className="text-purple-200">
            Now it's time to put your knowledge to the test! You'll face the Tutorial Bot in a practice battle.
          </p>
          <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-500/30">
            <h4 className="font-semibold text-yellow-400 mb-2">Remember:</h4>
            <ul className="space-y-1 text-sm text-orange-200">
              <li>• Cards must be placed adjacent to your existing cards</li>
              <li>• Each card has a power value</li>
              <li>• Higher total power in a column wins that column</li>
              <li>• Win the majority of columns to claim victory</li>
            </ul>
          </div>
          {!tutorialGame && (
            <Button 
              onClick={startTutorialGame}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isLoading ? (
                <div className="animate-pulse">Starting Battle...</div>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Begin Tutorial Battle
                </>
              )}
            </Button>
          )}
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // If we have a tutorial game, show the game board
  if (tutorialGame && currentStep >= 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Background effects */}
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
              <div className="w-1 h-1 bg-purple-400 rounded-full opacity-40 blur-sm" />
            </div>
          ))}
        </div>

        <div className="relative z-10 p-6">
          {/* Tutorial Progress Header */}
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="bg-gradient-to-r from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                      <Swords className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-yellow-400">Tutorial Battle</CardTitle>
                      <CardDescription className="text-purple-300">
                        {progress ? `Step ${progress.currentStep} of ${progress.totalSteps}` : 'Learning the arts of war...'}
                      </CardDescription>
                    </div>
                  </div>
                  {progress && (
                    <Badge variant="secondary" className="bg-purple-900/50 text-purple-300">
                      {progress.gameState}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Tutorial Game Board */}
          <TutorialGameBoard 
            gameState={tutorialGame}
            playerId={playerId}
            onGameUpdate={(updatedGame) => {
              setTutorialGame(updatedGame);
              if (updatedGame.id) {
                pollProgress(updatedGame.id);
              }
            }}
          />

          {error && (
            <div className="max-w-4xl mx-auto mt-4">
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 0.2; }
          }
        `}</style>
      </div>
    );
  }

  // Show step-by-step tutorial
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background effects */}
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

      {/* Mystical orb effects */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-2xl w-full">
          {/* Tutorial Card */}
          <Card className="bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50 shadow-2xl">
            <CardHeader className="border-b border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                    {tutorialSteps[currentStep].icon}
                  </div>
                  <div>
                    <CardTitle className="text-yellow-400">{tutorialSteps[currentStep].title}</CardTitle>
                    <CardDescription className="text-purple-300">
                      {tutorialSteps[currentStep].description}
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="bg-gray-900/20 hover:bg-gray-800/30 border-gray-500/50 text-gray-300"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip
                </Button>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-purple-900/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                />
              </div>
              <div className="text-sm text-purple-300 mt-2">
                Step {currentStep + 1} of {tutorialSteps.length}
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {tutorialSteps[currentStep].content}
              
              {error && (
                <div className="mt-4 bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between mt-8">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="bg-purple-900/20 hover:bg-purple-800/30 border-purple-500/50 text-purple-300"
                >
                  Previous
                </Button>
                
                {currentStep < tutorialSteps.length - 1 ? (
                  <Button 
                    onClick={nextStep}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : null}
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