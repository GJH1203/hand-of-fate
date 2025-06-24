'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Trophy, Target, Layers, Sparkles } from 'lucide-react';

interface GameTutorialProps {
  onClose: () => void;
}

interface TutorialSlide {
  title: string;
  content: React.ReactNode;
  visual?: React.ReactNode;
}

export default function GameTutorial({ onClose }: GameTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < 8) { // 8 is the last slide index
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Prevent body scroll when tutorial is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, onClose]);

  const slides: TutorialSlide[] = [
    {
      title: "Welcome to Hand of Fate!",
      content: (
        <div className="space-y-4 text-gray-300">
          <p>You are a mystic wielding powerful cards in strategic battles.</p>
          <p>Your goal: <span className="text-yellow-400 font-semibold">Control 2 out of 3 columns</span> on the board to claim victory!</p>
        </div>
      ),
      visual: (
        <div className="flex justify-center my-6">
          <div className="relative">
            <Sparkles className="w-24 h-24 text-purple-400 animate-pulse" />
            <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full" />
          </div>
        </div>
      )
    },
    {
      title: "Your Mystical Deck",
      content: (
        <div className="space-y-4 text-gray-300">
          <p>Each player commands <span className="text-purple-400 font-semibold">5 mystical cards</span>:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><span className="text-blue-300">Two cards</span> with power <span className="font-bold">1</span> - Swift but weak</li>
            <li><span className="text-green-300">Two cards</span> with power <span className="font-bold">3</span> - Balanced strength</li>
            <li><span className="text-orange-300">One card</span> with power <span className="font-bold">5</span> - Your mightiest spell!</li>
          </ul>
          <p className="text-sm mt-3 text-yellow-300">Both players have identical decks - strategy is everything!</p>
        </div>
      ),
      visual: (
        <div className="my-6">
          <div className="flex justify-center gap-2">
            {[1, 1, 3, 3, 5].map((num, idx) => (
              <div key={idx} className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center transform hover:scale-110 transition-transform ${
                num === 1 ? 'bg-blue-900/50 border-blue-400' :
                num === 3 ? 'bg-green-900/50 border-green-400' :
                'bg-orange-900/50 border-orange-400'
              }`}>
                <div className="text-xl font-bold text-white">{num}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">Your complete deck of 5 cards</p>
        </div>
      )
    },
    {
      title: "The Mystical Board",
      content: (
        <div className="space-y-4 text-gray-300">
          <p>The board has <span className="text-blue-400 font-semibold">3 columns</span> and <span className="text-blue-400 font-semibold">5 rows</span>.</p>
          <p>At game start, <span className="text-yellow-400 font-semibold">one random card</span> from each deck is automatically placed:</p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
            <li>Player 1 (Blue): Drew their 5 → placed at Row 2, Column 2</li>
            <li>Player 2 (Red): Drew a 3 → placed at Row 4, Column 2</li>
          </ul>
          <p className="text-sm text-orange-300 mt-2">⚡ Important: These cards are removed from your hand! You'll play with your remaining 4 cards.</p>
        </div>
      ),
      visual: (
        <div className="my-6 mx-auto max-w-sm">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(15)].map((_, i) => {
              const row = Math.floor(i / 3);
              const col = i % 3;
              const isPlayer1 = row === 1 && col === 1; // Row 2, Col 2 (0-indexed)
              const isPlayer2 = row === 3 && col === 1; // Row 4, Col 2 (0-indexed)
              
              return (
                <div 
                  key={i} 
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center ${
                    isPlayer1 ? 'border-blue-500 bg-blue-500/20' : 
                    isPlayer2 ? 'border-red-500 bg-red-500/20' : 
                    'border-gray-600 bg-gray-800/50'
                  }`}
                >
                  {isPlayer1 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">5</div>
                      <div className="text-xs text-blue-300">P1</div>
                    </div>
                  )}
                  {isPlayer2 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">3</div>
                      <div className="text-xs text-red-300">P2</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm text-gray-400">
            <div>Column 1</div>
            <div>Column 2</div>
            <div>Column 3</div>
          </div>
        </div>
      )
    },
    {
      title: "The Power of Random Fate",
      content: (
        <div className="space-y-4 text-gray-300">
          <p className="font-semibold text-yellow-400">The random start creates unique strategies!</p>
          <p>In this example:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
            <li><span className="text-blue-400">Player 1</span> lost their only 5 (highest power)</li>
            <li><span className="text-red-400">Player 2</span> lost one of their 3s (mid-power)</li>
          </ul>
          <p className="mt-3">This dramatically affects strategy:</p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
            <li>Player 1 leads in Column 2 but has no more high-power cards!</li>
            <li>Player 2 still has their powerful 5 card to play strategically</li>
            <li>Player 1 must rely on positioning with their weaker cards</li>
            <li>Player 2 can use their 5 to dominate a key column later</li>
          </ul>
        </div>
      ),
      visual: (
        <div className="my-6 space-y-4">
          <div className="text-center text-sm text-gray-400 mb-2">Remaining Cards in Hand</div>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
              <div className="text-blue-400 font-semibold text-sm mb-2">Player 1 (Blue)</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {[1, 1, 3, 3].map((num, idx) => (
                  <div key={idx} className="w-8 h-10 bg-blue-800/50 border border-blue-500 rounded flex items-center justify-center text-xs font-bold text-blue-300">
                    {num}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center">Lost their only 5!</div>
            </div>
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <div className="text-red-400 font-semibold text-sm mb-2">Player 2 (Red)</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {[1, 1, 3, 5].map((num, idx) => (
                  <div key={idx} className="w-8 h-10 bg-red-800/50 border border-red-500 rounded flex items-center justify-center text-xs font-bold text-red-300">
                    {num}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center">Still has their 5!</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Placing Your Cards",
      content: (
        <div className="space-y-4 text-gray-300">
          <p className="font-semibold text-yellow-400">The Golden Rule:</p>
          <p>You can only place cards <span className="text-green-400 font-semibold">adjacent</span> to your existing cards!</p>
          <p className="text-sm">Adjacent means directly up, down, left, or right - not diagonal.</p>
        </div>
      ),
      visual: (
        <div className="my-6 mx-auto max-w-xs">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <div 
                key={i} 
                className={`aspect-square rounded-lg border-2 flex items-center justify-center ${
                  i === 4 ? 'border-blue-500 bg-blue-500/20' : 
                  [1, 3, 5, 7].includes(i) ? 'border-green-400 bg-green-400/10 animate-pulse' : 
                  'border-gray-600 bg-gray-800/50'
                }`}
              >
                {i === 4 && <div className="text-blue-400 font-bold">YOU</div>}
                {[1, 3, 5, 7].includes(i) && <div className="text-green-400 text-2xl">✓</div>}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-3">Green squares show valid placement spots</p>
        </div>
      )
    },
    {
      title: "Controlling Columns",
      content: (
        <div className="space-y-4 text-gray-300">
          <p className="font-semibold text-yellow-400">How to win a column:</p>
          <p>Add up <span className="text-orange-400 font-semibold">all your cards' power</span> in that column.</p>
          <p>The player with the <span className="text-green-400 font-semibold">higher total</span> controls it!</p>
          <p className="text-sm mt-3">Example: If a column has multiple cards from each player, sum them up!</p>
        </div>
      ),
      visual: (
        <div className="my-6 space-y-4">
          <div className="text-center text-sm text-gray-400 mb-2">Example Column</div>
          <div className="bg-gray-800/50 rounded-lg p-4 max-w-xs mx-auto">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-blue-400">Blue cards: 5 + 1 =</span>
                <span className="text-xl font-bold text-blue-400">6</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-400">Red cards: 3 + 3 =</span>
                <span className="text-xl font-bold text-red-400">6</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-center text-yellow-400">It's a tie! No one controls this column.</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Winning the Game",
      content: (
        <div className="space-y-4 text-gray-300">
          <p className="text-lg font-semibold text-yellow-400">Victory Condition:</p>
          <p>Control <span className="text-green-400 font-bold">2 out of 3 columns</span> when the game ends!</p>
          <div className="mt-4 space-y-2 text-sm">
            <p>The game ends when:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All board positions are filled</li>
              <li>No player can make valid moves</li>
              <li>Players agree to calculate the winner early</li>
            </ul>
          </div>
        </div>
      ),
      visual: (
        <div className="my-6 flex justify-center items-center">
          <Trophy className="w-24 h-24 text-yellow-400 animate-bounce" />
        </div>
      )
    },
    {
      title: "Strategic Tips",
      content: (
        <div className="space-y-4 text-gray-300">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Target className="w-5 h-5 text-purple-400 mt-0.5" />
              <p className="text-sm">Focus on winning 2 columns - you don't need all 3!</p>
            </div>
            <div className="flex items-start gap-2">
              <Layers className="w-5 h-5 text-blue-400 mt-0.5" />
              <p className="text-sm">Block your opponent's expansion by placing cards strategically</p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400 mt-0.5" />
              <p className="text-sm">Sometimes sacrificing a column to secure two others is the path to victory!</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const current = slides[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-2xl my-auto bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-md border-purple-500/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Close tutorial"
          >
            <X className="w-6 h-6" />
          </button>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            {current.title}
          </CardTitle>
          <div className="flex justify-center mt-2 gap-1">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'w-8 bg-purple-400' 
                    : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {current.visual}
            {current.content}
          </div>
        </CardContent>
        <div className="p-6 border-t border-purple-500/30">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevSlide}
              disabled={isFirstSlide}
              className="bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-gray-400">
              {currentSlide + 1} / {slides.length}
            </span>
            
            {isLastSlide ? (
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                Start Playing!
              </Button>
            ) : (
              <Button
                onClick={nextSlide}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}