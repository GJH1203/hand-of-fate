import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/spinner';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { cn } from '@/lib/utils';
import { LeaderboardRecord } from '@/services/leaderboardService';

/*
 * The roll of names.
 *
 * NOTHING IN THE APPLICATION RENDERS THIS FILE. `Leaderboard` has no importers —
 * the same dead branch `ui/card.tsx` records at its head, since this component is
 * that file's only consumer. It is converted rather than deleted because deleting
 * a unit somebody may be about to wire up is the owner's call, not this one's.
 *
 * Three decisions worth the words, because all three were carried by colour before
 * and colour is the weakest channel this design has:
 *
 * 1. THE MEDALS ARE GONE. The three medal emoji were the only emoji in the
 *    product, and an emoji is a decorative icon wearing a character's clothes — it
 *    arrives in somebody else's drawing style, at somebody else's colour, and it is
 *    read aloud as "first place medal" by a screen reader sitting next to a column
 *    already headed "Rank".
 *
 * 2. ONLY FIRST PLACE IS MARKED. Silver and bronze went with the medals and are
 *    not coming back as tokens: silver in this system is LUNA, which means "your
 *    opponent" on every other screen, and borrowing it for second place would have
 *    the leaderboard contradicting the board. Gold is light, light is preeminence,
 *    and one row gets it — a gilt rule down its leading edge and a gilt numeral.
 *    Everything below is parchment, which is what a ranked list should look like:
 *    a list, with one name lit.
 *
 * 3. YOUR OWN ROW IS RAISED, NOT TINTED. `bg-primary/10` was a wash of the accent
 *    colour, which is the one thing gold may not be spent on. The row sits on
 *    night-2 instead — the raised value — and carries the plain cartouche reading
 *    "You". Depth and a word, rather than a tint, and both survive greyscale.
 */

const TABS = [
    { id: 'weekly' as const, label: 'Weekly' },
    { id: 'all-time' as const, label: 'All time' },
];

/* Table cells and column heads have to agree on their padding or the rule down the
   leading edge shifts the rank column out from under its own head. */
const LEAD = 'border-l-heavy pl-2.5';
const RANK_COL = 'w-14 pr-3 text-right';
const SCORE_COL = 'w-28 pl-3 text-right';

