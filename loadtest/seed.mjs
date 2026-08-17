// Creates the players the load test drives, and writes their ids and tokens to
// players.json for drive.mjs to read.
//
// Seeding goes through /api/auth/sync-verified-user rather than writing to Mongo
// directly, because that endpoint is also what gives each player a Nakama account and a
// starting deck — a player inserted behind its back cannot join a match.
//
// It is idempotent: the endpoint returns the existing player when the Supabase id is
// already known, so re-running it against a database that was not wiped is cheap and
// safe. Run it against a load-test stack, never against production.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mintToken } from './token.mjs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';
const PLAYER_COUNT = Number(process.env.PLAYERS ?? 100);
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), 'players.json');

// Distinct from any real Supabase id, and stable across runs so re-seeding reuses the
// same players instead of growing the collection every time.
const supabaseUserId = (index) => `loadtest-${String(index).padStart(4, '0')}`;

async function createPlayer(index) {
    const token = mintToken(supabaseUserId(index));
    const name = `loadtest_${String(index).padStart(4, '0')}`;

    const response = await fetch(`${BASE_URL}/api/auth/sync-verified-user`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: name, email: `${name}@loadtest.invalid` }),
    });

    if (!response.ok) {
        throw new Error(`${name}: ${response.status} ${await response.text()}`);
    }

    const body = await response.json();
    const playerId = body.playerId ?? body.player?.id ?? body.id;
    if (!playerId) {
        throw new Error(`${name}: no player id in ${JSON.stringify(body)}`);
    }
    return { name, playerId, token };
}

// Nakama account creation is the slow part and it is per player, so seeding a hundred
// serially takes minutes. Ten at a time is enough to hide the latency without turning
// the seed itself into the load test.
async function seed() {
    const players = [];
    const CONCURRENCY = 10;

    for (let start = 0; start < PLAYER_COUNT; start += CONCURRENCY) {
        const batch = [];
        for (let i = start; i < Math.min(start + CONCURRENCY, PLAYER_COUNT); i++) {
            batch.push(createPlayer(i));
        }
        players.push(...await Promise.all(batch));
        process.stdout.write(`\rseeded ${players.length}/${PLAYER_COUNT}`);
    }

    process.stdout.write('\n');
    writeFileSync(OUTPUT, JSON.stringify(players, null, 1));
    console.log(`wrote ${players.length} players to ${OUTPUT}`);
}

seed().catch((error) => {
    console.error(`\n${error.message}`);
    process.exit(1);
});
