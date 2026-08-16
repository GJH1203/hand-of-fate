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
| Database | MongoDB Atlas M0, same region. Nakama has its own Postgres on the box |
| Auth | Supabase project `Hand-of-Fate` issues the JWT; Nakama issues game sessions |
| Secrets | SSM Parameter Store under `/hand-of-fate/`, read at task start |
| Cost | ~$6/month until the t4g free trial ends 2026-12-31, ~$19 after |

Shell access is SSM Session Manager, not SSH — there is no open port 22.
`infra/ecs/README.md` explains why the architecture looks the way it does; the
reasoning is mostly about avoiding a $32/month NAT gateway and a $16/month load
balancer.

The domain is `.org`. `handoffate.net` appears throughout the git history but
was never actually controlled — it sat in its registrar's reactivation period.
If it is ever recovered it becomes an alias, not a replacement.

## Known problems

These are real and confirmed, not speculation. None are fixed.

**Game state lives on the Player document.** Hand, placed cards, and the active
deck are fields on `Player`, not on the game. A player can therefore only be in
one game at a time, `convertToDto` re-reads every player on every state
conversion (and that runs once per connected socket per move), and finishing a
game has to "restore" the player's original deck — a crash mid-game loses it.

**Online matches are in-memory.** `NakamaMatchService` keeps matches in a
`ConcurrentHashMap` and never uses Nakama's match API despite the dependency.
A restart drops every active match, and the design cannot survive a second
instance. `getMatchState` scans the entire games collection on every call.

**No concurrency control.** No `@Version` on documents, no transactions.
Simultaneous writes overwrite each other.

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
Build, push to ECR, then
`aws ecs update-service --cluster hand-of-fate --service hand-of-fate --force-new-deployment`.

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
a checklist:

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
3. **Move game state onto the game.** The single change that unblocks
   concurrent games per player, kills the N+1 reads, and makes crash recovery
   possible.
4. **Make matches survive a restart.** Either commit to Nakama's match API or
   persist match state properly. Add optimistic locking while here.
5. **Hold 100 concurrent players.** Only meaningful once the above lands — load
   test, fix what it finds, decide whether one `t4g.small` is still the right
   size.
6. **Frontend.** Break up the 900-line components, fix reconnection, delete the
   dead services, replace the fake stats on the home page.

Ordering is deliberate: 3 and 4 rewrite the core, so 2 comes first.

## Conventions

- Commit messages: explain *why*, in prose. No session links, no bullet-point
  changelogs of what the diff already shows.
- Never commit `.env` files. `backend/.env.example` is the template.
- Working notes, task lists, and scratch files stay out of the repository —
  keep them outside the working tree.
- Verify claims before making them. Much of what looked true about this project
  turned out not to be: the domain, the surviving data, the CORS config.
