import ColumnIndicator from '../ColumnIndicator';
import GameCell from '../GameCell';
import { BOARD_HEIGHT, BOARD_WIDTH, positionKey } from '@/lib/game/board';
import type { Card, ColumnScore, Position } from '@/types/game';

interface BoardGridProps {
  cards: Record<string, Card>;
  ownership: Record<string, string>;
  columnScores: Record<number, ColumnScore>;
  players: Record<string, string>;
  currentPlayerId: string;
  validMoves: Position[];
  selectedCard: Card | null;
  playable: boolean;
  onPlace: (x: number, y: number) => void;
}

/** The column headers and the five rows under them, sized as one block. */
export default function BoardGrid({
  cards,
  ownership,
  columnScores,
  players,
  currentPlayerId,
  validMoves,
  selectedCard,
  playable,
  onPlace,
}: BoardGridProps) {
  const width = { width: 'calc(var(--cell) * 3 + 1rem)' };
  const isLegal = (x: number, y: number) => validMoves.some((m) => m.x === x && m.y === y);

  return (
    <>
      <div className="mx-auto grid grid-cols-3 gap-2" style={width}>
        {Array.from({ length: BOARD_WIDTH }, (_, column) => (
          <ColumnIndicator
            key={column}
            columnIndex={column}
            columnScore={columnScores?.[column]}
            players={players}
            currentPlayerId={currentPlayerId}
          />
        ))}
      </div>

      <div className="flex min-h-0 items-center justify-center overflow-hidden">
        <div className="grid grid-cols-3 gap-2" style={width}>
          {Array.from({ length: BOARD_HEIGHT }, (_, y) =>
            Array.from({ length: BOARD_WIDTH }, (_, x) => {
              const key = positionKey(x, y);
              return (
                <GameCell
                  key={key}
                  position={{ x, y }}
                  card={cards[key] ?? null}
                  isValidMove={playable && isLegal(x, y)}
                  onCellClick={() => onPlace(x, y)}
                  selectedCard={selectedCard}
                  cardOwner={cards[key] ? ownership[key] : null}
                  currentPlayerId={currentPlayerId}
                  playerNames={players}
                />
              );
            }),
          ).flat()}
        </div>
      </div>
    </>
  );
}
