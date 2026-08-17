/**
 * Turns whatever came back from Supabase, the backend, or a thrown `fetch` into a
 * sentence a player can act on.
 *
 * The list is an allow-list on purpose. Anything not recognised is a server or
 * network failure as far as the user is concerned, and showing them the raw text —
 * "Unexpected end of JSON input", "Failed to create game session" — told them
 * nothing true and sent at least one person looking for a bug in their password.
 */
const REALM_UNREACHABLE = 'The realm is unreachable right now — please try again in a moment.'

export function humanizeAuthError(raw?: string | null): string {
  const text = (raw ?? '').trim()
  if (!text) return REALM_UNREACHABLE

  const lower = text.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password.'
  }
  if (lower.includes('email not confirmed') || lower.includes('verify your email')) {
    return 'Verify your email before signing in — the link is in your inbox.'
  }
  if (lower.includes('already registered') || lower.includes('already has an account')) {
    return 'That email already has an account. Sign in instead.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Wait a minute, then try again.'
  }
  if (lower.includes('at least 6') || lower.includes('password should be')) {
    return 'Password must be at least 6 characters.'
  }
  if (lower.includes('valid email') || lower.includes('invalid email')) {
    return 'That does not look like an email address.'
  }
  if (lower.includes('fill in all fields')) {
    return 'Fill in every field to continue.'
  }

  return REALM_UNREACHABLE
}

export { REALM_UNREACHABLE }
