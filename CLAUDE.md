# Working on Hand of Fate

Read this before touching anything. It covers what the project is, where it
runs, what is already known to be broken, and what "done" means.

## What this is

A real-time 1v1 online card game. 3×5 board, five cards per player, place only
adjacent to your own cards, win the most columns. `README.md` has the rules and
an architecture diagram.

It began as a university exercise across two repositories and was merged into
this one in August 2026. A lot of the code still reflects its origins.

## Layout

```
.github/workflows/ CI on every push and PR; backend deploy is manual only.
backend/           Spring Boot 3.4 / Java 17, Gradle. arm64 Dockerfile.
frontend/          Next.js 15 / React 19 / TypeScript / Tailwind.
infra/local/       Compose stack: MongoDB, Postgres, Nakama.
infra/ecs/         CloudFormation for production. Read its README first.
infra/monitoring/  Prometheus + Grafana. Not currently deployed.
```

## Running locally

```bash
cd infra/local && docker compose up -d      # deps + backend
cd frontend && npm install && npm run dev   # :3000
```

`BACKEND_PORT` overrides 8080 if it is taken. The frontend needs
`frontend/.env.local` with Supabase credentials — ask, they are not in the repo.
The backend needs `SUPABASE_JWKS_URI` in `infra/local/.env` and refuses to start
without it; `infra/local/.env.example` is the template. It is not a secret.

Running the backend tests wants the same file sourced, for `MONGODB_URI`:

```bash
cd backend && set -a && . ../infra/local/.env && set +a && ./gradlew test
```

Everything is arm64: the deploy target is Graviton and the dev machine is Apple
Silicon. Nakama only ships arm64 images from **3.26.0** onward.

## Production

Live at **handoffate.org**. Do not assume anything below is still true — check.

| | |
|---|---|
| Frontend | Vercel, project `card-game-frontend`, root directory `frontend` |
| Backend | ECS on EC2, one `t4g.small`, `us-west-2`, four containers in one task |
| Ingress | Cloudflare Tunnel. The security group has **no inbound rules at all** |
| Database | MongoDB Atlas M0, same region. Nakama's Postgres is on an EBS volume mounted at `/var/lib/hand-of-fate`, kept apart from the instance so a replacement does not take it |
| Auth | Supabase project `Hand-of-Fate` issues the JWT; Nakama issues game sessions |
| Secrets | SSM Parameter Store under `/hand-of-fate/`, read at task start |
| Cost | ~$6.40/month until the t4g free trial ends 2026-12-31, ~$20 after. The extra over the old ~$6 is the 4 GB data volume; S3 backups are a rounding error |
| Backups | Nightly `mongodump` to S3, run as a scheduled ECS task. Atlas M0 has none of its own |
| Email | Supabase sends through Resend, from `noreply@mail.handoffate.org` |

Shell access is SSM Session Manager, not SSH — there is no open port 22.
`infra/ecs/README.md` explains why the architecture looks the way it does; the
reasoning is mostly about avoiding a $32/month NAT gateway and a $16/month load
balancer.

The domain is `.org`. `handoffate.net` appears throughout the git history but
was never actually controlled — it sat in its registrar's reactivation period.
If it is ever recovered it becomes an alias, not a replacement.

## Known problems

These are real and confirmed, not speculation.

**No rate limiting anywhere.** Not on login, not on anything. Supabase throttles its
own endpoints; this service does not.

**Nakama passwords are derivable.** `UnifiedAuthController` derives each player's
Nakama password from their player id and a constant that is in this repository, and
any signed-in user can get somebody else's player id from `/players/by-name/{name}`.
Not currently reachable — the security group has no inbound rules and Nakama's port
is not published — but exposing Nakama for any reason turns it into account
takeover.

**Game state lives on the Player document.** Hand, placed cards, and the active
deck are fields on `Player`, not on the game. A player can therefore only be in
one game at a time, `convertToDto` re-reads every player on every state
conversion (and that runs once per connected socket per move), and finishing a
game has to "restore" the player's original deck — a crash mid-game loses it.

**Nakama's Postgres holds account state and has no backup.** The nightly `mongodump`
to S3 covers MongoDB and nothing else, but a player's *game* account lives in
Nakama's Postgres on the data volume. Losing that volume loses every game account
while MongoDB still holds a `nakamaUserId` for each of them — which is not
hypothetical: it happened when Nakama's Postgres moved onto its own volume and came
up empty, and it locked every account created before that deploy out of the game
from 2026-08-16 04:37 PDT until the login path learned to recreate a missing
account. That recovery is in place now, so the failure is survivable, but the
backup gap is not fixed: the volume is still the only copy. `pg_dump` alongside the
existing `mongodump` job is the obvious answer.

**Online matches are in-memory, and they are never released.** `NakamaMatchService`
keeps matches in a `ConcurrentHashMap` and never uses Nakama's match API despite the
dependency. A restart drops every active match, and the design cannot survive a
second instance. `getMatchState` scans the entire games collection on every call.

