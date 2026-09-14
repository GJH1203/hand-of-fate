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
      {/*
       * The headers are pulled down onto the board rather than floating in a gap
       * above it. -23px eats the 12px grid gap and the 11px of frame that follows
       * it, so the strip breaks the board's top rule and stops exactly at the
       * first row of cells — a totals line printed over the head of the form.
       *
       * It stops there on purpose. A card's ownership band sits at the head of
       * the cell when the card is the opponent's, so a strip that reached even
       * four pixels further would rub out the primary ownership signal on the top
       * row. The collision is worth having; eating that band is not.
       *
       * The strip carries its own paper so nothing shows through the gaps between
       * the three headers, and z-raised because the board is a later sibling and
       * would otherwise print over it.
       */}
      <div
        className="relative z-raised mx-auto -mb-[23px] grid grid-cols-3 gap-2 bg-paper"
        style={width}
      >
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
        {/*
         * The board is a ruled block, not fifteen loose squares. The frame is what
         * the header strip collides with, and it is unfilled: an empty cell is
         * paper-deep and a legal one paper-sunk, so any mat behind them would have
         * to be a fifth value and the legal-move read is the one thing on this
         * screen that may not get quieter.
         */}
        <div className="border-rule border-ink p-2.5">
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
      </div>
    </>
  );
}
