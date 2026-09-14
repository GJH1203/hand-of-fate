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

/**
 * THE TRIPTYCH — an arcade of three arches over a gilded field.
 *
 * The board is the altar of the product and this is where it is built. Two
 * things carry it, and both of them come out of the rules rather than a mood.
 *
 * THE FIELD IS GOLD. In icon painting the gold ground is not a colour, it is
 * uncreated light — the space the figures stand in. So the fifteen squares stand
 * on leaf, and that is the only large passage of gold anywhere in the product.
 * It is what makes the eye land on the board first on every screen it appears
 * on, without an animation or an outline asking it to. The cards placed on it
 * are night panels, so a played card is the darkest thing on the brightest
 * thing: the strongest figure-ground the palette can make.
 *
 * THE COLUMN HEADS ARE AN ARCADE. Three columns — a centre panel between two
 * wings — and you win by taking two of the three. That is the form of every
 * devotional painting ever made and it was in the rules the whole time. So each
 * head is a real arch: an arched niche of night cut into the gilded wall, one
 * cell wide, standing exactly over the column it counts. Gold shows between them
 * as the piers and the spandrels.
 */
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
       * THE ARCADE.
       *
       * The strip is gilded and framed on its two sides to exactly the board's
       * outer measure, so the gold runs unbroken from the springing of the
       * arches down through the fifteen squares: one field, pierced at the head
       * by three openings. Nothing is drawn between the two — they are the same
       * wall.
       *
       * It is pulled down onto the board rather than floating in a gap above it.
       * -23px eats the 12px grid gap and the 11px of frame that follows it, so
       * the strip stops exactly at the first row of cells.
       *
       * It stops there on purpose. An opponent's card carries its crescent at
       * the HEAD of the cell, so a strip that reached even four pixels further
       * would rub out the primary ownership signal on the top row. The collision
       * is worth having; eating that mark is not.
       *
       * z-raised because the board is a later sibling and would otherwise print
       * over the strip's lower half.
       */}
      <div className="gilt relative z-raised mx-auto -mb-[23px] border-x-rule border-gold-deep px-2.5">
        <div className="grid grid-cols-3 gap-2" style={width}>
          {Array.from({ length: BOARD_WIDTH }, (_, column) => (
            /*
             * The niche. An arch marks something that contains a figure, and
             * what this one contains is the column's reading. The head is drawn
             * in the leaf and the foot is left open — the piers descend into the
             * gold rather than closing off the column they stand over.
             *
             * The explicit text colour is load-bearing: `.gilt` sets the ink for
             * the gilded ground on everything inside it, and this niche is night
             * again, so anything in the head that does not name its own colour
             * would otherwise be printed in near-black on it.
             */
            <div key={column} className="relative text-parchment">
              <span
                aria-hidden
                className="absolute inset-0 rounded-arch-deep border-rule border-b-0 border-gold bg-night-1"
              />
              <ColumnIndicator
                columnIndex={column}
                columnScore={columnScores?.[column]}
                players={players}
                currentPlayerId={currentPlayerId}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 items-center justify-center overflow-hidden">
        {/*
         * The gilded field, framed in the shadowed side of the leaf. The frame's
         * top edge is covered by the arcade above, which is the point: the strip
         * and the field are the same measure to the pixel, so there is no seam
         * for the eye to find.
         *
         * The geometry here is load-bearing. 2px of frame and 10px of padding is
         * the 12px the arcade's -23px is measured against, and the block's height
         * has to stay five cells, four gaps and that 12px twice over — the cell
         * size is derived from exactly that sum in OnlineGameBoard.
         */}
        <div className="gilt border-rule border-gold-deep p-2.5">
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
