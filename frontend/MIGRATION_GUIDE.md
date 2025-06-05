# Frontend Authentication Migration Guide

## Overview
This guide explains the migration from the dual authentication system to the unified authentication system.

## Removed Files
The following files have been removed as they are no longer needed:

### Pages
- `src/app/auth/page.tsx` - Old Nakama authentication page
- `src/app/auth/supabase/page.tsx` - Old Supabase-specific authentication page

### Services
- `src/services/authService.ts` - Old Nakama-only authentication service

### Hooks
- `src/hooks/useAuth.tsx` - Old Nakama authentication hook
- `src/hooks/useSupabaseAuth.tsx` - Old Supabase authentication hook

## New Authentication Structure

### Pages
- `src/app/login/page.tsx` - Unified login/signup page
- `src/app/auth/callback/page.tsx` - Email verification callback (kept)

### Services
- `src/services/unifiedAuthService.ts` - Main authentication service
- `src/services/supabaseAuthService.ts` - Supabase client wrapper (kept as dependency)
- `src/services/userSyncService.ts` - Backend synchronization service (kept)

### Hooks
- `src/hooks/useUnifiedAuth.tsx` - Unified authentication hook

## Migration Steps for Components

### Before (Old Code)
```typescript
import { useAuth } from '@/hooks/useAuth';
// or
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const { user, isAuthenticated, logout } = useAuth();
```

### After (New Code)
```typescript
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

const { user, isAuthenticated, logout } = useUnifiedAuth();
```

## Route Changes
- `/auth` → `/login`
- `/auth/supabase` → `/login`
- `/auth/callback` → `/auth/callback` (unchanged)

## Authentication Flow
1. User signs up at `/login` with email verification
2. Email verification redirects to `/auth/callback`
3. Callback syncs user to backend and redirects to `/login`
4. User logs in and is redirected to home page

## Environment Variables
Ensure these are set in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing Checklist
- [ ] Login page loads correctly
- [ ] Signup with email verification works
- [ ] Login redirects to home page
- [ ] Logout redirects to login page
- [ ] Protected routes redirect unauthenticated users
- [ ] Game components have access to user data