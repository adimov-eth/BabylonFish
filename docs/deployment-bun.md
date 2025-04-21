# Bun Direct Deployment Guide

## Prerequisites

- Server running Linux/macOS (Ubuntu 20.04+ recommended)
- Git installed
- Node.js 18+ installed (for pnpm)

## Server Setup

1. **Install Bun:**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install pnpm:**
   ```bash
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```

3. **Clone the repository:**
   ```bash
   git clone your-repo-url
   cd trans-bot
   ```

4. **Set up environment variables:**
   Create a `.env` file in both packages:

   packages/ai/.env:
   ```
   OPENAI_API_KEY=your_key_here
   ```

   packages/telegram/.env:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   MASTRA_API_URL=your_mastra_url
   ```

5. **Install dependencies and build:**
   ```bash
   pnpm install
   pnpm build
   ```

## Running the Bot

### Option 1: Using PM2 (Recommended)

1. **Install PM2:**
   ```bash
   pnpm add -g pm2
   ```

2. **Create PM2 config:**
   ```bash
   # ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'trans-bot',
       script: 'packages/telegram/dist/index.js',
       interpreter: 'bun',
       env: {
         NODE_ENV: 'production'
       },
       max_memory_restart: '300M',
       restart_delay: 3000
     }]
   }
   ```

3. **Start the bot:**
   ```bash
   pm2 start ecosystem.config.js
   ```

4. **Enable startup persistence:**
   ```bash
   pm2 startup
   pm2 save
   ```

### Option 2: Using systemd

1. **Create a systemd service file:**
   ```bash
   sudo nano /etc/systemd/system/trans-bot.service
   ```

2. **Add the service configuration:**
   ```ini
   [Unit]
   Description=Trans Bot Service
   After=network.target

   [Service]
   Type=simple
   User=your_user
   WorkingDirectory=/path/to/trans-bot
   ExecStart=/root/.bun/bin/bun packages/telegram/dist/index.js
   Restart=always
   RestartSec=3
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

3. **Start the service:**
   ```bash
   sudo systemctl enable trans-bot
   sudo systemctl start trans-bot
   ```

## Monitoring

### With PM2:
```bash
# View logs
pm2 logs trans-bot

# Monitor resources
pm2 monit

# Check status
pm2 status
```

### With systemd:
```bash
# View logs
journalctl -u trans-bot -f

# Check status
systemctl status trans-bot
```

## Updates

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart:**
   ```bash
   pnpm install
   pnpm build
   ```

   Then depending on your process manager:
   
   PM2:
   ```bash
   pm2 restart trans-bot
   ```
   
   systemd:
   ```bash
   sudo systemctl restart trans-bot
   ```

## Server Requirements

- RAM: 512MB minimum (1GB recommended)
- CPU: 1 core minimum
- Storage: 5GB minimum
- OS: Ubuntu 20.04+ or macOS 