`cleanupMatch` exists to empty `matchMetadata`, `matchSubscriptions` and
`activeSockets` for a finished match, and **nothing calls it**. A completed game
leaves its entries behind for the life of the process; `handleGameAction` logs the
completion and returns. This is measured, not suspected — see below.

**~~The backend runs out of memory at 100 concurrent players.~~** Fixed in the
Dockerfile, which now sizes the JVM against the 768 MiB the task actually has.
`MaxRAMPercentage=70` capped the heap at 537 MiB and left too little for metaspace,
the code cache and a stack per Tomcat thread; the kernel killed it forty seconds
into a second run at 100 concurrent players. The heap was never the problem — a
full GC showed ~30 MiB live. It now sustains 100 concurrent sockets: 6,110 moves
over two minutes, no errors, RSS flat at ~630 MiB.

**~~The tail grows with the size of the games collection.~~** Was p99 755 ms rising
past two seconds once a few hundred games had accumulated. The collections carried
no indexes at all — `spring.data.mongodb.auto-index-creation` defaults to false, so
the `@Indexed` annotations built nothing — and `getMatchState` read every game into
the JVM to find one. `MongoIndexes` now creates what the hot queries need, that
lookup is an equality query, and a move no longer re-reads players once per
connected socket. p95 205 ms → 52 ms, p99 755 ms → 91 ms, max 1.8 s → 196 ms, and a
second run against 850 accumulated games only reaches p95 60 ms.

**Player's unique indexes do not exist.** `Player` declares `@Indexed(unique = true)`
on name, email, `nakamaUserId` and `supabaseUserId`, and none of them is built,
because auto-index-creation is off. Nothing at the database level stops a second
account on an existing email — which is exactly what the `@Disabled` test in
`SupabaseEmailVerificationIntegrationTest` says. Turning auto-index-creation on is
*not* the fix on its own: the indexes are not sparse and those last two fields are
nullable, so a second document with a null would fail the build and stop the
application starting. It needs a duplicate audit against production first.

Numbers come from an Apple Silicon laptop with two CPUs allocated, against a local
MongoDB. Production is a `t4g.small` sharing two vCPU with postgres, Nakama and
cloudflared, so it has *less* CPU than this. The memory conclusion transfers,
because the 768 MiB budget is the same; the latencies do not.

**No concurrency control.** No `@Version` on documents, no transactions.
Simultaneous writes overwrite each other.

**Nothing notices a wedged application.** The auto scaling group's health check is
`EC2`, which sees a dead instance and nothing else. A backend that is running but
answering nothing is invisible to it. It has already caught nobody out once, during
the deploy that moved Nakama's Postgres onto its own volume.

`ServiceStoppedAlarm` in `infra/ecs/cloudformation.yml` now covers half of this: it
watches `AWS/ECS` `LiveTaskCount`, which is published every minute *without*
Container Insights — that is what makes it free, since Container Insights is billed
per metric and stays disabled on the cluster. Five evaluation periods, because a
deploy legitimately sits at zero tasks for two to four minutes. It emails the
address in the `AlertEmail` parameter through SNS.

What is still missing is the half that catches a backend answering nothing while
its task is happily running — an external uptime check on `https://handoffate.org`
and `https://api.handoffate.org/actuator/health`. That is the only thing that would
have said anything during the outage above, and it wants a third-party monitor
rather than anything in this template.

**Prometheus and Grafana are not the answer to this, yet.** They draw graphs; they
do not tell anyone. `infra/monitoring` still holds the old setup and it is tempting
to put it back, but the instance has ~200 MiB spare of 2 GiB, which is why that
stack lived on a separate droplet costing more than everything else here. There is
also nothing to look at: with almost no players every graph is a flat line, and
`/actuator/prometheus` now needs an admin credential a scraper would have to be
given. It becomes worth the money and the memory at goal 5 below, where the
question is which resource gives out first under load — and that question cannot be
answered by guessing.

**`frontend/.env.production` is not in the repository.** It is covered by the
`.env*` rule in `.gitignore` and was untracked in `f48c6ce`, so a fresh clone does
not have one and a local `npm run build` falls back to `localhost:8080`. This
machine's copy still names `funnygames.duckdns.org`, a host that has not existed
for months; the deployed build is unaffected either way, because Vercel's own
environment variables are what production reads. Nothing here can be fixed by a
commit — the file to correct is the one on your own disk, and the address it
should name is `https://api.handoffate.org`.

**Most tests still need infrastructure.** The suite runs in CI now, and the
security tests are plain unit tests, but everything else is still
`@SpringBootTest` against a live MongoDB — there is no Testcontainers. Each
class uses a database of its own; they used to share one and delete each other's
data. Two tests are `@Disabled`, each with the reason on it: adjacency
validation wrongly permits some moves, and player creation does not reject a
second account on an existing email.

**Frontend reconnect is dead code.** `connect()` sets `isReconnecting = true`
on entry and `handleReconnect()` returns early when it is true, so a dropped
socket never reconnects. `gameSocketService.ts` and `userSyncService.ts` have no
importers at all.

## Before changing the backend

