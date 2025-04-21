# Nginx Configuration Guide

## Important Note
The Telegram bot itself doesn't require Nginx or HTTPS as it communicates directly with Telegram's servers using their API. However, if you're running additional services alongside the bot, here's how to configure Nginx.

## Nginx Setup

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Configure SSL Certificate:**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com
   ```

3. **Create Nginx Configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/trans-bot
   ```

   Basic configuration for additional services (if needed):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       # Modern SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;

       # HSTS
       add_header Strict-Transport-Security "max-age=63072000" always;

       # Optional: If you have a web interface or API
       location /api {
           proxy_pass http://localhost:3000;  # Adjust port if needed
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Optional: For static files or web interface
       location / {
           root /var/www/html;
           index index.html;
           try_files $uri $uri/ =404;
       }
   }
   ```

4. **Enable the Configuration:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/trans-bot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Security Considerations

1. **Firewall Configuration:**
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

2. **SSL Security Headers:**
   Already included in the Nginx configuration above:
   - Modern SSL protocols (TLSv1.2, TLSv1.3)
   - Strong cipher suite
   - HSTS

3. **Regular Updates:**
   ```bash
   # Update SSL certificates
   sudo certbot renew

   # Update Nginx
   sudo apt update
   sudo apt upgrade nginx
   ```

## Monitoring Nginx

1. **View Nginx Logs:**
   ```bash
   # Access logs
   sudo tail -f /var/log/nginx/access.log

   # Error logs
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Check Nginx Status:**
   ```bash
   sudo systemctl status nginx
   ```

## Important Notes

1. The Telegram bot itself doesn't need Nginx - it runs independently using PM2 or systemd as configured in the main deployment guide.

2. Only set up Nginx if you:
   - Are running additional web services
   - Need a web interface for your bot
   - Have an API that needs to be exposed
   - Want to serve static files

3. The SSL certificate from Let's Encrypt renews automatically if you've installed Certbot. 