'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, ArrowRight, BookOpen, Swords, Trophy, SkipForward, 
  Play, Crown, Zap, User, Bot, Lightbulb, CheckCircle, Target,
  Hand, Flag, Award, Eye
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  boardState: SimulatedBoardState;
  availableActions: string[];
  expectedAction?: string;
  magicianTip?: string;
  completed: boolean;
}

interface SimulatedCard {
  id: string;
  name: string;
  power: number;
  owner: 'player' | 'opponent';
}

interface SimulatedBoardState {
  grid: (SimulatedCard | null)[][];
  playerHand: SimulatedCard[];
  playerScore: number;
  opponentScore: number;
  columnScores: { column: number; playerPower: number; opponentPower: number; winner: string | null }[];
  currentTurn: 'player' | 'opponent';
  gamePhase: 'playing' | 'win_request' | 'completed';
  hasPendingWinRequest?: boolean;
}

interface GuidedTutorialProps {
  playerId: string;
  playerName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedTutorial({ playerId, playerName, onComplete, onSkip }: GuidedTutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [magicianMessage, setMagicianMessage] = useState('');
  const [selectedCard, setSelectedCard] = useState<SimulatedCard | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // Initialize tutorial cards (correct distribution: 2x1, 2x3, 1x5)
  const createTutorialCards = (owner: 'player' | 'opponent'): SimulatedCard[] => [
    { id: `${owner}_1`, name: 'Minor Spark', power: 1, owner },
    { id: `${owner}_2`, name: 'Weak Bolt', power: 1, owner },
    { id: `${owner}_3`, name: 'Fire Strike', power: 3, owner },
    { id: `${owner}_4`, name: 'Lightning Blast', power: 3, owner },
    { id: `${owner}_5`, name: 'Ancient Power', power: 5, owner },
  ];

  const createEmptyBoard = (): (SimulatedCard | null)[][] => 
    Array(5).fill(null).map(() => Array(3).fill(null));

  const calculateColumnScores = (grid: (SimulatedCard | null)[][]): { column: number; playerPower: number; opponentPower: number; winner: string | null }[] => {
    return [0, 1, 2].map(col => {
      let playerPower = 0;
      let opponentPower = 0;
      
      for (let row = 0; row < 5; row++) {
        const card = grid[row][col];
        if (card) {
          if (card.owner === 'player') {
            playerPower += card.power;
          } else {
            opponentPower += card.power;
          }
        }
      }
      
      let winner = null;
      if (playerPower > opponentPower) winner = 'player';
      else if (opponentPower > playerPower) winner = 'opponent';
      
      return { column: col, playerPower, opponentPower, winner };
    });
  };

  // Define tutorial steps
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to the Mystical Arena!',
      description: 'Meet your magical guide',
      instruction: 'Greetings, apprentice! I am the Arcane Master, and I will guide you through the mysteries of Hand of Fate.',
      boardState: {
        grid: createEmptyBoard(),
        playerHand: createTutorialCards('player'),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores(createEmptyBoard()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['continue'],
      magicianTip: '✨ Click "Continue" to begin your mystical training!',
      completed: false
    },
    {
      id: 'board_explanation',
      title: 'Understanding the Battlefield',
      description: 'Learn about the mystical grid',
      instruction: 'Behold the 3x5 grid before you! This is where your magical battle will unfold. You control the bottom, your opponent the top.',
      boardState: {
        grid: createEmptyBoard(),
        playerHand: createTutorialCards('player'),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores(createEmptyBoard()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['continue'],
      magicianTip: '🎯 Each column is a separate battle. Win the most columns to claim victory!',
      completed: false
    },
    {
      id: 'game_setup',
      title: 'The Ritual of Beginning',
      description: 'Watch the automatic setup',
      instruction: 'At the start of every battle, fate draws one card from each player\'s deck and places them on the board. Watch as the mystical forces begin!',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => card.name !== 'Fire Strike'),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['continue'],
      magicianTip: '⚡ Notice: Each player now has only 4 cards in hand! The initial cards are removed from your deck.',
      completed: false
    },
    {
      id: 'first_placement',
      title: 'Your First Strategic Move',
      description: 'Place a card adjacent to your initial card',
      instruction: 'Now you must place cards adjacent to your existing cards! Select "Lightning Blast" and place it next to your Fire Strike to strengthen column 2.',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => card.name !== 'Fire Strike'),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['place_card'],
      expectedAction: 'place_lightning_blast',
      magicianTip: '⚡ Click "Lightning Blast" (power 3), then click the highlighted cell below Fire Strike!',
      completed: false
    },
    {
      id: 'opponent_response',
      title: 'Your Opponent Responds',
      description: 'Watch the opponent make their move',
      instruction: 'Excellent! Now observe as your mystical opponent responds with their own spell...',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'opponent',
        gamePhase: 'playing'
      },
      availableActions: ['continue'],
      magicianTip: '👁️ Watch! Your opponent added Dark Strike (power 3) to column 2. Now it\'s You: 6 vs Opponent: 4!',
      completed: false
    },
    {
      id: 'adjacency_rule',
      title: 'The Law of Adjacency',
      description: 'Learn about strategic expansion',
      instruction: 'Now you must think strategically! You can expand to adjacent cells or strengthen existing columns. Let\'s place "Ancient Power" to dominate a new column!',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['place_card'],
      expectedAction: 'place_ancient_power',
      magicianTip: '🌟 Place your "Ancient Power" (5) in the highlighted cell to dominate column 3!',
      completed: false
    },
    {
      id: 'column_scoring',
      title: 'Understanding Column Power',
      description: 'Learn how columns are scored',
      instruction: 'Excellent! You placed Ancient Power in column 3. Now you control column 2 (6 vs 4) and column 3 (5 vs 0). The opponent controls column 1 where they have more power!',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast', 'Ancient Power'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['continue'],
      magicianTip: '🏆 You control 2 columns! Column 2: You 6 vs Opp 4. Column 3: You 5 vs Opp 0. You\'re winning!',
      completed: false
    },
    {
      id: 'strategic_expansion',
      title: 'Strategic Expansion',
      description: 'Learn about expanding to new columns',
      instruction: 'Now let\'s expand to control more territory! You can place your remaining cards to strengthen your position or contest new columns.',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast', 'Ancient Power'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['place_card'],
      expectedAction: 'place_weak_bolt',
      magicianTip: '⚡ Place \"Weak Bolt\" (power 1) in the highlighted cell to contest column 1!',
      completed: false
    },
    {
      id: 'passing_turns',
      title: 'The Art of Passing',
      description: 'Learn when and how to pass',
      instruction: 'Sometimes, the wisest action is no action. When you want to save your remaining cards for better opportunities, you can pass your turn. Try clicking "Pass Turn"!',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast', 'Ancient Power', 'Weak Bolt'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['pass', 'place_card'],
      expectedAction: 'pass',
      magicianTip: '⏭️ Sometimes passing preserves your hand for better opportunities. Click "Pass Turn"!',
      completed: false
    },
    {
      id: 'win_request',
      title: 'Requesting Early Victory',
      description: 'Learn about win requests',
      instruction: 'When you feel confident about your position, you can request to end the game early and calculate the winner. This is called a "Win Request". Try it!',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast', 'Ancient Power', 'Weak Bolt'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['win_request', 'place_card', 'pass'],
      expectedAction: 'win_request',
      magicianTip: '🏆 You control 2 columns! Column 2: You 6 vs Opp 4, Column 3: You 5 vs Opp 3. Click "Request Win"!',
      completed: false
    },
    {
      id: 'win_response',
      title: 'Responding to Win Requests',
      description: 'Learn how opponents can respond',
      instruction: 'Your opponent must now respond to your win request. They can accept (ending the game) or reject (continuing the battle). In this case, they rejected!',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast', 'Ancient Power', 'Weak Bolt'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing',
        hasPendingWinRequest: false
      },
      availableActions: ['continue'],
      magicianTip: '↩️ They want to continue fighting! The battle goes on. Sometimes it\'s wise to build a stronger position first.',
      completed: false
    },
    {
      id: 'victory_conditions',
      title: 'Achieving Victory',
      description: 'Understanding how to win',
      instruction: 'Perfect! You already control 2 out of 3 columns, which means you\'ve won! Let\'s place your final card to show complete mastery.',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          return grid;
        })(),
        playerHand: createTutorialCards('player').filter(card => !['Fire Strike', 'Lightning Blast', 'Ancient Power', 'Weak Bolt'].includes(card.name)),
        playerScore: 0,
        opponentScore: 0,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'playing'
      },
      availableActions: ['place_card'],
      expectedAction: 'place_minor_spark',
      magicianTip: '🎆 Place your final "Minor Spark" in the highlighted cell to complete your training!',
      completed: false
    },
    {
      id: 'tutorial_complete',
      title: 'Mastery Achieved!',
      description: 'You have learned the mystical arts',
      instruction: 'Congratulations, young mage! You now understand the fundamental arts of Hand of Fate. You are ready for real battles!',
      boardState: {
        grid: (() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          grid[2][0] = { id: 'player_4', name: 'Minor Spark', power: 1, owner: 'player' };
          return grid;
        })(),
        playerHand: [],
        playerScore: 2,
        opponentScore: 1,
        columnScores: calculateColumnScores((() => {
          const grid = createEmptyBoard();
          grid[1][1] = { id: 'player_initial', name: 'Fire Strike', power: 3, owner: 'player' };
          grid[3][1] = { id: 'opponent_initial', name: 'Shadow Bolt', power: 1, owner: 'opponent' };
          grid[2][1] = { id: 'player_1', name: 'Lightning Blast', power: 3, owner: 'player' };
          grid[4][1] = { id: 'opponent_1', name: 'Dark Strike', power: 3, owner: 'opponent' };
          grid[1][2] = { id: 'player_2', name: 'Ancient Power', power: 5, owner: 'player' };
          grid[3][2] = { id: 'opponent_2', name: 'Void Blast', power: 3, owner: 'opponent' };
          grid[1][0] = { id: 'player_3', name: 'Weak Bolt', power: 1, owner: 'player' };
          grid[3][0] = { id: 'opponent_3', name: 'Ice Shard', power: 1, owner: 'opponent' };
          grid[4][0] = { id: 'opponent_4', name: 'Frost Bolt', power: 5, owner: 'opponent' };
          grid[2][0] = { id: 'player_4', name: 'Minor Spark', power: 1, owner: 'player' };
          return grid;
        })()),
        currentTurn: 'player',
        gamePhase: 'completed'
      },
      availableActions: ['complete'],
      magicianTip: '🎉 Perfect! You control columns 2 and 3! You\'ve mastered the mystical arts and are ready for real battles!',
      completed: false
    }
  ];

  const [steps, setSteps] = useState(tutorialSteps);
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    setMagicianMessage(currentStep.instruction);
    
    // Set highlighted cells for placement steps (only the specific position we want)
    if (currentStep.id === 'first_placement') {
      // Specific position: below Fire Strike to strengthen column 2
      setHighlightedCells(['2,1']);
    } else if (currentStep.id === 'adjacency_rule') {
      // Specific position: to the right to start dominating column 3
      setHighlightedCells(['1,2']);
    } else if (currentStep.id === 'strategic_expansion') {
      // Specific position: to the left to contest column 1
      setHighlightedCells(['1,0']);
    } else if (currentStep.id === 'victory_conditions') {
      // Specific position: below Weak Bolt to complete the tutorial
      setHighlightedCells(['2,0']);
    } else {
      setHighlightedCells([]);
    }
  }, [currentStepIndex]);

  const handleCellClick = (row: number, col: number) => {
    if (!selectedCard || !highlightedCells.includes(`${row},${col}`)) return;
    
    const newSteps = [...steps];
    const newGrid = [...currentStep.boardState.grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = selectedCard;
    
    // Remove card from hand
    const newHand = currentStep.boardState.playerHand.filter(card => card.id !== selectedCard.id);
    
    // Update board state
    newSteps[currentStepIndex] = {
      ...currentStep,
      boardState: {
        ...currentStep.boardState,
        grid: newGrid,
        playerHand: newHand,
        columnScores: calculateColumnScores(newGrid)
      },
      completed: true
    };
    
    setSteps(newSteps);
    setSelectedCard(null);
    
    // Auto-advance after placement
    setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        
        // If next step is opponent response, show opponent thinking then auto-advance
        if (steps[currentStepIndex + 1]?.id === 'opponent_response') {
          setIsThinking(true);
          setTimeout(() => {
            setIsThinking(false);
            if (currentStepIndex + 1 < steps.length - 1) {
              setCurrentStepIndex(currentStepIndex + 2);
            }
          }, 3000);
        }
      }
    }, 1500);
  };

  const handleAction = (action: string) => {
    const newSteps = [...steps];
    newSteps[currentStepIndex] = { ...currentStep, completed: true };
    setSteps(newSteps);
    
    if (action === 'complete') {
      onComplete();
      return;
    }
    
    // Handle different actions
    if (action === 'pass') {
      setMagicianMessage('Wise choice! Passing can be a strategic move to preserve your options.');
    } else if (action === 'win_request') {
      setMagicianMessage('Bold! You\'ve requested an early victory calculation. Your opponent is considering...');
      setIsThinking(true);
      setTimeout(() => {
        setIsThinking(false);
        setMagicianMessage('Your opponent has rejected the win request. The battle continues!');
      }, 2000);
    }
    
    // Auto-advance
    setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }, action === 'win_request' ? 3000 : 1500);
  };

  const renderGameBoard = () => {
    const cells = [];
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const card = currentStep.boardState.grid[row][col];
        const cellKey = `${row},${col}`;
        const isHighlighted = highlightedCells.includes(cellKey);
        const isValidPlacement = selectedCard && isHighlighted;
        
        cells.push(
          <div
            key={cellKey}
            onClick={() => handleCellClick(row, col)}
            className={`
              h-20 w-20 rounded-lg border-2 flex items-center justify-center
              transition-all duration-200 relative overflow-hidden cursor-pointer
              ${!card ? 'bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-indigo-900/30 backdrop-blur-sm border-purple-500/30' : ''}
              ${isHighlighted ? 'ring-2 ring-yellow-400 border-yellow-400 bg-yellow-900/40 animate-pulse shadow-lg shadow-yellow-400/50' : ''}
              ${isValidPlacement ? 'hover:bg-yellow-800/60' : ''}
              ${!card && !isHighlighted ? 'hover:border-purple-400/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]' : ''}
            `}
          >
            {card && (
              <div className={`
                flex flex-col items-center gap-1 relative w-full h-full justify-center rounded-lg
                ${card.owner === 'player' 
                  ? 'bg-gradient-to-br from-blue-800 to-indigo-900 border-2 border-blue-500/50' 
                  : 'bg-gradient-to-br from-red-800 to-purple-900 border-2 border-red-500/50'
                }
              `}>
                <div className={`
                  absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${card.owner === 'player' ? 'bg-blue-400/80 text-blue-900' : 'bg-red-400/80 text-red-900'}
                `}>
                  {card.owner === 'player' ? 'YOU' : 'OPP'}
                </div>
                
                <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">
                  {card.power}
                </div>
                <div className="text-[8px] font-semibold text-gray-200 text-center px-1">
                  {card.name}
                </div>
              </div>
            )}
            
            {isHighlighted && !card && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
            )}
          </div>
        );
      }
    }
    
    return cells;
  };

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
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-6">
          <Card className="bg-gradient-to-r from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-yellow-400">{currentStep.title}</CardTitle>
                    <CardDescription className="text-purple-300">
                      Step {currentStepIndex + 1} of {steps.length}: {currentStep.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-900/50 text-purple-300">
                    {currentStep.boardState.gamePhase}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onSkip}
                    className="bg-gray-900/20 hover:bg-gray-800/30 border-gray-500/50 text-gray-300"
                  >
                    <SkipForward className="w-4 h-4 mr-1" />
                    Skip
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Mystical Battlefield
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                  {renderGameBoard()}
                </div>

                {/* Column Scores */}
                <div className="mt-6">
                  <h4 className="text-purple-300 font-semibold mb-3 text-center">Column Control</h4>
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    {currentStep.boardState.columnScores.map((column, index) => (
                      <div key={index} className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-500/30">
                        <div className="text-xs text-purple-400 mb-1">Column {index + 1}</div>
                        <div className="text-sm space-y-1">
                          <div className={`${column.winner === 'player' ? 'text-green-400 font-bold' : 'text-blue-300'}`}>
                            You: {column.playerPower}
                          </div>
                          <div className={`${column.winner === 'opponent' ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                            Opp: {column.opponentPower}
                          </div>
                        </div>
                        {column.winner && (
                          <div className="mt-1">
                            <Crown className={`w-4 h-4 mx-auto ${column.winner === 'player' ? 'text-yellow-400' : 'text-gray-400'}`} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Magician Guide */}
            <Card className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/50">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Arcane Master
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center flex-shrink-0">
                    {isThinking ? (
                      <div className="animate-spin">⏳</div>
                    ) : (
                      <Sparkles className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-yellow-200 mb-3">{magicianMessage}</p>
                    {currentStep.magicianTip && (
                      <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-600/30">
                        <p className="text-yellow-300 text-sm">{currentStep.magicianTip}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player Hand */}
            <Card className="bg-gradient-to-br from-blue-800/40 to-indigo-800/40 backdrop-blur-md border-blue-500/50">
              <CardHeader>
                <CardTitle className="text-yellow-400 text-sm flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  Your Mystical Cards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentStep.boardState.playerHand.map((card) => {
                  // Determine if this card should be highlighted based on expected action
                  const isExpectedCard = (() => {
                    if (currentStep.expectedAction === 'place_lightning_blast' && card.name === 'Lightning Blast') return true;
                    if (currentStep.expectedAction === 'place_ancient_power' && card.name === 'Ancient Power') return true;
                    if (currentStep.expectedAction === 'place_weak_bolt' && card.name === 'Weak Bolt') return true;
                    if (currentStep.expectedAction === 'place_minor_spark' && card.name === 'Minor Spark') return true;
                    return false;
                  })();
                  
                  const canSelectCard = currentStep.availableActions.includes('place_card') && 
                    (currentStep.expectedAction ? isExpectedCard : true);
                  
                  return (
                  <div
                    key={card.id}
                    onClick={() => canSelectCard ? setSelectedCard(card) : null}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all duration-200
                      ${selectedCard?.id === card.id 
                        ? 'border-yellow-400 bg-yellow-600/30 ring-2 ring-yellow-400' 
                        : isExpectedCard
                          ? 'border-green-400 bg-green-600/20 ring-2 ring-green-400 animate-pulse'
                          : 'border-blue-500/50 bg-blue-800/30'
                      }
                      ${canSelectCard 
                        ? 'hover:border-blue-400' 
                        : 'opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-200 text-sm font-medium">{card.name}</span>
                        {isExpectedCard && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full animate-pulse">
                            USE THIS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400 font-bold">{card.power}</span>
                      </div>
                    </div>
                  </div>
                );
                })}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {currentStep.availableActions.includes('continue') && (
                    <Button 
                      onClick={() => handleAction('continue')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Continue
                    </Button>
                  )}
                  
                  {currentStep.availableActions.includes('pass') && (
                    <Button 
                      onClick={() => handleAction('pass')}
                      variant="outline"
                      className="bg-gray-900/20 hover:bg-gray-800/30 border-gray-500/50 text-gray-300"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Pass Turn
                    </Button>
                  )}
                  
                  {currentStep.availableActions.includes('win_request') && (
                    <Button 
                      onClick={() => handleAction('win_request')}
                      className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Request Win
                    </Button>
                  )}
                  
                  {currentStep.availableActions.includes('complete') && (
                    <Button 
                      onClick={() => handleAction('complete')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Complete Tutorial
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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