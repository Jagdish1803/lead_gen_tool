# Pitching Tool — Concept & Discovery

> Working doc. This is the thing we talk around.

## ✅ Decisions locked (2026-08-02)

| Decision | Choice | What it means |
|----------|--------|---------------|
| **Data source** | **SerpApi** (Google Maps Local Results) | Reliable, no scraping/ban risk, pay per search. Solves §4-A cleanly. |
| **Outreach channel** | **WhatsApp → GMB phone number, automated** | Message sent to the business's Google-listed number automatically. |
| **Autonomy** | **Fully automatic, end to end** | Find → audit → write → **send** all run without manual steps. |
| **Message logic** | **Branch on website** | Has site → "your site lacks X, Y — quick call, we'll fix it." No site → "you have no website while competitors do — we'll build one." |
| **Scope of v1** | **Core first** | Find + audit + write + send + dashboard. AI reply-handling / hot-lead handoff = phase 2. |
| **Scale / market** | **Small, India** | Dozens–low-hundreds of leads/week. |
| **Frontend** | **Next.js + shadcn/ui** | Proper dashboard UI. |
| **Backend / infra** | **VPS** | Runs the pipeline + API on a VPS. |
| **Database** | **Supabase** (Postgres) | Leads, audits, messages, pipeline state. |
| **AI model** | **TBD** | Decide later. Kept behind a swappable interface. |

### ⚠️ Automated cold WhatsApp — the caveat & our safety model
Automating first-contact WhatsApp is against WhatsApp policy, but **slow, human-like pacing is by far the biggest lever** for staying under the radar. Our whole strategy is "act like a careful human, not a blast machine."

**What actually triggers bans (in rough order of impact):**
1. **Recipient reports / blocks** — the #1 trigger. Mitigate with *relevant, personalized, non-spammy* messages and low volume.
2. **High velocity / bursts** — sending many messages fast. **This is what our slow pacing kills.**
3. **Brand-new cold number** messaging strangers — mitigate by **warming up** the number first.
4. **Identical content** — mitigate: AI personalizes every message.

**Our safety model (baked in from day one):**
- **Chosen path: unofficial (Baileys)** — drives a normal WhatsApp number from code. Free, full control.
- **Slow pacing engine (core feature):** send only **1–2 messages every 3–5 minutes**, with randomized (not fixed) delays, human-like timing. Configurable.
- **Daily cap:** a low ceiling per number per day (e.g. start ~20–30), ramp up slowly as the number ages.
- **Dedicated, warmed-up number** — a spare SIM you're OK losing, never your personal/business main line.
- **Personalized, relevant messages** (already how the Writer works) → fewer reports.
- **Auto-pause on trouble:** stop sending the moment we detect a warning/disconnect; keep a fallback number ready.
- **Sender is swappable** — if you ever want to go fully legit, drop in the official BSP path (Gupshup/Wati/Interakt) without touching the rest of the app.

> Honest expectation: with slow pacing + a warmed number + relevant B2B messages, ban risk is **low, not zero**. The thing most likely to still cause a ban is recipients finding the messages spammy and reporting them — so message *quality and relevance* is itself a safety feature, not just a sales feature.

---

## 1. One-line pitch

A tool that **finds local businesses**, **audits their web presence**, **writes a personalized outreach message**, **sends it over WhatsApp**, **handles the early conversation with AI**, and **hands hot leads to you** — all tracked in one dashboard.

It's a **lead-generation + automated-outreach + light-CRM** machine for a web-design / web-services agency (or freelancer).

---

## 2. The flow, as you described it

```
[ You type: "Dental Clinic" + "Mumbai" ]
                │
                ▼
   ┌─────────────────────────┐
   │ 1. FIND                 │  Search Google Maps for all matching businesses
   └─────────────────────────┘
                │  name, phone, website, address, maps link
                ▼
   ┌─────────────────────────┐
   │ 2. AUDIT                │  Visit each website automatically
   └─────────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
   No website        Has website
   → "needs a        → check: old design? slow?
      website"           bad on mobile? other issues?
        │                │
        └───────┬────────┘
                ▼
   ┌─────────────────────────┐
   │ 3. WRITE                │  AI drafts a personalized message from the findings
   └─────────────────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │ 4. SEND (WhatsApp)      │  Message goes out through a compliant setup
   └─────────────────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │ 5. CONVERSE             │  AI answers common replies automatically
   └─────────────────────────┘
                │  serious? (pricing / meeting request)
                ▼
   ┌─────────────────────────┐
   │ 6. HANDOFF              │  Notify you / hand the chat to a human
   └─────────────────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │ 7. TRACK (Dashboard)    │  found → contacted → replied → interested → client
   └─────────────────────────┘
```

