import { supabase } from './supabase'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * The single way this app talks to the backend.
 *
 * The Supabase access token has always been sitting in the browser; what was missing was
 * anyone sending it. Requests used to name a player id in the body and the backend took
 * that at face value, so knowing an id was the same as being that user. Every call now
 * carries `Authorization: Bearer <supabase access token>` and the backend decides who you
 * are from it.
 *
 * Supabase refreshes the token on its own, so reading the session before each request is
 * enough to stay current; `getSession()` reads from memory and only hits the network when
 * a refresh is actually due.
 */

/** The current Supabase access token, or null when nobody is signed in. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Could not read the Supabase session:', error)
    return null
  }
  return data.session?.access_token ?? null
}

function joinUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Fired when the backend refuses the session and refreshing it did not help.
 *
 * `UnifiedAuthProvider` listens for this and signs the user out. Dispatching an event
 * rather than redirecting from here keeps this module free of a dependency on the auth
 * service, which imports it.
 */
export const SESSION_EXPIRED_EVENT = 'handoffate:session-expired'

/** Guards against a burst of parallel 401s each announcing the same dead session. */
let expiryAnnounced = false

function announceSessionExpired(): void {
  if (typeof window === 'undefined' || expiryAnnounced) return
  expiryAnnounced = true
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

/** Call after a successful sign-in so a later expiry is announced again. */
export function resetSessionExpiry(): void {
  expiryAnnounced = false
}

function withAuth(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return { ...init, headers }
}

/**
 * `fetch` with the caller's identity attached.
 *
 * Pass a path (`/players/123`) and it is resolved against `NEXT_PUBLIC_API_URL`; pass a
 * full URL and it is used as-is.
 *
 * A 401 is worth one retry: Supabase refreshes access tokens on its own, but a tab left
 * open across the expiry can still send the stale one. If a forced refresh produces a
 * different token the request goes again; if the answer is still 401 the session is
 * genuinely gone and that is announced rather than handed back to the caller as another
 * "failed to fetch", which is what left people staring at errors with no way out.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const url = joinUrl(path)

  let response = await fetch(url, withAuth(init, token))
  if (response.status !== 401) {
    return response
  }

  const refreshed = token ? await forceRefresh() : null
  if (refreshed && refreshed !== token) {
    response = await fetch(url, withAuth(init, refreshed))
  }

  if (response.status === 401) {
    announceSessionExpired()
  }
  return response
}

/**
 * Reads a JSON body without trusting that there is one.
 *
 * `response.json()` throws a `SyntaxError` on an empty body, and an error path that
 * returns 500 with nothing in it is exactly when that happens — so the parse failure
 * replaced the real problem with "Unexpected end of JSON input" and the UI showed
 * whatever string was nearest. Returns null instead; the caller decides what to say.
 */
export async function readJson<T = unknown>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) return null
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function forceRefresh(): Promise<string | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) return null
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}
