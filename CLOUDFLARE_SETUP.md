# CloudFlare Integration Setup

## Overview
This setup integrates CloudFlare with your card game project using Option 1 (simple architecture).

## Current Architecture
- **Frontend**: `https://card-game-frontend.vercel.app` (Vercel)
- **Backend API**: `https://api.handoffate.org` (DigitalOcean + CloudFlare)
- **Monitoring**: `https://monitoring.handoffate.org/monitoring/` (DigitalOcean + CloudFlare)

## What's Configured

### Backend (Spring Boot)
- ✅ CORS support for CloudFlare domains via environment variable
- ✅ Support for `api.handoffate.org` subdomain
- ✅ WebSocket proxy configuration for real-time games

### CloudFlare DNS
- ✅ `api.handoffate.org` → 134.199.238.66 (Proxied)
- ✅ `monitoring.handoffate.org` → 134.199.238.66 (Proxied)
- ✅ SSL/TLS certificates (automatic)
- ✅ DDoS protection and security features

### DigitalOcean Droplet
- ✅ Nginx reverse proxy configuration
- ✅ Support for API, WebSocket, and monitoring endpoints
- ✅ Environment variable for CORS origins

## Deployment Steps

### 1. Deploy Backend Changes
```bash
# Copy the setup script to your droplet
scp cloudflare-setup.sh root@134.199.238.66:~/

# SSH to your droplet
ssh root@134.199.238.66

# Run the setup script
chmod +x cloudflare-setup.sh
./cloudflare-setup.sh

# Restart your Spring Boot application
# (however you normally restart it)
```

### 2. Update Frontend
In Vercel dashboard:
- Go to Settings → Environment Variables
- Set: `NEXT_PUBLIC_API_URL=https://api.handoffate.org`
- Redeploy if needed

### 3. Test Endpoints
- Frontend: `https://card-game-frontend.vercel.app`
- API Health: `https://api.handoffate.org/health`
- Prometheus: `https://api.handoffate.org/actuator/prometheus`
- Monitoring: `https://monitoring.handoffate.org/monitoring/`

## Benefits
- ✅ Professional API domain (`api.handoffate.org`)
- ✅ CloudFlare CDN for faster API responses
- ✅ DDoS protection for your backend
- ✅ Free SSL certificates
- ✅ Monitoring access via custom domain
- ✅ Easy to upgrade to full domain later

## Future Upgrade Path
To move frontend to `handoffate.org` later:
1. Change CloudFlare DNS for main domain to point to Vercel
2. Update Vercel domain settings
3. Update CORS configuration
4. Test and migrate users

## Troubleshooting
- **CORS Errors**: Check that `CORS_ALLOWED_ORIGINS` environment variable is set
- **API Not Accessible**: Verify Nginx is running and configuration is correct
- **SSL Issues**: CloudFlare provides automatic SSL - check SSL/TLS settings
- **WebSocket Issues**: Ensure Nginx WebSocket proxy configuration is correct