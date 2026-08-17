// Drives N concurrent games and measures how long a move takes to come back.
//
// Two numbers, both timed from the instant the acting socket sends GAME_ACTION:
//
//   action           until the acting player's own GAME_STATE_UPDATE arrives
//   action→broadcast until the opponent's GAME_STATE_UPDATE arrives
//
// The second is the one that decides whether the game feels real-time, and it is why
// this is a bespoke driver rather than a k6 script: both halves have to be timed against
// one clock, which means one process has to hold both sockets of a match.
//
// GameWebSocketHandler serves the two updates from the same loop, calling
// convertToDto once per session in the match, so the gap between the two numbers is
// roughly the cost of one conversion — which is the read amplification worth watching.
//
// Usage:
//   node drive.mjs                      50 games (100 sockets), 60s
//   GAMES=25 DURATION=120 node drive.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';
const WS_URL = BASE_URL.replace(/^http/, 'ws') + '/ws/game';
const GAMES = Number(process.env.GAMES ?? 50);
const DURATION_MS = Number(process.env.DURATION ?? 60) * 1000;
// The JVM serves the first moves through the interpreter. Anything sampled before the
// JIT has settled describes a warm-up, not the system.
const WARMUP_MS = Number(process.env.WARMUP ?? 15) * 1000;
// Think time between moves. Real players do not spam; without this the test measures
// saturation rather than latency under a plausible load.
const MOVE_INTERVAL_MS = Number(process.env.MOVE_INTERVAL ?? 1000);

const BOARD_WIDTH = 3;
const BOARD_HEIGHT = 5;
// GameService.placeInitialCards puts the creator here and the joiner opposite.
const CREATOR_START = { x: 1, y: 3 };
const JOINER_START = { x: 1, y: 1 };

const players = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'players.json'), 'utf8'),
);

if (players.length < GAMES * 2) {
    console.error(`need ${GAMES * 2} players for ${GAMES} games, players.json has ${players.length}`);
    process.exit(1);
}

// A reply that never comes has to fail the pair rather than park it forever: the whole
// point of the run is to find out when the server stops answering, and a driver that
// hangs at that moment reports nothing.
const REPLY_TIMEOUT_MS = Number(process.env.REPLY_TIMEOUT ?? 15) * 1000;

const samples = { action: [], broadcast: [] };
const counters = { moves: 0, games: 0, rejected: 0, errors: 0, timeouts: 0 };
let recording = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (pos) => `${pos.x},${pos.y}`;

/** Every empty cell orthogonally adjacent to one this player already holds. */
function legalMoves(own, occupied) {
    const candidates = new Map();
    for (const cell of own) {
        const [x, y] = cell.split(',').map(Number);
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const pos = { x: x + dx, y: y + dy };
            if (pos.x < 0 || pos.x >= BOARD_WIDTH || pos.y < 0 || pos.y >= BOARD_HEIGHT) continue;
            if (occupied.has(key(pos))) continue;
            candidates.set(key(pos), pos);
        }
    }
    return [...candidates.values()];
}

/**
 * A socket that resolves one waiter per message type.
 *
 * The driver only ever waits for the next update rather than correlating replies to
 * requests, which is all the protocol allows: GAME_STATE_UPDATE carries no reference to
 * the action that caused it. It is sound here because a match makes one move at a time.
 */
function connect(token) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(WS_URL, { headers: { authorization: `Bearer ${token}` } });
        const waiters = new Map();

        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            const waiter = waiters.get(message.type);
            if (waiter) {
                waiters.delete(message.type);
                waiter.deliver({ at: performance.now(), data: message.data });
            }
            if (message.type === 'ERROR') counters.rejected++;
        });

        socket.addEventListener('error', () => reject(new Error('socket error')));
        socket.addEventListener('close', () => {
            for (const [type, waiter] of waiters) waiter.fail(new Error(`socket closed waiting for ${type}`));
            waiters.clear();
        });
        socket.addEventListener('open', () => resolve({
            send: (type, data) => socket.send(JSON.stringify({ type, data })),
            next: (type) => new Promise((resolveNext, rejectNext) => {
                const timer = setTimeout(() => {
                    waiters.delete(type);
                    counters.timeouts++;
                    rejectNext(new Error(`timed out waiting for ${type}`));
                }, REPLY_TIMEOUT_MS);
                waiters.set(type, {
                    deliver: (value) => { clearTimeout(timer); resolveNext(value); },
                    fail: (error) => { clearTimeout(timer); rejectNext(error); },
                });
            }),
            close: () => socket.close(),
        }));
    });
}