---

## 3. The pieces, and what each one really takes

| # | Module | What it does | Hard part |
|---|--------|--------------|-----------|
| 1 | **Finder** | Pull businesses from Google Maps by type + city | Getting data reliably & legally (API vs scraping) |
| 2 | **Auditor** | Check each site: exists? design age, speed, mobile, SEO basics | Turning "looks old" into measurable signals |
| 3 | **Writer** | AI generates a tailored first message | Making it feel human, not spam |
| 4 | **Sender** | Deliver over WhatsApp | **Compliance & getting blocked** (biggest risk) |
| 5 | **Responder** | AI replies to inbound messages | Knowing when it's out of its depth |
| 6 | **Handoff** | Escalate hot leads to you | Detecting intent, notifying fast |
| 7 | **Dashboard** | Pipeline view + metrics | Clean data model tying it all together |

---

## 4. The things we HAVE to talk about (honest constraints)

These aren't blockers — they're forks in the road. Each changes what we build.

### A. Google Maps data — API vs scraping
- **Google Places API** = official, reliable, has usage costs, and returns limited results per search (roughly up to ~60 per query via pagination). No phone/website guaranteed on every record.
- **Scraping Maps** = more data, but against Google's terms, breaks often, and can get IPs blocked.
- **Question:** Do we go legit-but-limited (Places API), or do you accept the risk/maintenance of scraping? There are also paid third-party data providers (e.g. lead databases) as a middle ground.

### B. WhatsApp — this is the big one
- **WhatsApp does NOT allow cold, unsolicited, automated outreach.** Sending marketing messages to people who never opted in is against WhatsApp's Business policy and gets numbers **banned fast**.
- Two real paths:
  - **Official WhatsApp Business API (via Meta / a BSP like Twilio, 360dialog, etc.)** — compliant, but requires approved message *templates* for first-contact, and Meta reviews them. Cold sales pitches usually won't get approved as templates.
  - **Unofficial libraries (whatsapp-web.js, Baileys)** — automate a normal WhatsApp account. Easy to start, but **explicitly against WhatsApp ToS** → numbers get banned, especially at volume.
- **Question:** This is the single most important decision. Options, roughly:
  1. Do WhatsApp *compliantly* (opt-in / warm leads only, official API) — slower but sustainable.
  2. Switch the outreach channel to **email** (cold email has clearer, legal rules — e.g. CAN-SPAM style) or a **phone/SMS** flow.
  3. Use the tool to *find + audit + draft*, and you send manually (semi-automated). Much safer, still a huge time-saver.

### C. "Old design / slow / poor mobile" — how we measure it
- Speed & mobile → **Google PageSpeed / Lighthouse** gives real scores.
- "Old design" is subjective — we can proxy it with signals: no HTTPS, not mobile-responsive, tiny/old copyright year, table-based layout, no meta viewport, etc. Or have the AI look at a screenshot and judge.
- **Question:** How deep should the audit go? A quick 5-signal check, or a full report we can also *show the prospect* as a hook?

### D. Cost & scale
- Every business = 1 maps lookup + 1 site fetch + maybe 1 PageSpeed call + 1 AI generation + messaging cost. At 500 businesses that adds up. We should decide budget targets early.

### E. Legal / ethical footing
- Contacting businesses for B2B services is normal, but **automated messaging to personal numbers** and **scraping** both carry legal weight that varies by country (India, EU/GDPR, US all differ).
- **Question:** What's your risk appetite, and which country's rules are we primarily under?

---

## 4.5 Architecture (with the locked stack)

```
┌───────────────────────────────────────────────────────────────┐
│  Next.js + shadcn/ui  (Dashboard on the VPS)                  │
│  - trigger a search (business type + city)                    │
│  - watch the pipeline: found → contacted → replied → client   │
│  - view each lead: audit report + the drafted message         │
└───────────────┬───────────────────────────────────────────────┘
                │ (API routes / server actions)
                ▼
┌───────────────────────────────────────────────────────────────┐
│  Pipeline worker  (Node process on the VPS)                   │
│                                                               │
│   Finder ──► Auditor ──► Writer ──► Sender                    │
│   SerpApi    PageSpeed    AI(TBD)    WhatsApp                 │
│              + signals               (BSP, swappable)         │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │   Supabase    │  businesses · audits · messages · pipeline
        │  (Postgres)   │
        └───────────────┘
```

