# Deploy on your Hostinger VPS

Runs the whole Next.js app on the VPS with **PM2** (keeps it alive) + **Nginx**
(reverse proxy) + optional **free SSL**. Persistent server = the background
pipeline runs with no timeouts and no sleeping.

> Run these **on the VPS over SSH** (`ssh root@213.210.36.122`). Adjust the
> path `/var/www/pitching-tool` if you put it elsewhere.

---

## 0. Secure the box first
```bash
passwd                       # set a NEW root password (the old one was shared)
# (recommended later: set up an SSH key and disable password login)
```

## 1. Install Node 22, git, Nginx, PM2
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx
npm install -g pm2
node -v      # should print v22.x
```

## 2. Get the code
```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/Jagdish1803/lead_gen_tool.git pitching-tool
cd pitching-tool
```

## 3. Add your secrets
Create `.env.local` in the project root and paste all your keys (same values
you used locally / on Render — DATABASE_URL, DIRECT_URL, SERPAPI_KEY,
PAGESPEED_API_KEY, GROQ_API_KEY, SMTP_*, IMAP_*):
```bash
nano .env.local          # paste, then Ctrl+O, Enter, Ctrl+X
```

## 4. Install + build
```bash
npm install
npm run build
```

## 5. Start with PM2 (and survive reboots)
```bash
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup            # run the command it prints, then: pm2 save
pm2 logs pitching-tool # watch it boot; Ctrl+C to exit
```
The app is now on `http://127.0.0.1:3000` inside the VPS.

## 6. Expose it with Nginx
```bash
cp deploy/nginx.conf /etc/nginx/sites-available/pitching-tool
# edit server_name in that file (your domain, or 213.210.36.122 for now)
ln -s /etc/nginx/sites-available/pitching-tool /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```
Now open **http://213.210.36.122** (or your domain) in a browser.

## 7. (Optional) Domain + free SSL
Point your domain's A record to `213.210.36.122`, then:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## Updating after a code change
Whenever new code is pushed to GitHub:
```bash
cd /var/www/pitching-tool
bash deploy/redeploy.sh
```

## Handy PM2 commands
```bash
pm2 status                 # is it running?
pm2 logs pitching-tool     # live logs
pm2 reload pitching-tool   # restart after changes
pm2 restart pitching-tool
```
