# Monitoring Setup - Prometheus & Grafana

This guide explains how to set up monitoring for the Card Game backend using Prometheus and Grafana.

## Overview

- **Prometheus**: Collects metrics from Spring Boot application
- **Grafana**: Visualizes metrics with dashboards

## Prerequisites

- Docker and Docker Compose installed
- Spring Boot application running with Actuator endpoints exposed
- Port 3000 (Grafana) and 9090 (Prometheus) available

## Quick Start

### 1. Local Development (Docker Compose)

Run Grafana with Prometheus in Docker:

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

This will start:
- Grafana at http://localhost:3001 (default login: admin/admin)
- Prometheus at http://localhost:9090

### 2. Production Setup (DigitalOcean Droplet)

If you're running Prometheus as a system service on your droplet:

#### Run only Grafana in Docker:
```bash
# Edit docker-compose.monitoring.yml and comment out the prometheus service
# Update grafana datasource to use host.docker.internal:9090
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

#### Or install Grafana as a system service:
```bash
# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

# Start and enable Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

## Configuration Details

### Prometheus Configuration

The Prometheus configuration (`prometheus-local.yml` or `prometheus-droplet.yml`) scrapes:
- Prometheus itself at `localhost:9090`
- Card Game backend at `localhost:8080/actuator/prometheus`

### Grafana Configuration

Grafana is pre-configured with:
- Prometheus datasource
- Spring Boot monitoring dashboard

### Dashboard Features

The included Spring Boot dashboard monitors:
- JVM Heap Memory Usage
- Application Uptime
- HTTP Request Rate
- Response Time Percentiles
- MongoDB Connection Pool
- Error Rates (4xx and 5xx)

## Accessing Grafana

1. Open http://localhost:3001 (or your server IP:3001)
2. Login with admin/admin (you'll be prompted to change password)
3. Navigate to Dashboards → Browse
4. Click on "Card Game - Spring Boot Monitoring"

## Verifying Metrics

1. Check if Spring Boot is exposing metrics:
   ```bash
   curl http://localhost:8080/actuator/prometheus
   ```

2. Check if Prometheus is scraping successfully:
   - Go to http://localhost:9090/targets
   - All targets should show as "UP"

## Troubleshooting

### Prometheus Can't Reach Spring Boot
- Ensure Spring Boot actuator is configured in `application.properties`:
  ```properties
  management.endpoints.web.exposure.include=health,info,prometheus
  management.metrics.export.prometheus.enabled=true
  ```

### Grafana Can't Connect to Prometheus
- If using Docker, ensure both are on the same network
- If Prometheus is on host, use `host.docker.internal:9090` in datasource

### No Data in Dashboards
- Wait a few minutes for metrics to accumulate
- Check Prometheus targets are UP
- Verify Spring Boot is generating metrics

## Adding Custom Metrics

To add custom metrics in your Spring Boot application:

```java
@Component
public class GameMetrics {
    private final MeterRegistry meterRegistry;
    
    public GameMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    public void recordGameStarted() {
        meterRegistry.counter("game.started").increment();
    }
    
    public void recordGameDuration(long durationSeconds) {
        meterRegistry.timer("game.duration").record(durationSeconds, TimeUnit.SECONDS);
    }
}
```

## Security Considerations

For production:
1. Change default Grafana admin password
2. Configure proper authentication
3. Use HTTPS/TLS for external access
4. Restrict network access with firewall rules
5. Consider using Grafana behind a reverse proxy

## Backup

To backup Grafana dashboards and settings:
```bash
docker exec card-game-grafana grafana-cli admin export-dashboard-db card-game-spring-boot
```

## Further Reading

- [Spring Boot Actuator Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)