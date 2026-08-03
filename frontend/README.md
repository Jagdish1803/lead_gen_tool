# Pitching Tool — Frontend (Vercel)

This is the **UI only**. It has no database and no keys — every operation is
fetched from the backend API (the Next app running on the Hostinger VPS).

- Server components fetch the backend directly (`BACKEND_URL`).
- Client `fetch("/api/...")` calls are proxied to the backend by a rewrite in
  [next.config.ts](next.config.ts), so the browser only ever talks to this
  https origin (no mixed-content, no CORS to configure).

## Deploy on Vercel

1. Push this repo to GitHub (already done).
2. On [vercel.com](https://vercel.com) → **Add New… → Project** → import the
   `lead_gen_tool` repo.
3. **Root Directory:** set it to `frontend`.
4. **Environment Variables:** add
   - `BACKEND_URL = http://213.210.36.122:3100`
5. Deploy. Framework preset = Next.js (auto-detected).

## Local dev
```bash
npm install
npm run dev      # http://localhost:3000, talks to the VPS backend
```
Change the backend it points at by editing `.env.local` (`BACKEND_URL`).

> The backend (search, audit, AI writing, email sending, the background
> pipeline, IMAP inbox) all live on the VPS. This app never touches them
> directly — it only calls the REST API.
