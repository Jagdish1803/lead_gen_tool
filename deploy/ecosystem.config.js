// PM2 process config — keeps the Next.js app running (and auto-restarts).
//   Run from the project root on the VPS:  pm2 start deploy/ecosystem.config.js
//
// Secrets are read from .env.local in the project root (Next loads it
// automatically) — do NOT put keys here.
module.exports = {
  apps: [
    {
      name: "pitching-tool",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100",
      cwd: __dirname + "/..",
      instances: 1, // single instance — the background pipeline uses in-process state
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        // 3000/3010 are taken by other apps on this VPS — we run on 3100.
        PORT: "3100",
      },
    },
  ],
};
