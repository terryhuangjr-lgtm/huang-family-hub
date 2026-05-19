# Huang Family Hub

**Live URL:** https://huang-family-hub.vercel.app  
**Deploy:** Auto-deployed from GitHub (terryhuangjr-lgtm/huang-family-hub)  
**Supabase:** Pro tier — `igllbezrxxdpggjxhfno`  
**Hermes Profile:** `huangfam` at `~/.hermes/profiles/huangfam/`  
**Telegram Bot:** Jett (@HuangFamJettBot)  
**Agent Model:** Grok 4.1 Fast Reasoning  
**Theme:** Bitcoin orange (#f7931a), white bg, black text, clean sans-serif  
**Stack:** Vite + React + Supabase REST API + Hermes Agent

---

## Architecture

```
┌─────────────────────────────────────┐
│  Dashboard (Vercel)                 │
│  huang-family-hub.vercel.app        │
│  Vite + React (.jsx components)     │
├─────────────────────────────────────┤
│  Hermes Agent (WSL2)                │
│  ~/.hermes/profiles/huangfam/       │
│  Gateway + Telegram Bot             │
├─────────────────────────────────────┤
│  Supabase (igllbezrxxdpggjxhfno)    │
│  Pro tier, us-east-1                │
│  5 tables (RLS disabled)            │
└─────────────────────────────────────┘
```

## Tables

### `calendar_events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| title | text | Required |
| event_date | date | Required |
| event_time | time | Optional (null for all-day) |
| duration_minutes | integer | 0 = all day, 30-240 |
| end_date | date | For multi-day all-day events |
| location | text | Optional |
| family_member | text | Terry/Donna/Sienna/Genevieve/Family |
| event_type | text | activity, sport, appointment, etc. |
| status | text | scheduled, cancelled, completed |
| recurring_pattern | text | null, weekly, biweekly, monthly, daily |
| notes | text | Optional |
| created_at | timestamptz | Default now() |

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | Required |
| assigned_to | text | Terry/Donna/Sienna/Genevieve/Family |
| priority | text | low/medium/high/urgent |
| status | text | pending/in_progress/completed/cancelled/archived |
| due_date | date | Optional |
| notes | text | Optional |
| created_at | timestamptz | |

### `shopping_list`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| item | text | Required |
| category | text | groceries/household/other |
| quantity | integer | Default 1 |
| added_by | text | Family/Terry/Donna |
| notes | text | Optional |
| status | text | pending/bought |
| created_at | timestamptz | |

### `meal_plan`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| week_start | date | Monday of the week |
| day_of_week | integer | 0=Sunday..6=Saturday |
| meal_type | text | breakfast/lunch/dinner |
| dish | text | Required |
| notes | text | Optional |

### `watchlist`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | Required |
| media_type | text | movie/tv_show/documentary/anime |
| added_by | text | Family/Terry/Donna |
| notes | text | Optional |
| watched | boolean | Default false |
| watched_at | timestamptz | Null until watched |
| created_at | timestamptz | |

## Dashboard Features

### Calendar
- FullCalendar view with day/week click
- Add event modal: title, date, time, duration (30m/1h/1.5h/2h/3h/4h/All Day), family member, type, location, recurring (weekly/biweekly/monthly/daily), notes
- All-day events: no time shown, "All Day" label
- Multi-day events: End Date field appears when All Day selected, creates one record per day
- Duration displayed as "6:00 PM – 8:00 PM ET" (12-hour ET format)
- Recurring events generate 12 weeks of instances on creation
- Editable via same modal (pencil icon)
- Delete via trash icon

### Tasks
- Inline quick-add (Enter key)
- "+ Details" modal with assignee, priority (low/medium/high/urgent), due date, notes
- Checkbox to mark complete (strikethrough, muted text)
- Filter tabs: All / Active / Done / Terry / Donna / Family
- Edit via pencil icon (pre-filled modal)
- Delete via trash icon

### Shopping List
- Inline quick-add (Enter key)
- "+ Details" modal with category (groceries/household/other), quantity, added_by (Family/Terry/Donna), notes
- Checkbox to mark bought
- Filter tabs: Pending / Bought / All
- Edit via pencil icon (pre-filled modal)
- Delete via trash icon

### Meal Plan
- 7-day × 3-meal grid (breakfast/lunch/dinner)
- Week navigation (previous/next)
- Click any cell to add or edit meal
- Shows dish name, optional notes, Remove button
- Pre-filled modal on click for editing

### Watchlist
- Filter tabs: To Watch / Watched / All
- Category tabs: All / Movie / TV Show / Documentary / Anime
- Checkbox to mark watched (strikethrough, muted text)
- Add modal with title, type, added_by (Family/Terry/Donna), notes
- Edit via pencil icon
- Delete via trash icon

## Family Members & Colors
| Member | Color |
|--------|-------|
| Terry | blue |
| Donna | green |
| Sienna | pink |
| Genevieve | purple |
| Family | orange |

## Hermes Agent (Jett)

**Profile:** `huangfam` at `~/.hermes/profiles/huangfam/`

**Config files:**
- `config.yaml` — Hermes config, context files, Grok 4.1 model
- `SOUL.md` — Agent identity: Jett, family assistant
- `INSTRUCTIONS.md` — Hard rule: must use query script, do NOT search files
- `.env` — Telegram token, Supabase keys [LOCKED]

**Query script:** `~/.hermes/scripts/huangfam-query.py`
Commands: `today`, `week`, `upcoming-events`, `tasks`, `shopping`, `meals`, `watchlist`, `help`

**Gateway:** Runs via Hermes agent on WSL2

## Useful Commands

```bash
# Build dashboard
cd /home/clawd/clawd/huang-family-hub && npm run build

# Deploy (auto via git push)
git add -A && git commit -m "..." && git push

# Query via agent
python3 /home/clawd/.hermes/scripts/huangfam-query.py week

# Restart agent gateway
systemctl --user restart hermes-gateway-huangfam.service
```

## Credentials

All stored in `/home/clawd/data/huang-family-hub.env` (chmod 400).
- Supabase URL: `https://igllbezrxxdpggjxhfno.supabase.co`
- Supabase Project Ref: `igllbezrxxdpggjxhfno`
- Management API token (sbp_): stored in .env
- Anon key + Service role key: stored in .env

Vercel env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set for Production.
