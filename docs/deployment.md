# Deployment Guide

## Prerequisites

- Docker installed on your deployment machine
- Access to your production environment variables:
  - `OPENAI_API_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `MASTRA_API_URL`

## Deployment Steps

1. **Build the Docker image:**
   ```bash
   docker build -t trans-bot .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     -e OPENAI_API_KEY=your_key \
     -e TELEGRAM_BOT_TOKEN=your_token \
     -e MASTRA_API_URL=your_mastra_url \
     --name trans-bot \
     trans-bot
   ```

## Deployment Options

### 1. Self-hosted (Recommended)
- Use a VPS provider (DigitalOcean, Linode, etc.)
- Requirements: 
  - 1GB RAM minimum
  - 10GB storage
  - Ubuntu 20.04 or later

Setup steps:
1. SSH into your server
2. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Clone your repository
4. Follow the deployment steps above

### 2. Cloud Platforms
The bot can be deployed to various cloud platforms:

#### Railway.app
1. Connect your GitHub repository
2. Add the Dockerfile to your repo
3. Configure environment variables
4. Deploy

#### DigitalOcean App Platform
1. Create a new app
2. Connect your repository
3. Select Dockerfile deployment
4. Configure environment variables
5. Deploy

## Monitoring

Monitor your bot's health using Docker commands:
```bash
# View logs
docker logs trans-bot

# Check container status
docker ps

# Restart if needed
docker restart trans-bot
```

## Updates

To update your deployment:

1. Pull latest changes:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart:
   ```bash
   docker build -t trans-bot .
   docker stop trans-bot
   docker rm trans-bot
   # Run the container again with the same run command as above
   ``` 