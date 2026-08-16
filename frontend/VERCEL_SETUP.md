# Vercel Environment Variables Setup for Direct Backend Connection

## Update Your Vercel Environment Variables

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Update the following:

### Remove:
- `BACKEND_URL` - This is no longer needed

### Update:
- `NEXT_PUBLIC_API_URL` = `http://134.199.238.66:8080`

### Keep:
- `NEXT_PUBLIC_SUPABASE_URL` - Keep as is
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Keep as is

## Important Notes:

1. **HTTPS vs HTTP**: Since your backend is running on HTTP (port 8080), some browsers might block mixed content when your Vercel app (HTTPS) tries to connect to HTTP backend. Consider:
   - Setting up HTTPS on your backend with a domain name
   - Or using a reverse proxy like Nginx with SSL certificate

2. **CORS**: Your backend must allow your Vercel domains. The updated WebConfig.java already includes:
   - `https://card-game-frontend-*.vercel.app`
   - `https://card-game-frontend.vercel.app`
   - `https://*.vercel.app`

## After Updating:

1. **Redeploy on Vercel**: Your app will automatically redeploy when you update environment variables

2. **Test the connection**: Visit your Vercel app and try to log in

## Troubleshooting:

If you still get CORS errors:
1. Check browser console for the exact error
2. Ensure your backend is running and accessible from the internet
3. Try accessing `http://134.199.238.66:8080/api/auth/login-with-supabase` directly in browser - it should show a method not allowed error (405) for GET requests, which means it's accessible

## Security Recommendation:

For production, you should:
1. Set up a domain name for your backend (e.g., api.yourcardgame.com)
2. Configure HTTPS with Let's Encrypt
3. Update `NEXT_PUBLIC_API_URL` to use the HTTPS URL