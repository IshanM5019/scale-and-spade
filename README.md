# 🌿 Spade & Scale — Business Intelligence for SMEs

> A modular, full-stack business intelligence platform designed to help small and medium enterprises compete smarter, manage profits, and grow sustainably.

---

## 📐 Architecture Overview

```
spade-and-scale/
├── backend/                    # FastAPI (Python) — REST API + Business Logic
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py              # Auth endpoints (Supabase JWT validation)
│   │   │   │   ├── competitor.py        # Competitor Analysis module routes
│   │   │   │   └── profit.py            # Profit Manager module routes
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py               # Settings via pydantic-settings
│   │   │   ├── deps.py                 # FastAPI dependency injection (auth, db)
│   │   │   └── security.py             # JWT validation against Supabase JWKS
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── competitor.py           # Pydantic schemas for Competitor module
│   │   │   └── profit.py               # Pydantic schemas for Profit module
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── competitor_service.py   # Scraping / data aggregation logic
│   │   │   └── profit_service.py       # Revenue/expense computation logic
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   └── supabase_client.py      # Supabase Python client wrapper
│   │   └── main.py                     # FastAPI app entrypoint
│   ├── tests/
│   │   ├── test_competitor.py
│   │   └── test_profit.py
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                   # Next.js 14 (App Router) — React UI
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout (fonts, global providers)
│   │   │   ├── page.tsx                # Landing / dashboard redirect
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx      # Supabase Auth UI login
│   │   │   │   └── register/page.tsx   # Registration page
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx          # Sidebar + topbar shell
│   │   │   │   ├── page.tsx            # Dashboard overview
│   │   │   │   ├── competitor/
│   │   │   │   │   └── page.tsx        # Competitor Analysis module
│   │   │   │   └── profit/
│   │   │   │       └── page.tsx        # Profit Manager module
│   │   ├── components/
│   │   │   ├── ui/                     # Shadcn/ui base components
│   │   │   ├── competitor/
│   │   │   │   ├── CompetitorCard.tsx
│   │   │   │   ├── CompetitorTable.tsx
│   │   │   │   └── AddCompetitorModal.tsx
│   │   │   └── profit/
│   │   │       ├── RevenueChart.tsx
│   │   │       ├── ExpenseBreakdown.tsx
│   │   │       └── ProfitSummaryCard.tsx
│   │   ├── lib/
│   │   │   ├── supabaseClient.ts       # Supabase browser client
│   │   │   └── apiClient.ts            # Axios wrapper for FastAPI calls
│   │   ├── hooks/
│   │   │   ├── useAuth.ts              # Auth state + session hook
│   │   │   ├── useCompetitors.ts       # SWR hook for competitor data
│   │   │   └── useProfit.ts            # SWR hook for profit data
│   │   ├── store/
│   │   │   └── useAppStore.ts          # Zustand global store
│   │   └── types/
│   │       ├── competitor.ts
│   │       └── profit.ts
│   ├── public/
│   │   └── logo.svg
│   ├── .env.local.example
│   ├── Dockerfile
│   ├── next.config.ts
│   └── package.json
│
├── supabase/                   # Supabase local config & migrations
│   ├── migrations/
│   │   ├── 001_create_competitors_table.sql
│   │   ├── 002_create_profit_entries_table.sql
│   │   └── 003_rls_policies.sql
│   └── seed.sql
│
├── docker-compose.yml          # Orchestrates backend + frontend + Supabase
├── .env.example                # Root-level shared env vars
└── README.md
```

---

## 🧩 Modules

### 1. 🔍 Competitor Analysis
Track, compare, and score business competitors.

| Feature | Description |
|---|---|
| Add Competitors | Store competitor name, website, category, region |
| Sentiment Score | Pulls public review data (Google Places free tier) |
| Pricing Comparison | Manual or scraped pricing benchmarks |
| Keyword Gap | Identify keywords competitors rank for (via free APIs) |
| Export | CSV/PDF export of competitive matrix |

### 2. 💰 Profit Manager
Revenue and expense management with profitability insights.

| Feature | Description |
|---|---|
| Revenue Entries | Log sales/revenue with category & date |
| Expense Tracking | Categorize OPEX, CAPEX, salaries |
| Profit/Loss Reports | Monthly, quarterly, annual P&L statements |
| Break-Even Analysis | Calculate break-even point dynamically |
| Forecast | Simple linear trend forecasting |

