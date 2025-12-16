#!/usr/bin/env bash
# Helper script to run on server after files are copied.
# Usage: edit this script on the server (or invoke commands via SSH action).
set -e
TARGET_DIR="${1:-/var/www/myapp}" # default path if not provided
echo "Deploying to $TARGET_DIR"

# Ensure proper ownership/permissions
# sudo chown -R www-data:www-data "$TARGET_DIR" || true
# sudo chmod -R 755 "$TARGET_DIR" || true

# If you need to install server-side dependencies or build on server, do it here
# cd "$TARGET_DIR"
# pnpm install --prod
# pnpm run build

# Restart app / reload webserver
# Example PM2 restart (if using PM2):
# pm2 restart myapp || pm2 start npm --name myapp -- start

# Example systemd reload (if using nginx to serve static files):
# sudo systemctl reload nginx || true

echo "Remote deploy helper finished"
