'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameState, Card as GameCard, Position, ActionType } from '@/types/game';
import { tutorialService } from '@/services/tutorialService';
import GameCell from '@/components/game/GameCell';
import { Lightbulb, Bot, User, Crown, Zap } from 'lucide-react';

interface TutorialGameBoardProps {
  gameState: GameState;
  playerId: string;
  onGameUpdate: (updatedGame: GameState) => void;
}

export function TutorialGameBoard({ gameState, playerId, onGameUpdate }: TutorialGameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tutorialHint, setTutorialHint] = useState<string>('');
  const [gameOver, setGameOver] = useState(false);

  const isPlayerTurn = gameState.currentPlayerId === playerId;
  const playerHand = gameState.currentPlayerHand || [];

  useEffect(() => {
    updateTutorialHint();
    
    if (gameState.state === 'COMPLETED') {
      setGameOver(true);
    }
  }, [gameState, isPlayerTurn]);

  const updateTutorialHint = () => {
    if (gameState.state === 'COMPLETED') {
      if (gameState.winnerId === playerId) {
        setTutorialHint('🎉 Congratulations! You won your first battle! You\'ve mastered the basics.');
      } else if (gameState.isTie) {
        setTutorialHint('⚔️ A tie! Both warriors showed equal strength. Well fought!');
      } else {
        setTutorialHint('💪 Don\'t worry! Every master has learned from defeats. You understand the game now!');
      }
      return;
    }

    if (!isPlayerTurn) {
      setTutorialHint('🤖 The Tutorial Bot is thinking... Watch how it places its cards!');
      return;
    }

    // Provide contextual hints based on game state
    const totalMoves = gameState.board.pieces ? Object.keys(gameState.board.pieces).length : 0;
    
    if (totalMoves === 0) {
      setTutorialHint('✨ Place your first card anywhere on the board! Start your mystical journey.');
    } else if (totalMoves < 4) {
      setTutorialHint('⚡ Remember: New cards must be placed adjacent to your existing cards. Plan your column control!');
    } else if (totalMoves < 8) {
      setTutorialHint('🎯 Focus on winning columns! Higher total power in a column wins that column.');
    } else {
      setTutorialHint('🏆 The battle intensifies! Consider passing if you want to end the game and calculate scores.');
    }
  };

  const handleCellClick = async (position: Position) => {
    if (!isPlayerTurn || !selectedCard || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const playerAction = {
        type: ActionType.PLACE_CARD,
        playerId: playerId,
        card: selectedCard,
        targetPosition: position,
        timestamp: Date.now()
      };

      const updatedGame = await tutorialService.makeTutorialMove(gameState.id, playerAction);
      onGameUpdate(updatedGame);
      setSelectedCard(null);
    } catch (error) {
      console.error('Failed to make move:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePass = async () => {
    if (!isPlayerTurn || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const playerAction = {
        type: ActionType.PASS,
        playerId: playerId,
        timestamp: Date.now()
      };

      const updatedGame = await tutorialService.makeTutorialMove(gameState.id, playerAction);
      onGameUpdate(updatedGame);
    } catch (error) {
      console.error('Failed to pass:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderGameBoard = () => {
    const cells = [];
    
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        const position = { x, y };
        const positionKey = `${x},${y}`;
        const cardId = gameState.board.pieces?.[positionKey];
        const card = cardId ? gameState.placedCards?.[cardId] : null;
        const cardOwner = gameState.cardOwnership?.[positionKey];
        
        cells.push(
          <GameCell
            key={positionKey}
            position={position}
            card={card}
            isValidMove={isPlayerTurn && selectedCard !== null && !card}
            onCellClick={handleCellClick}
            selectedCard={selectedCard}
            cardOwner={cardOwner}
            currentPlayerId={playerId}
            playerNames={gameState.playerNames}
          />
        );
      }
    }
    
    return cells;
  };

  const getColumnScores = () => {
    const columns = [0, 1, 2];
    return columns.map(col => {
      const columnScore = gameState.columnScores?.[col];
      if (!columnScore) return null;
      
      const playerScore = columnScore.playerScores[playerId] || 0;
      const opponentScore = Object.values(columnScore.playerScores).find(score => score !== playerScore) || 0;
      
      return {
        column: col,
        playerScore,
        opponentScore,
        winner: columnScore.winnerId,
        isTie: columnScore.isTie
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Tutorial Hint */}
      <Card className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-200">{tutorialHint}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Game Board */}
        <div className="lg:col-span-3">
          <Card className="bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  {isPlayerTurn ? (
                    <>
                      <User className="w-5 h-5" />
                      Your Turn
                    </>
                  ) : (
                    <>
                      <Bot className="w-5 h-5" />
                      Tutorial Bot's Turn
                    </>
                  )}
                </CardTitle>
                <Badge variant="secondary" className="bg-purple-900/50 text-purple-300">
                  {gameState.state}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
                {renderGameBoard()}
              </div>

              {/* Column Scores */}
              {gameState.columnScores && (
                <div className="mt-6">
                  <h4 className="text-purple-300 font-semibold mb-3 text-center">Column Control</h4>
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    {getColumnScores().map((column, index) => (
                      <div key={index} className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-500/30">
                        <div className="text-xs text-purple-400 mb-1">Column {index + 1}</div>
                        {column ? (
                          <>
                            <div className="text-sm space-y-1">
                              <div className={`${column.winner === playerId ? 'text-green-400' : 'text-blue-300'}`}>
                                You: {column.playerScore}
                              </div>
                              <div className={`${column.winner && column.winner !== playerId ? 'text-red-400' : 'text-gray-400'}`}>
                                Bot: {column.opponentScore}
                              </div>
                            </div>
                            {column.winner && (
                              <div className="mt-1">
                                {column.isTie ? (
                                  <Badge variant="secondary" className="text-xs">Tie</Badge>
                                ) : (
                                  <Crown className={`w-4 h-4 mx-auto ${column.winner === playerId ? 'text-yellow-400' : 'text-gray-400'}`} />
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-500 text-sm">Empty</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {isPlayerTurn && !gameOver && (
                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    onClick={handlePass}
                    disabled={isProcessing}
                    variant="outline"
                    className="bg-gray-900/20 hover:bg-gray-800/30 border-gray-500/50 text-gray-300"
                  >
                    Pass Turn
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Player Hand */}
        <div className="lg:col-span-1">
          <Card className="bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-yellow-400 text-sm">Your Hand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {playerHand.map((card) => (
                <div
                  key={card.id}
                  onClick={() => isPlayerTurn && !isProcessing ? setSelectedCard(card) : null}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all duration-200
                    ${selectedCard?.id === card.id 
                      ? 'border-purple-400 bg-purple-600/30 ring-2 ring-purple-400' 
                      : 'border-purple-500/50 bg-purple-800/30 hover:bg-purple-700/30'
                    }
                    ${isPlayerTurn && !isProcessing ? 'hover:border-purple-400' : 'opacity-50 cursor-not-allowed'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200 text-sm font-medium">{card.name}</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">{card.power}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {playerHand.length === 0 && (
                <div className="text-center text-purple-400 text-sm py-4">
                  No cards in hand
                </div>
              )}

              {selectedCard && (
                <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <div className="text-xs text-blue-300 mb-1">Selected Card:</div>
                  <div className="text-blue-200 font-medium">{selectedCard.name}</div>
                  <div className="text-xs text-blue-400">Power: {selectedCard.power}</div>
                  <div className="text-xs text-blue-400 mt-2">Click an empty adjacent cell to place</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <Card className="bg-gradient-to-br from-green-900/40 to-blue-900/40 border-green-500/50">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="text-4xl">
                {gameState.winnerId === playerId ? '🎉' : gameState.isTie ? '⚔️' : '🎓'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Tutorial Complete!</h3>
                <p className="text-green-200">
                  {gameState.winnerId === playerId 
                    ? 'Excellent! You\'ve mastered the basics and won your first battle!' 
                    : gameState.isTie
                    ? 'A strategic tie! You understand the game well!'
                    : 'Great job! You understand how the game works. Victory will come with practice!'
                  }
                </p>
              </div>
              <div className="text-sm text-green-300">
                You'll be taken to the main game shortly...
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}