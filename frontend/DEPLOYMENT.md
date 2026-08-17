# Deploying the frontend

The frontend is a Vercel project (`card-game-frontend`, root directory `frontend`)
that deploys on every push to `main`. There is nothing to run by hand.

## Environment variables

Set in the Vercel dashboard, not in a file — `.env.production` in this repository
is only a local fallback and its values are stale.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.handoffate.org` |
| `NEXT_PUBLIC_SUPABASE_URL` | the Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the Supabase anon key |

`NEXT_PUBLIC_API_URL` is read by `lib/apiClient.ts` for REST calls and by
`services/gameWebSocketService.ts`, which derives the `wss://` origin from it.

## How it reaches the backend

Directly, over HTTPS. `api.handoffate.org` is a Cloudflare Tunnel to the ECS
instance — the security group has no inbound rules at all, so there is no origin
to reach except through the tunnel. The backend's allowed origins are in
`backend/.../config/AllowedOrigins.java`, and a new frontend domain has to be added
there before the browser will be allowed to call it.

The `app/api/backend/[...path]` route is a proxy from an earlier setup where the
backend had no TLS. Nothing routes through it now; it forwards the `Authorization`
header if anything ever does.

## The backend

Deployed separately and by hand — see `infra/ecs/README.md`. It does not deploy on
push, so a change that spans both sides lands in two steps. Merge first and let
Vercel finish, then push the backend: a frontend sending an `Authorization` header
works fine against a backend that ignores it, and the reverse logs everybody out.
