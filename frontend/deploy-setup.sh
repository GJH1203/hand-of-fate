#!/bin/bash

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/card-game
cd /opt/card-game

# Install git
apt-get install -y git

echo "✅ Docker and Docker Compose installed!"
echo "Next steps:"
echo "1. Clone your repository"
echo "2. Navigate to local-dev-cardgame directory"
echo "3. Run docker-compose up -d"