**Data model (first cut):**
- `businesses` — name, phone, website, address, maps_url, source query, status
- `audits` — business_id, has_website, pagespeed scores, mobile_ok, https, issues[], summary
- `messages` — business_id, channel, template_used, body, status (queued/sent/failed/replied), sent_at
- `events` — timeline for the pipeline stages (for the dashboard + debugging)

**Pipeline stages as independent jobs** so a failure in one lead never stalls the batch, and we can re-run a single stage (e.g. re-audit) without redoing everything.

## 5. Suggested build order (so you see value fast)

1. **Finder + Auditor + Writer**, output to a spreadsheet/dashboard. *No sending yet.* → Instantly useful; you review and send manually.
2. **Dashboard & pipeline tracking** → see and manage leads.
3. **Sending** (whichever compliant channel we pick) → automate outreach.
4. **AI responder + handoff** → automate the conversation.

Each stage is usable on its own. We don't need the whole thing before it earns its keep.

---

## 6. Setup checklist (nothing provisioned yet)

We'll need these. I'll fold the how-to into each build phase, but here's the shopping list:

- [ ] **SerpApi account** + API key — for Google Maps results. (Free tier exists; paid for volume.)
- [ ] **Supabase project** — free tier is plenty to start; gives us Postgres + a dashboard.
- [ ] **A VPS** — small box (e.g. Hetzner/DigitalOcean, ~₹400–800/mo). Hosts the app + pipeline worker + the always-on WhatsApp session.
- [ ] **A dedicated WhatsApp number** for Baileys — a spare SIM/eSIM you're willing to lose. **Not** your personal number.
- [ ] **An AI provider** — deferred; we'll wire the Writer behind an interface and pick the model when we get there.
- [ ] **Domain (optional)** — only if you want the dashboard on a nice URL.

---

## 7. Phased build plan

Each phase produces something usable on its own.

### Phase 0 — Foundation
- Next.js + shadcn/ui app scaffold, Supabase connected, schema created, deployable to the VPS.
- **Output:** empty but running dashboard + database.

### Phase 1 — Finder
- SerpApi integration: type + city → list of businesses saved to `businesses`.
- Dashboard table of found leads.
- **Output:** you can search a niche/city and see real businesses populate.

### Phase 2 — Auditor
- No website → flag `needs_website`.
- Has website → fetch it, run PageSpeed (speed + mobile scores), check signals (HTTPS, viewport/responsive, obvious age markers), store an `issues[]` list + summary.
- **Output:** every lead has an audit you can read.

### Phase 3 — Writer
- AI turns each audit into a personalized message, branching:
  - has-site → "your site lacks X/Y, quick call and we'll fix it"
  - no-site → "no website while competitors have one — we'll build you one"
- Drafts stored on the lead, visible in the dashboard.
- **Output:** ready-to-send messages, auto-generated.

### Phase 4 — Sender (Baileys) + slow-pacing engine
- Persistent WhatsApp session on the VPS, swappable Sender interface.
- **Pacing engine:** a queue that releases only **1–2 messages every 3–5 min** (randomized delays), enforces a **daily cap** per number, and auto-pauses on any warning/disconnect.
- Configurable pacing settings in the dashboard (min/max delay, daily cap).
- Status tracking: queued → sent → failed.
- **Output:** the full loop runs end to end, automatically and safely paced.

### Phase 5 — Dashboard polish + pipeline
- Full funnel: found → contacted → replied → interested → client (manual stage moves for now).
- Metrics: counts per stage, per search.
- **Output:** the "one dashboard to see everything" you asked for.

### Phase 6 (later) — Replies & handoff
- Read inbound WhatsApp, AI answers common questions, escalate hot leads (pricing/meeting) with a notification to you.
- Deferred by design — revisit once the core is earning.

---

## 8. My honest take

The **Finder → Auditor → Writer → Dashboard** core is genuinely valuable, very buildable, and low-risk — that's Phases 1–3 and where the real value shows up fast.

The **automated Baileys sending** (Phase 4) is the one part carrying real risk: numbers getting banned. We've chosen it knowingly and we protect against it (dedicated number, throttling, swappable to official API later). Just go in expecting to treat WhatsApp numbers as disposable.

**Next step:** if this plan looks right, say go and I'll start on **Phase 0 (foundation)** — scaffold the Next.js app, wire Supabase, and set up the schema. We can knock out the account setups as we hit each phase.
```