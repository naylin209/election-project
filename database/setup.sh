#!/bin/bash
# ============================================
# Foo Fighters Election Project — Full Setup
# ============================================
# Run this script on your RLES VM after uploading the project.
# Usage:  chmod +x database/setup.sh && ./database/setup.sh

set -e

echo "==============================="
echo " Foo Fighters Election Setup"
echo "==============================="
echo ""

# Step 1: Create database and user
echo "[1/4] Creating database and user..."
sudo -u postgres psql -f database/setup_db.sql
echo "  ✓ Database 'american_dream' and user 'appuser' created"
echo ""

# Step 2: Run the DDL to create tables
echo "[2/4] Creating tables..."
PGPASSWORD=student psql -U appuser -d american_dream -f database/DDL_FooFighters.sql
echo "  ✓ All tables created"
echo ""

# Step 3: Install backend dependencies
echo "[3/4] Installing Node.js dependencies..."
cd backend
npm install
cd ..
echo "  ✓ Dependencies installed"
echo ""

# Step 4: Run the data import
echo "[4/4] Importing election data (this may take a few minutes)..."
cd database
node import_data.js
cd ..
echo ""

echo "==============================="
echo " Setup complete!"
echo "==============================="
echo ""
echo "To start the server:"
echo "  cd backend && node server.js"
echo ""
echo "Then visit: http://<YOUR_VM_IP>:4000"
echo ""
echo "--- Submission Info ---"
echo "VM IP address:     $(hostname -I | awk '{print $1}')"
echo "Database username:  appuser"
echo "Database password:  student"