async function post(path, token, body) {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(REPLY_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
    return response.json();
}

/** One move, timed on both sockets. Returns false when the game can go no further. */
async function playMove(actor, opponent, board) {
    const moves = legalMoves(actor.own, board.occupied);
    const hand = actor.hand;
    if (moves.length === 0 || hand.length === 0) return false;

    const card = hand[0];
    const position = moves[0];

    // Both waiters are armed before the send, or a fast reply could arrive first.
    const ownUpdate = actor.socket.next('GAME_STATE_UPDATE');
    const opponentUpdate = opponent.socket.next('GAME_STATE_UPDATE');

    const sentAt = performance.now();
    actor.socket.send('GAME_ACTION', {
        action: {
            type: 'PLACE_CARD',
            card: { id: card.id, name: card.name, power: card.power },
            targetPosition: position,
        },
    });

    const [own, other] = await Promise.all([ownUpdate, opponentUpdate]);

    if (recording) {
        samples.action.push(own.at - sentAt);
        samples.broadcast.push(other.at - sentAt);
    }
    counters.moves++;

    actor.own.add(key(position));
    board.occupied.add(key(position));
    actor.hand = own.data?.currentPlayerHand ?? hand.slice(1);
    opponent.hand = other.data?.currentPlayerHand ?? opponent.hand;
    return true;
}

/** Creates a match, plays it to exhaustion, and reports whether to start another. */
async function playGame(creator, joiner) {
    const { matchId } = await post('/api/online-game/create', creator.token);
    await post(`/api/online-game/join/${matchId}`, joiner.token);

    const seats = [
        { ...creator, socket: await connect(creator.token), own: new Set([key(CREATOR_START)]) },
        { ...joiner, socket: await connect(joiner.token), own: new Set([key(JOINER_START)]) },
    ];

    try {
        for (const seat of seats) {
            const joined = seat.socket.next('JOIN_SUCCESS');
            seat.socket.send('JOIN_MATCH', { matchId });
            await joined;
        }

        // JOIN_MATCH answers with a seat, not a board. The hand has to be asked for.
        for (const seat of seats) {
            const state = seat.socket.next('GAME_STATE_UPDATE');
            seat.socket.send('GAME_STATE_REQUEST', { matchId });
            seat.hand = (await state).data?.currentPlayerHand ?? [];
        }

        const board = { occupied: new Set([key(CREATOR_START), key(JOINER_START)]) };
        let turn = 0; // GameService starts the creator.

        while (Date.now() < deadline) {
            const played = await playMove(seats[turn], seats[1 - turn], board);
            if (!played) break;
            turn = 1 - turn;
            await sleep(MOVE_INTERVAL_MS);
        }
        counters.games++;
    } finally {
        for (const seat of seats) seat.socket.close();
    }
}

/** One pair of players, playing games back to back until the clock runs out. */
async function runPair(creator, joiner) {
    while (Date.now() < deadline) {
        try {
            await playGame(creator, joiner);
        } catch (error) {
            counters.errors++;
            if (counters.errors <= 5) console.error(`  ${creator.name}: ${error.message}`);
            await sleep(1000);
        }
    }
}

function percentile(sorted, p) {
    if (sorted.length === 0) return NaN;
    return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function report(label, values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const ms = (n) => (Number.isNaN(n) ? '—' : n.toFixed(1).padStart(8));
    console.log(
        `${label.padEnd(18)}${String(sorted.length).padStart(7)}` +
        `${ms(mean)}${ms(percentile(sorted, 50))}${ms(percentile(sorted, 95))}` +
        `${ms(percentile(sorted, 99))}${ms(sorted[sorted.length - 1])}`,
    );
}

const deadline = Date.now() + WARMUP_MS + DURATION_MS;

console.log(`${GAMES} games / ${GAMES * 2} sockets against ${BASE_URL}`);
console.log(`warmup ${WARMUP_MS / 1000}s, measuring ${DURATION_MS / 1000}s, ${MOVE_INTERVAL_MS}ms between moves\n`);

setTimeout(() => {
    recording = true;
    console.log('warmup over, recording\n');
}, WARMUP_MS);

const pairs = [];
for (let i = 0; i < GAMES; i++) {
    pairs.push(runPair(players[i * 2], players[i * 2 + 1]));
    // Opening a hundred sockets in the same tick measures the connect storm, not play.
    await sleep(50);
}

await Promise.all(pairs);

console.log(`\n${''.padEnd(18)}${'count'.padStart(7)}${'mean'.padStart(8)}${'p50'.padStart(8)}${'p95'.padStart(8)}${'p99'.padStart(8)}${'max'.padStart(8)}  (ms)`);
report('action', samples.action);
report('action→broadcast', samples.broadcast);
console.log(
    `\n${counters.moves} moves, ${counters.games} games, ${counters.rejected} rejected, ` +
    `${counters.timeouts} timed out, ${counters.errors} errors`,
);
// A run that lost replies did not measure latency, it measured a failure. Say so rather
// than leaving a healthy-looking percentile table to speak for itself.
if (counters.timeouts > 0 || counters.errors > 0) {
    console.log('\nThe server stopped answering during this run. The percentiles above');
    console.log('describe only the moves that came back, and understate what happened.');
}
