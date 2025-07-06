#!/bin/bash

# CloudFlare Setup Script for handoffate.org
# Run this on your DigitalOcean droplet

echo "=== CloudFlare Setup for handoffate.org (Option 1) ==="

# 1. Update CORS environment variable for your current Vercel domains + API domain
echo "Setting CORS environment variable..."
export CORS_ALLOWED_ORIGINS="https://card-game-frontend.vercel.app,https://card-game-frontend-*.vercel.app,https://*.vercel.app,https://api.handoffate.org"

# Add to /etc/environment for persistence
echo 'CORS_ALLOWED_ORIGINS=https://card-game-frontend.vercel.app,https://card-game-frontend-*.vercel.app,https://*.vercel.app,https://api.handoffate.org' | sudo tee -a /etc/environment

# 2. Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install nginx -y
fi

# 3. Configure Nginx for API and monitoring subdomains
echo "Configuring Nginx for CloudFlare..."
sudo tee /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
    
    # Actuator endpoints (health, metrics, prometheus)
    location /actuator/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket endpoints for real-time game
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Prometheus monitoring on monitoring.handoffate.org
    location /monitoring/ {
        proxy_pass http://localhost:9090/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Optional: Add basic auth for security
        # auth_basic "Monitoring Area";
        # auth_basic_user_file /etc/nginx/.htpasswd;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8080/actuator/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Default response
    location / {
        return 200 "Hand of Fate API Server - Use /api/ for API endpoints";
        add_header Content-Type text/plain;
    }
}
EOF

# 4. Test and restart Nginx
echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Restarting Nginx..."
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    echo "✅ Nginx configured successfully!"
else
    echo "❌ Nginx configuration error. Please check the config."
    exit 1
fi

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Update Vercel environment variable:"
echo "   NEXT_PUBLIC_API_URL=https://api.handoffate.org"
echo ""
echo "2. Restart your Spring Boot application to pick up new CORS settings:"
echo "   source /etc/environment"
echo "   # Then restart your Spring Boot service"
echo ""
echo "3. Test the endpoints:"
echo "   • Frontend: https://card-game-frontend.vercel.app"
echo "   • API Health: https://api.handoffate.org/health"
echo "   • API Prometheus: https://api.handoffate.org/actuator/prometheus"
echo "   • Monitoring: https://monitoring.handoffate.org/monitoring/"
echo ""
echo "Your CloudFlare setup is ready! 🎉"