**The site is live.** Deploying takes it down for the length of a container
start: there is one instance and the task uses host networking, so two copies
cannot run side by side and the service is set to `MinimumHealthyPercent: 0`.
Build, push to ECR, then deploy the stack — `aws cloudformation deploy` picks up a
new `BackendImage` and rolls the service on its own; `aws ecs update-service
--force-new-deployment` is only needed when nothing in the template changed.

**Changing user data does not touch the running instance.** The auto scaling group
leaves it alone and the new launch template version is only used by the next
instance, so a boot-time change is inert until you terminate the current one. Which
also means the data volume is only picked up by a replacement.

**The frontend has to be live before the backend that requires it.** Both sides
now speak bearer tokens, but they do not ship at the same instant: the frontend
deploys on push to `main` while the backend needs an explicit ECR push. That
ordering is the safe one and it happens on its own — a frontend that sends an
`Authorization` header works fine against a backend that ignores it, so merge,
let Vercel finish, then deploy the backend. Doing it the other way round logs
everybody out until the frontend catches up.

## The goal

A stable, genuinely deployable product: roughly **100 concurrent players**, no
severe bugs, and a codebase that reads as production work rather than
coursework. Roughly in dependency order — each is a session's worth of work, not
a checklist.

Asked what to work on, read this list together with Known problems above and
propose an ordered set to pick from, rather than starting on one. The severe
problems are gone; what is left is a mix of sizes, and which of them is worth a
session is a judgement call that changes with what the project needs next.

1. ~~**Make the backend trustworthy.**~~ Done. Every request carries a Supabase
   JWT verified against the project's published JWKS, the WebSocket handshake is
   authenticated and the socket's player id comes from the token, and
   `/admin/**` needs a Supabase id on an allowlist that is empty by default.
   Still open: `/players/by-name/{name}` answers with more of another player
   than a caller needs, and `/auth/**` and `/chat/**` are shut behind the admin
   role rather than removed.
2. **Make it testable, then test it.** CI runs on every push now. What is left
   is unit-testable game logic and Testcontainers, so the suite stops needing a
   MongoDB somebody remembered to start. This is also what makes the later
   refactors safe.
3. **Move game state onto the game.** (Backups exist now, so this is no longer a
   change made without a net.) The single change that unblocks
   concurrent games per player, kills the N+1 reads, and makes crash recovery
   possible. It also turns a move into one document write, which is what makes
   the next item small: MongoDB is atomic per document on its own, so what is
   left afterwards is `@Version` for the read-modify-write race, not transactions.
   **This is the next session's work**; the working checklist is in the notes
   outside the repository.
4. **Make matches survive a restart,** with optimistic locking. Either commit to
   Nakama's match API or persist match state properly.

   Afterwards a projection becomes worth building, and only afterwards: the read
   side needs one clean thing to project from, and today the write model is split
   across `Player` documents. Measured 2026-08-17: **only `currentPlayerHand`
   varies per player** in `convertToDto` — board, ownership, placed cards, names,
   column scores and state are identical for everyone, and that identical part is
   rebuilt once per connected socket on every move. Building it once per move
   instead is worth doing on its own, before any of the architecture.

   Note that the broadcast has to go out immediately after the move, so such a
   projection would be updated synchronously. That is a cached view rather than
   eventual consistency, and calling it CQRS oversells it.

   **A Redis cache is not the step after that.** With one instance, an in-memory
   projection is faster, free, and one fewer thing that can fail; ElastiCache's
   cheapest node roughly doubles the bill. It becomes the right answer when there
   is a second instance to share the projection with — which is this item — and
   not before.
5. **Hold 100 concurrent players.** It does, and now holds them well: p50 11 ms,
   p95 52 ms, p99 91 ms over two minutes of sustained 100-socket play, no errors,
   memory flat. What is left is a decision rather than work — a move still costs
   about ten database round trips, and the floor while the database is on the hot
   path is one Atlas round trip times that. Taking it off the hot path is item 4.
   Prometheus and Grafana are still not worth the money: every question so far got
   answered by `docker stats`, a class histogram and a container exit code.
6. **Frontend.** Break up the 900-line components, fix reconnection, delete the
   dead services. (The home page's Power Score is real data, not a placeholder —
   that item was stale.)

Ordering is deliberate: 3 and 4 rewrite the core, so 2 comes first.

## Conventions

- One commit per logical change, and keep each one small enough to review in a
  sitting. A branch of five focused commits is right; one commit touching a
  dozen unrelated files is not, and being the only person on the project is not
  a reason to skip this. Documentation about a change belongs in the commit
  that makes it.
- Commit messages: explain *why*, in prose. A subject line on its own is enough
  for a change that speaks for itself; a short paragraph under it when the
  reasoning is not obvious from the diff. Never longer than that. No session
  links, no bullet-point changelogs of what the diff already shows.
- Never commit `.env` files. `backend/.env.example` is the template.
- Working notes, task lists, and scratch files stay out of the repository —
  keep them outside the working tree.
- Verify claims before making them. Much of what looked true about this project
  turned out not to be: the domain, the surviving data, the CORS config.
