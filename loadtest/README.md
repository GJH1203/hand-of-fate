# Load test

Measures how long a move takes to come back, under concurrent play.

Two numbers, both timed from the moment the acting socket sends `GAME_ACTION`:

| | |
|---|---|
| **action** | until the acting player's own `GAME_STATE_UPDATE` arrives |
| **action→broadcast** | until the *opponent's* `GAME_STATE_UPDATE` arrives |

The second decides whether the game feels real-time. It is also why this is a
driver of its own rather than a k6 script: both halves have to be timed against
one clock, so one process has to hold both sockets of a match.

`GameWebSocketHandler.handleGameAction` serves both updates from one loop,
calling `convertToDto` once per session in the match, and `convertToDto` re-reads
every player. The gap between the two numbers is roughly one conversion — which
makes it the read amplification, measured.

## Do not point this at production

`handoffate.org` sits behind a Cloudflare Tunnel and on an Atlas M0. You would be
measuring Cloudflare and Atlas's shared-tier throttling rather than this code,
you would be filling the production database with `loadtest_*` accounts, and one
`t4g.small` serves the real site. Run it against a stack of your own.

## Running it

Four terminals, in order.

**1. Serve the load-test signing key.** A hundred players signing in through the
real Supabase project would hit its auth rate limits and leave a hundred junk
accounts in the production user table. Instead the backend is pointed at a key
that exists only here — `security.jwt.jwk-set-uri` is a plain environment
variable, so nothing in the application has to change.

```bash
node loadtest/jwks-server.mjs
```

**2. Bring up a backend that trusts it.** In `infra/local/.env`:

```
SUPABASE_JWKS_URI=http://host.docker.internal:9999/.well-known/jwks.json
SUPABASE_JWT_ISSUER=
```

`host.docker.internal` because the backend runs in a container, where
`localhost` is the container. The empty issuer matters: `security.jwt.issuer` is
only enforced when it is set, and these tokens carry no `iss`.

```bash
cd infra/local && docker compose up -d --force-recreate backend
```

Production gives the backend container 768 MiB and `infra/local` gives it 640.
Raise `mem_limit` to `768m` before a run whose numbers you intend to compare
against production, or the heap you measured is not the heap that ships.

**3. Create the players.** Idempotent — re-running against a database that was
not wiped reuses the same accounts.

```bash
PLAYERS=100 node loadtest/seed.mjs
```

Each player gets a Nakama account and a starting deck, so this takes a couple of
minutes and is the reason seeding is a separate step from driving.

**4. Drive it.**

```bash
GAMES=50 DURATION=60 node loadtest/drive.mjs
```

`GAMES=50` is 100 concurrent sockets, which is the 100 concurrent players in the
goal. Everything is tunable: `DURATION` and `WARMUP` in seconds, `MOVE_INTERVAL`
in milliseconds, `BASE_URL` for a backend that is not on `localhost:8080`.

## Reading the result

```
                    count    mean     p50     p95     p99     max  (ms)
action                812    14.3    11.2    28.7    46.1    91.4
action→broadcast      812    19.8    16.4    38.2    61.7   118.3
```

`WARMUP` exists because the JVM serves the first moves through the interpreter;
samples taken before the JIT settles describe a warm-up, not the system.

`MOVE_INTERVAL` defaults to one second because real players do not spam. Dropping
it measures saturation instead of latency under plausible load — a different and
also useful question, but not the same one.

Watch `rejected` and `errors` at the bottom. A run with a meaningful number of
either is not a latency measurement, it is a bug report.

## What the numbers are not

A run on an Apple Silicon laptop against a local Mongo is faster than one
`t4g.small` talking to Atlas across a network, so these are not production
latencies and should not be quoted as such. What they are good for is comparison:
the same harness before and after a change, on the same machine, says exactly
what the change did.