---

## 🗄️ Database Schema (Supabase PostgreSQL)

### `competitors` table
```sql
CREATE TABLE competitors (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  website     TEXT,
  category    TEXT,
  region      TEXT,
  rating      NUMERIC(3,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `profit_entries` table
```sql
CREATE TABLE profit_entries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type  TEXT CHECK (entry_type IN ('revenue', 'expense')) NOT NULL,
  category    TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT,
  entry_date  DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

> **Row Level Security (RLS)** is enforced on all tables — users can only read/write their own data.

---

## 🛠️ Tech Stack

| Layer | Technology | Free-Tier? |
|---|---|---|
| Backend Framework | FastAPI 0.111 | ✅ Open Source |
| Backend Runtime | Python 3.12 | ✅ Open Source |
| Frontend Framework | Next.js 14 (App Router) | ✅ Open Source |
| UI Components | shadcn/ui + Radix UI | ✅ Open Source |
| Charting | Recharts | ✅ Open Source |
| State Management | Zustand | ✅ Open Source |
| Data Fetching | SWR | ✅ Open Source |
| Database | Supabase (PostgreSQL) | ✅ Free tier: 500MB |
| Auth | Supabase Auth | ✅ Free tier: 50k MAU |
| HTTP Client | Axios | ✅ Open Source |
| Styling | Tailwind CSS | ✅ Open Source |
| Validation (BE) | Pydantic v2 | ✅ Open Source |
| Settings | pydantic-settings | ✅ Open Source |
| HTTP Server | Uvicorn | ✅ Open Source |
| Containerisation | Docker + Docker Compose | ✅ Free |
| DB Migrations | Supabase CLI | ✅ Free |

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop installed
- Supabase account (free) — [supabase.com](https://supabase.com)
- Node.js 20+ and Python 3.12+

### 1. Clone & Setup Environment

```bash
git clone https://github.com/your-org/spade-and-scale.git
cd spade-and-scale

# Copy environment variable templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### 2. Configure Supabase

1. Create a new project on [app.supabase.com](https://app.supabase.com)
2. Copy your **Project URL** and **Anon Key** from `Settings > API`
3. Paste into `backend/.env` and `frontend/.env.local`
4. Run migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Apply migrations to your Supabase project
supabase db push --db-url "postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"
```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |

### 4. Run Locally (Development)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

---

## 🔐 Authentication Flow

1. User signs up / logs in via **Supabase Auth** on the frontend
2. Supabase returns a **JWT access token**
3. Frontend attaches the JWT as a `Bearer` token in all API requests to FastAPI
4. FastAPI validates the JWT against Supabase's **JWKS endpoint** (using `python-jose`)
5. Each request is scoped to the authenticated `user_id`

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/auth/me` | Get current user profile |

### Competitor Analysis
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/competitors/` | List all competitors for user |
| POST | `/api/v1/competitors/` | Add a new competitor |
| GET | `/api/v1/competitors/{id}` | Get competitor details |
| PUT | `/api/v1/competitors/{id}` | Update competitor |
| DELETE | `/api/v1/competitors/{id}` | Remove competitor |
| GET | `/api/v1/competitors/analysis/summary` | Get competitive analysis summary |

### Profit Manager
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/profit/entries` | List all profit entries |
| POST | `/api/v1/profit/entries` | Create revenue/expense entry |
| GET | `/api/v1/profit/entries/{id}` | Get entry detail |
| PUT | `/api/v1/profit/entries/{id}` | Update entry |
| DELETE | `/api/v1/profit/entries/{id}` | Delete entry |
| GET | `/api/v1/profit/summary` | Monthly P&L summary |
| GET | `/api/v1/profit/forecast` | Revenue forecast |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pip install pytest pytest-asyncio httpx
pytest tests/ -v

# Frontend type checking
cd frontend
npm run type-check
```

---

## 📦 Deployment (Free Tier)

| Service | Recommended Free Platform |
|---|---|
| Frontend | Vercel (Free Hobby Plan) |
| Backend | Railway (Free $5 credit/mo) or Render (Free tier) |
| Database | Supabase (Free 500MB) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/module-name`
3. Commit changes: `git commit -m "feat: add XYZ feature"`
4. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> Built with ❤️ for SMEs by the Spade & Scale team.
