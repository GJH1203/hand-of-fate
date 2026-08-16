# Prometheus Monitoring Setup

## Overview
This document explains how to access and use Prometheus monitoring for the Card Game application.

## Local Development Setup

### Prerequisites
- Docker containers running (MongoDB, Nakama, PostgreSQL)
- Spring Boot application running on port 8080
- Prometheus installed via Homebrew

### Starting the Services

1. **Start Docker containers:**
   ```bash
   cd local-dev-cardgame
   docker-compose up -d
   ```

2. **Start Spring Boot with MongoDB credentials:**
   ```bash
   MONGODB_URI="mongodb://admin:SecurePass2024@localhost:27017/card_game?authSource=admin" ./gradlew bootRun
   ```

3. **Start Prometheus:**
   ```bash
   prometheus --config.file=prometheus-local.yml
   ```

## Accessing Prometheus UI

Open your browser and navigate to: **http://localhost:9090**

### Key Features of Prometheus UI:

1. **Graph Tab**: Query and visualize metrics
2. **Status → Targets**: Check if your application is being scraped successfully
3. **Status → Configuration**: View the current Prometheus configuration

## Available Custom Metrics

### Game Metrics
- `game_active` - Number of currently active games
- `game_created_total` - Total number of games created
- `game_completed_total` - Total number of games completed

### Player Metrics
- `player_active` - Number of currently active players
- `player_login_total` - Total number of player logins

### Connection Metrics
- `websocket_connections_active` - Number of active WebSocket connections

## Example Queries

In the Prometheus UI expression browser, try these queries:

1. **Current active games:**
   ```
   game_active
   ```

2. **Rate of game creation (per minute):**
   ```
   rate(game_created_total[5m]) * 60
   ```

3. **Player login rate:**
   ```
   rate(player_login_total[5m]) * 60
   ```

4. **JVM memory usage:**
   ```
   jvm_memory_used_bytes{area="heap"}
   ```

5. **HTTP request rate by endpoint:**
   ```
   rate(http_server_requests_seconds_count[5m])
   ```

## Deployment to DigitalOcean

For production deployment on DigitalOcean:

1. **Install Prometheus on your droplet:**
   ```bash
   chmod +x setup-prometheus.sh
   ./setup-prometheus.sh
   ```

2. **Create Prometheus configuration:**
   ```yaml
   # /etc/prometheus/prometheus.yml
   global:
     scrape_interval: 15s

   scrape_configs:
     - job_name: 'card-game-backend'
       metrics_path: '/actuator/prometheus'
       static_configs:
         - targets: ['localhost:8080']
   ```

3. **Create systemd service:**
   ```ini
   # /etc/systemd/system/prometheus.service
   [Unit]
   Description=Prometheus
   Wants=network-online.target
   After=network-online.target

   [Service]
   User=prometheus
   Group=prometheus
   Type=simple
   ExecStart=/usr/local/bin/prometheus \
     --config.file /etc/prometheus/prometheus.yml \
     --storage.tsdb.path /var/lib/prometheus/ \
     --web.console.templates=/etc/prometheus/consoles \
     --web.console.libraries=/etc/prometheus/console_libraries

   [Install]
   WantedBy=multi-user.target
   ```

4. **Start and enable Prometheus:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start prometheus
   sudo systemctl enable prometheus
   ```

5. **Open firewall port:**
   ```bash
   sudo ufw allow 9090
   ```

## Useful Prometheus Functions

- `rate()` - Calculate per-second rate of increase
- `increase()` - Total increase over time range
- `avg_over_time()` - Average value over time
- `max_over_time()` - Maximum value over time
- `histogram_quantile()` - Calculate quantiles from histograms

## Troubleshooting

1. **Check if metrics endpoint is accessible:**
   ```bash
   curl http://localhost:8080/actuator/prometheus
   ```

2. **Verify Prometheus targets:**
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

3. **Check Spring Boot logs for metric updates:**
   ```bash
   tail -f backend.log | grep -E "Game created|Game completed|Login"
   ```

## Next Steps

Consider adding:
- Alert rules for critical metrics
- Grafana for better visualization (optional)
- Long-term storage solution for metrics
- Additional custom metrics for business insights