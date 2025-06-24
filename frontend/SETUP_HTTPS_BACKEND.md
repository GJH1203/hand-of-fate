# Quick HTTPS/WSS Setup for Your Backend

## Prerequisites
- A domain name (you can get one from Namecheap, GoDaddy, or Cloudflare for ~$10/year)
- Point the domain to your server IP: 134.199.238.66

## Step 1: Install Nginx and Certbot (5 mins)

SSH into your server and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Stop nginx temporarily
sudo systemctl stop nginx
```

## Step 2: Configure Nginx (5 mins)

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/cardgame
```

Paste this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # API and WebSocket proxy
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific
        proxy_read_timeout 86400;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/cardgame /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl start nginx
```

## Step 3: Get SSL Certificate (5 mins)

```bash
sudo certbot --nginx -d yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

## Step 4: Update Your Backend CORS (2 mins)

Add your new domain to the CORS configuration in `WebConfig.java`:

```java
"https://yourdomain.com",
"https://card-game-frontend.vercel.app",
"https://card-game-frontend-*.vercel.app"
```

## Step 5: Update Vercel Environment Variable

Change `NEXT_PUBLIC_API_URL` to: `https://yourdomain.com`

## That's it! 

Your backend will now support:
- HTTPS API calls: `https://yourdomain.com/api/...`
- WSS WebSocket: `wss://yourdomain.com/ws/game`

## Free Domain Alternative

If you don't want to buy a domain, you can use a free subdomain service:
1. Go to https://www.duckdns.org/
2. Create a free account
3. Create a subdomain like `yourcardgame.duckdns.org`
4. Point it to your IP: 134.199.238.66
5. Use this free domain in the steps above

## Testing

After setup, test:
```bash
# Test HTTPS
curl https://yourdomain.com/actuator/health

# Test from browser
https://yourdomain.com/actuator/health
```