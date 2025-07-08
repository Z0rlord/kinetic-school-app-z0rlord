#!/bin/bash

# DigitalOcean Droplet Setup Script for Student Profile System
# This script sets up a basic droplet with Node.js, MariaDB, and HashiCorp Vault

set -e

echo "🚀 Starting DigitalOcean droplet setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 18.x
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
echo "✅ Node.js installed: $node_version"
echo "✅ npm installed: $npm_version"

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install MariaDB
echo "🗄️  Installing MariaDB..."
sudo apt install -y mariadb-server mariadb-client

# Secure MariaDB installation (automated)
echo "🔒 Securing MariaDB installation..."
sudo mysql -e "UPDATE mysql.user SET Password = PASSWORD('${DB_ROOT_PASSWORD:-SecureRootPass123!}') WHERE User = 'root'"
sudo mysql -e "DELETE FROM mysql.user WHERE User=''"
sudo mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1')"
sudo mysql -e "DROP DATABASE IF EXISTS test"
sudo mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%'"
sudo mysql -e "FLUSH PRIVILEGES"

# Create application database and user
echo "🗄️  Creating application database..."
DB_NAME=${DB_NAME:-student_profile_db}
DB_USER=${DB_USER:-app_user}
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32)}

sudo mysql -u root -p"${DB_ROOT_PASSWORD:-SecureRootPass123!}" <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "✅ Database created: $DB_NAME"
echo "✅ Database user created: $DB_USER"

# Install HashiCorp Vault
echo "🔐 Installing HashiCorp Vault..."
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y vault

# Create vault user and directories
echo "🔐 Setting up Vault..."
sudo useradd --system --home /etc/vault.d --shell /bin/false vault
sudo mkdir -p /opt/vault/data
sudo mkdir -p /etc/vault.d
sudo chown -R vault:vault /opt/vault/data
sudo chown -R vault:vault /etc/vault.d

# Create Vault configuration
sudo tee /etc/vault.d/vault.hcl > /dev/null <<EOF
ui = true
disable_mlock = true

storage "file" {
  path = "/opt/vault/data"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}

api_addr = "http://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"
EOF

# Create Vault systemd service
sudo tee /etc/systemd/system/vault.service > /dev/null <<EOF
[Unit]
Description=HashiCorp Vault
Documentation=https://www.vaultproject.io/docs/
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=/etc/vault.d/vault.hcl
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=notify
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_IPC_LOCK
Capabilities=CAP_IPC_LOCK+ep
CapabilityBoundingSet=CAP_SYSLOG CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
ExecReload=/bin/kill --signal HUP \$MAINPID
KillMode=process
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
StartLimitInterval=60
StartLimitBurst=3
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Vault
sudo systemctl daemon-reload
sudo systemctl enable vault
sudo systemctl start vault

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Configure firewall
echo "🔥 Configuring UFW firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/student-profile
sudo chown -R $USER:$USER /var/www/student-profile

# Create environment file template
echo "📝 Creating environment configuration..."
cat > /var/www/student-profile/.env <<EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# Database Configuration (will be moved to Vault)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 64)

# Vault Configuration
USE_VAULT=true
VAULT_URL=http://localhost:8200
VAULT_TOKEN=
VAULT_MOUNT_PATH=secret

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Set proper permissions
chmod 600 /var/www/student-profile/.env

echo "✅ DigitalOcean droplet setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Clone your repository to /var/www/student-profile"
echo "2. Install dependencies: cd /var/www/student-profile && npm install"
echo "3. Initialize Vault: vault operator init"
echo "4. Configure Vault with your secrets"
echo "5. Run database migrations: npm run db:migrate"
echo "6. Seed database: npm run db:seed"
echo "7. Start application with PM2: pm2 start ecosystem.config.js"
echo "8. Configure Nginx reverse proxy"
echo "9. Set up SSL with Cloudflare"
echo ""
echo "🔐 Database Credentials:"
echo "Root Password: ${DB_ROOT_PASSWORD:-SecureRootPass123!}"
echo "App User: ${DB_USER}"
echo "App Password: ${DB_PASSWORD}"
echo ""
echo "⚠️  Save these credentials securely!"