interface LeaderboardProps {
    className?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ className }) => {
    const {
        weeklyLeaderboard,
        allTimeLeaderboard,
        isLoading,
        error,
        fetchLeaderboardAroundPlayer,
        refreshLeaderboards
    } = useLeaderboard();
    const { user } = useUnifiedAuth();
    const [activeTab, setActiveTab] = useState<'weekly' | 'all-time'>('weekly');

    const currentLeaderboard = activeTab === 'weekly' ? weeklyLeaderboard : allTimeLeaderboard;
    const records = currentLeaderboard?.records ?? [];

    const handleShowAroundMe = async () => {
        if (user?.nakamaUserId) {
            await fetchLeaderboardAroundPlayer(user.nakamaUserId, activeTab);
        }
    };

    return (
        /*
         * `.panel` on top of `Card`'s own utilities. The two describe the same board
         * — night-1 behind a gilt rule — but only `.panel` carries the inner keyline
         * that makes a frame out of a border, and the frame is what says this is an
         * altarpiece panel rather than a box.
         */
        <Card className={cn('panel', className)}>
            <CardHeader className="items-center gap-4 space-y-0 pb-5 text-center">
                <CardTitle role="heading" aria-level={2}>
                    Leaderboard
                </CardTitle>

                {/*
                 * A register head: two inscriptions over one hairline, the live one
                 * cut through it in gold. Not two buttons, one of them gilded —
                 * `.btn--key` is the single gilded control a screen is allowed, and
                 * it belongs to whatever that screen exists to do, never to a filter.
                 */}
                <div className="flex w-full justify-center border-b-hair border-b-gold-deep">
                    {TABS.map(({ id, label }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setActiveTab(id)}
                                className={cn(
                                    'type-label -mb-px border-b-rule px-4 pb-2 pt-1',
                                    'transition-colors duration-lume',
                                    active
                                        ? 'border-b-gold text-gold-lit'
                                        : 'border-b-transparent text-parchment-3 hover:text-parchment',
                                )}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </CardHeader>

            <CardContent>
                {/*
                 * A rubric, not a red panel. Red in a manuscript is an index pointing
                 * at the place you are meant to look, so the cinnabar is the rule and
                 * the words stay parchment — cinnabar text on night does not clear AA
                 * at this size.
                 */}
                {error && (
                    <div role="alert" className="rubric type-small mb-5 text-[13px] text-parchment-2">
                        {error}
                    </div>
                )}

                {/*
                 * Wells the shape of the rows that are coming, breathing on the one
                 * loop this system permits. A spinner here would leave a hole the
                 * reader has to guess the size of.
                 */}
                {isLoading && (
                    <div role="status">
                        <span className="sr-only">Loading the leaderboard.</span>
                        {[0, 1, 2, 3, 4].map((row) => (
                            <div
                                key={row}
                                className="flex items-center gap-3 border-b-hair border-b-gold-deep py-3 pl-2.5 pr-2"
                            >
                                <Skeleton className="h-3 w-6" />
                                <Skeleton className="h-3 w-full max-w-[9rem]" />
                                <Skeleton className="ml-auto h-3 w-10" />
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && currentLeaderboard && (
                    <>
                        {records.length === 0 ? (
                            <div className="note text-center">
                                <p className="type-small text-parchment-2">
                                    {activeTab === 'weekly'
                                        ? 'No scores set this week.'
                                        : 'No scores set yet.'}
                                </p>
                                <p className="type-small mt-1 text-parchment-3">
                                    Win a duel to take a place here.
                                </p>
                            </div>
                        ) : (
                            /*
                             * A real table. This is tabular data with column heads, and
                             * the fifteen lines of grid it used to be told a screen
                             * reader nothing about which figure belonged to which head.
                             */
                            <table className="w-full table-fixed">
                                <caption className="sr-only">
                                    {activeTab === 'weekly'
                                        ? 'Weekly leaderboard'
                                        : 'All-time leaderboard'}
                                </caption>
                                <thead>
                                    <tr className="border-b-rule border-b-gold-deep">
                                        <th
                                            scope="col"
                                            className={cn(
                                                'type-label pb-2 align-bottom text-parchment-3',
                                                /* transparent, so the head keeps the
                                                   measure the gilt rule below sets */
                                                LEAD,
                                                'border-l-transparent',
                                                RANK_COL,
                                            )}
                                        >
                                            Rank
                                        </th>
                                        <th
                                            scope="col"
                                            className="type-label pb-2 pr-3 text-left align-bottom text-parchment-3"
                                        >
                                            Player
                                        </th>
                                        <th
                                            scope="col"
                                            className={cn(
                                                'type-label pb-2 align-bottom text-parchment-3',
                                                SCORE_COL,
                                            )}
                                        >
                                            Power score
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((record: LeaderboardRecord) => {
                                        const first = record.rank === 1;
                                        const isYou = user?.playerId === record.playerId;

                                        return (
                                            <tr
                                                key={`${record.playerId}-${record.rank}`}
                                                className={cn(
                                                    'border-b-hair border-b-gold-deep',
                                                    isYou && 'bg-night-2',
                                                )}
                                            >
                                                {/* Spectral, because every number in this
                                                    game is set in the text face. */}
                                                <td
                                                    className={cn(
                                                        'type-num py-2.5 text-[15px] leading-none',
                                                        LEAD,
                                                        first
                                                            ? 'border-l-gold text-gold-lit'
                                                            : 'border-l-transparent text-parchment-2',
                                                        RANK_COL,
                                                    )}
                                                >
                                                    {record.rank}
                                                </td>

                                                <td className="py-2.5 pr-3">
                                                    <span className="flex min-w-0 items-baseline gap-2">
                                                        <span className="type-small truncate text-parchment">
                                                            {record.username}
                                                        </span>
                                                        {isYou && (
                                                            <Badge tone="neutral" className="shrink-0">
                                                                You
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </td>

                                                <td
                                                    className={cn(
                                                        'type-num py-2.5 text-[15px] leading-none',
                                                        first ? 'text-gold-lit' : 'text-parchment',
                                                        SCORE_COL,
                                                    )}
                                                >
                                                    {record.score}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </>
                )}

                {/*
                 * Both controls at the foot, on the centre line, under a rule. They
                 * were in the head and on the right, which put two pieces of furniture
                 * between the title and the first name — and this design is axial.
                 */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t-rule border-t-gold-deep pt-5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshLeaderboards}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Refreshing' : 'Refresh'}
                    </Button>

                    {user?.nakamaUserId && records.length > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleShowAroundMe}
                            disabled={isLoading}
                        >
                            Show my place
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default Leaderboard;
