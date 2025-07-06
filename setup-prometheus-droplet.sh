#!/bin/bash

# Prometheus Setup Script for DigitalOcean Droplet
# Run this script on your DigitalOcean droplet

echo "=== Setting up Prometheus on DigitalOcean Droplet ==="

# Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Create prometheus user
echo "Creating prometheus user..."
sudo useradd --no-create-home --shell /bin/false prometheus

# Create directories
echo "Creating directories..."
sudo mkdir -p /etc/prometheus
sudo mkdir -p /var/lib/prometheus
sudo chown prometheus:prometheus /etc/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

# Download and install Prometheus
PROMETHEUS_VERSION="2.48.0"
echo "Downloading Prometheus ${PROMETHEUS_VERSION}..."
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
tar xvf prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz

# Install binaries
echo "Installing Prometheus binaries..."
sudo cp prometheus-${PROMETHEUS_VERSION}.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-${PROMETHEUS_VERSION}.linux-amd64/promtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool

# Copy console files
sudo cp -r prometheus-${PROMETHEUS_VERSION}.linux-amd64/consoles /etc/prometheus
sudo cp -r prometheus-${PROMETHEUS_VERSION}.linux-amd64/console_libraries /etc/prometheus
sudo chown -R prometheus:prometheus /etc/prometheus/consoles
sudo chown -R prometheus:prometheus /etc/prometheus/console_libraries

# Clean up
rm -rf prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz prometheus-${PROMETHEUS_VERSION}.linux-amd64

echo "Prometheus installation complete!"
echo ""
echo "Next steps:"
echo "1. Create /etc/prometheus/prometheus.yml configuration file"
echo "2. Create /etc/systemd/system/prometheus.service systemd service file"
echo "3. Start and enable Prometheus service"
echo "4. Open firewall port 9090"