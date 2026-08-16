import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase credentials are provided
const hasValidCredentials = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'

// Create a mock client for development if no credentials
const createSupabaseClient = () => {
  if (!hasValidCredentials) {
    console.warn('⚠️ Supabase credentials not configured. Using mock client.')
    // Return a minimal mock client for development
    return null
  }
  
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      // Enable email verification
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Configure email verification settings
      flowType: 'implicit'
    }
  })
}

export const supabase = createSupabaseClient()
export const isSupabaseConfigured = hasValidCredentials

// TypeScript interfaces for our auth system
export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    username?: string
  }
  email_confirmed_at: string | null
}

export interface AuthResponse {
  user: User | null
  session: Session | null
  error: any
  /**
   * Set when the address already has an account.
   *
   * Supabase answers a duplicate sign-up with 200, no error, and a user object
   * carrying a plausible-looking `confirmation_sent_at` — deliberately, so the form
   * cannot be used to discover who is registered. Nothing is sent. Only the empty
   * `identities` array gives it away.
   */
  alreadyRegistered?: boolean
}

export type { User, Session, SupabaseClient }