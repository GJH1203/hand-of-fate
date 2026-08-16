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

export class UnauthorizedError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'You are not allowed to do that.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

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
 * `fetch` with the caller's identity attached.
 *
 * Pass a path (`/players/123`) and it is resolved against `NEXT_PUBLIC_API_URL`; pass a
 * full URL and it is used as-is.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()

  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(joinUrl(path), { ...init, headers })
}

/**
 * `apiFetch` that returns parsed JSON and turns the two rejections worth distinguishing
 * into named errors, so callers can tell "sign in again" from "not yours to touch".
 */
export async function apiFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)

  if (response.status === 401) {
    throw new UnauthorizedError()
  }
  if (response.status === 403) {
    throw new ForbiddenError()
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `Request to ${path} failed with ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}
