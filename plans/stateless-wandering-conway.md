# Unvamp — Full Platform Implementation Plan (v3)

## Context

Unvamp is a **global live events and entertainment platform** for event owners and event-goers.
Event owners can sell tickets, stream and monetize their events live. Event-goers can purchase
tickets, watch live streams, access replays, and trade tickets on the marketplace.

**Global launch:** Starting in Nigeria, US, UK, Germany, Kenya, South Africa — expanding worldwide.

**Key product principles:**

- Netflix-quality streaming for both live and recorded events
- No downloads — ever. Streaming-only with DRM-lite protection
- Per-ticket concurrent screen limits (1-streamer = 1 screen, etc.)
- Event-driven architecture from day one (Redpanda)
- Dynamic KYC that scales to any country without code changes
- Light + dark mode
- Comprehensive error handling with user-friendly toasts
- High activity tracking and audit logging across all domains
- Separate repos for frontend, backend, and mobile

**Platform strategy:**

- **Web** — Next.js 15 (`unvamp-web` repo) — built first
- **Android** — Kotlin (`unvamp-android` repo) — after web MVP
- **iOS** — Swift (`unvamp-ios` repo) — after web MVP
- **Internal Admin Dashboard** — Next.js (`unvamp-admin` repo) — designed and built alongside web
  (no existing Figma designs — I will design these)
- Mobile/tablet Figma designs are already done

**PRD reference:** [Google Docs
PRD](https://docs.google.com/document/d/1RRJbn13UFW6VYE93imgcX8Xd6nVIymSDi9_fkHciQv8)

**Figma:** File `KMxpiDW5QrqNO1dPN8oulR`, MVP-V1 page, 19 sections, ~300+ screens.

## Tech Stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| **Frontend (Web)** | Next.js 15 (App Router, TypeScript) | SSR for SEO, `unvamp-web` repo |
| **Frontend (Admin)** | Next.js 15 (TypeScript) | Internal dashboard, `unvamp-admin` repo |
| **Backend** | Go (chi router, modular monolith) | `unvamp-api` repo |
| **Database** | PostgreSQL 16 | Core relational data |
| **Event Bus** | Redpanda | Kafka-compatible, event-driven backbone |
| **Cache** | Redis 7 (Valkey) | Sessions, screen limits, rate limiting |
| **Search** | Typesense | Event search, geo, filters |
| **Object Storage** | MinIO (S3-compatible) | Media, recordings, KYC docs |
| **Streaming** | MediaMTX + FFmpeg + Nginx-RTMP | RTMP + WebRTC + SRT ingest, HLS delivery |
| **Auth** | Keycloak | OAuth, social login, OTP, RBAC, 2FA/MFA |
| **Monitoring** | Prometheus + Grafana | Metrics, stream health |
| **Logging** | Loki + Grafana | Centralized structured logging |
| **Reverse Proxy** | Traefik | Routing, TLS, load balancing |
| **Hosting** | DigitalOcean / Hetzner | VPS, Docker Compose then k3s |
| **CI/CD** | GitHub Actions | Build, test, deploy |
| **Payments** | Paystack (Africa) + Stripe (Global) | Multi-currency, cards + mobile money |
| **KYC** | In-house engine + Sumsub | Dynamic per-country, cheapest global option |
| **AI/ML** | Ollama (Qwen2.5, Qwen2-VL, BGE-M3, Whisper) | Self-hosted, ~$60-80/mo GPU |
| **AI Fallback** | DeepSeek API | $0.14/M tokens for overflow |

## Repositories

| Repo | Tech | Purpose |
| ---- | ---- | ------- |
| `unvamp-site` | Next.js 15 / TypeScript | Marketing website (landing, pricing, about, blog) at unvamp.com |
| `unvamp-web` | Next.js 15 / TypeScript | Web app at app.unvamp.com + its own CI/CD pipeline |
| `unvamp-api` | Go | Backend API + workers + stream proxy + ALL infrastructure (Docker Compose, configs, migrations) |
| `unvamp-admin` | Next.js 15 / TypeScript | Internal admin dashboard at admin.unvamp.com + its own CI/CD pipeline |
| `unvamp-android` | Kotlin | Android app + its own CI/CD pipeline (after web) |
| `unvamp-ios` | Swift | iOS app + its own CI/CD pipeline (after web) |

**No separate infra repo** — all infrastructure configs (Docker Compose, Traefik, Keycloak,
Prometheus, Grafana, MediaMTX, Nginx, migrations) live in `unvamp-api` since the backend owns all
services.

## User Types & Roles

### Account Types

| Type | Description |
| ---- | ----------- |
| **Guest** | Browse events, view explore page. Cannot purchase, stream, or interact. |
| **Registered User (Free)** | Full attendee access: purchase, stream, chat, marketplace, wallet |
| **Registered User (Premium)** | All Free + priority ticket access, exclusive content, early access to sales |
| **Event Organiser** | All User features + create/manage events, stream, sell tickets, analytics |
| **Venue** | Organisational account for venues — host events, manage venue staff, calendar |
| **Artist / Performer** | Profile page, linked to events as performer, follower system, merch (future) |

### Attendee Roles

| Role | Capabilities |
| ---- | ------------ |
| **Viewer / Buyer / Seller** | Browse, purchase tickets, watch streams, sell/swap/change tickets on marketplace, wallet, chat, rate/review events |
| **Group Ticket Holder** | Purchase group tickets (League of 5/10), assign to members |
| **VIP Attendee** | VIP chat room access, VIP-exclusive stream features, priority support |

### Event Organiser Team Roles

| Role | Capabilities |
| ---- | ------------ |
| **Organiser: Owner** | Full control — create/cancel events, manage team, financials, all permissions |
| **Organiser: Admin** | Almost full control — everything except delete organisation or transfer ownership |
| **Organiser: Finance** | Revenue dashboard, payouts, refunds, transaction history, download statements |
| **Organiser: Operations Manager** | Manage venue staff, check-in dashboard, event logistics, attendee lists |
| **Organiser: Content Manager** | Official media upload, attendee highlight moderation, event descriptions, recaps |
| **Organiser: Stream Operator** | Configure/start/stop streams, multi-cam switching, stream health monitoring |
| **Organiser: Marketing** | Campaigns, promotions, email blasts, discount codes, analytics |
| **Organiser: Sales** | Ticket sales monitoring, pricing changes, inventory management |
| **Organiser: Moderator** | Chat moderation (mute/ban/delete), Q&A management, content flagging |

### Venue Staff Roles (Physical Events)

| Role | Capabilities |
| ---- | ------------ |
| **Usher** | Ticket scanning (QR), seat assignment, attendee guidance |
| **Bouncer / Security** | Entry verification, ID check, access control |
| **Sales Rep** | On-site ticket sales, upsells, merchandise |
| **Stage Manager** | Coordinate performers, manage event timeline |
| **Technical Crew** | AV setup, camera operation (multi-cam), stream monitoring |

### Platform Admin Roles

| Role | Capabilities |
| ---- | ------------ |
| **Super Admin** | Full system access — all modules, all data, all settings |
| **Admin: Finance** | Platform revenue, organiser payouts, refund approvals, settlement management |
| **Admin: Operations** | User management, event oversight, KYC review, support escalations |
| **Admin: Sales** | Sales analytics, organiser onboarding, partnership management |
| **Admin: Marketing** | Platform marketing, featured events, homepage curation, notifications |
| **Admin: Product / Engineering** | System health, feature flags, A/B tests, model monitoring, audit logs |
| **Admin: Compliance** | KYC reviews, legal compliance, content takedowns, GDPR/data requests |
| **Admin: Support** | Customer support tickets, live chat, user disputes, refund arbitration |
| **Admin: Content / Moderation** | Flagged content review, chat moderation oversight, community guidelines enforcement |

### Permission Matrix (RBAC)

All roles are managed via Keycloak RBAC. Permissions are additive — each role grants specific
capabilities. The system supports:

- **Custom roles** — Organisers can create custom roles combining permissions
- **Invitation system** — Invite team members by email with role assignment
- **Role inheritance** — Owner > Admin > specific roles
- **Temporal roles** — Venue staff roles active only during event window
- **Multi-org** — A user can be an organiser in one org and attendee in another

## Event Types (from PRD)

| Type | Ticketing |
| ---- | --------- |
| Physical only | Free or Paid |
| Virtual only (stream) | Free or Paid |
| Hybrid (Physical + Virtual) | Various combos: both paid, physical paid + virtual free, etc. |

### Event Categories (40+, expandable by admin)

**Music & Performance:**
Music Concert, Live Band, DJ Set, Album Launch, Music Listening, Opera, Open Mic, Karaoke, Battle of
the Bands, Acoustic Session

**Arts & Theater:**
Theater - Arts, Theater - Music, Dance, Drama, Circus, Acrobatics, Magic, Story Telling, Stand-Up
Comedy, Improv, Poetry Slam, Ballet

**Visual Arts & Exhibitions:**
Art Exhibition, Gallery Opening, Photography Exhibition, Sculpture Show, Fashion Show, Design
Exhibition

**Film & Media:**
Film Screening, Film Festival, Documentary Premiere, Short Film Night, Movie Marathon

**Sports & Gaming:**
Sports (Live), Esports, Video Games, Fitness Class, Marathon/Race, Boxing/MMA, Wrestling, Chess
Tournament

**Community & Social:**
Festival, Carnival, Lunch Party, Dinner Party, Charity Show, Gala, Fundraiser, Networking Event,
Meetup, Block Party

**Literature & Education:**
Book Launch, Book Readers, Writers Events, Workshop, Masterclass, Seminar, Conference, Hackathon,
Panel Discussion, Lecture, Webinar

**Lifestyle & Wellness:**
Food & Drink, Wine Tasting, Cooking Class, Yoga/Meditation, Wellness Retreat, Pop-Up Market

**Religion & Culture:**
Religious Event, Cultural Celebration, Heritage Festival, Community Prayer

**Corporate & Professional:**
Corporate Event, Product Launch, Trade Show, Award Ceremony, Annual General Meeting

**Kids & Family:**
Kids Party, Family Fun Day, Children's Theater, School Event

Categories are admin-managed in the database — new categories can be added without code changes.
Categories support subcategories and custom tags for fine-grained discovery.

## Monetization Models (from PRD)

- Pay-per-view (ticket-based stream access)
- Subscription-based access (Premium tier — future)
- Merchandise sales integration (future)
- Advertisement-supported streams (future)
- Donation-based models (future)
- Campaign tools for organisers (paid feature)

---

## Scalability Architecture

Built to scale from day one — every layer is horizontally scalable:

### Stateless Services (Scale by Adding Instances)

| Service | Scaling Strategy |
| ------- | ---------------- |
| **Go API** | Stateless, scale horizontally behind Traefik load balancer |
| **Next.js SSR** | Stateless, scale horizontally |
| **Redpanda Workers** | Consumer groups — add workers, partitions auto-balance |
| **Stream Proxy** | Stateless JWT validation, scale per concurrent viewer count |
| **FFmpeg Workers** | Job queue — add workers for parallel transcoding |

### Stateful Services (Scale Vertically, Then Shard)

| Service | Phase 1 (MVP) | Phase 2 (Growth) | Phase 3 (Scale) |
| ------- | ------------- | ----------------- | --------------- |
| **PostgreSQL** | Single instance (16GB) | Read replicas, connection pooling (PgBouncer) | Citus/sharding by org_id |
| **Redis** | Single instance | Sentinel (HA) | Redis Cluster (sharded) |
| **Redpanda** | Single node | 3-node cluster | 5+ nodes, multi-DC |
| **MinIO** | Single instance | Erasure coding (4 nodes) | Distributed mode |
| **Typesense** | Single node | 3-node cluster | Sharded by region |
| **MediaMTX** | Single instance | Multiple instances (geo-distributed) | Edge nodes per region |

### Database Scalability Patterns

```text
Phase 1 (0-10K users):
  └─ Single PostgreSQL, simple queries, no optimization needed

Phase 2 (10K-100K users):
  ├─ Read replicas for read-heavy queries (explore, search)
  ├─ PgBouncer connection pooling
  ├─ Table partitioning: audit_events by month, ledger_entries by year
  ├─ Materialized views for analytics dashboards
  └─ Redis caching for hot data (event listings, user sessions)

Phase 3 (100K-1M+ users):
  ├─ Citus extension for horizontal sharding (by org_id or country)
  ├─ Separate analytics database (ClickHouse for event analytics)
  ├─ CQRS: separate read/write models for high-traffic endpoints
  └─ Multi-region deployment
```

### Streaming Scalability

```text
Phase 1: Single MediaMTX + FFmpeg server
  └─ Handles ~50 concurrent streams, ~5K concurrent viewers

Phase 2: Dedicated stream servers per region
  ├─ Africa (Lagos): MediaMTX + FFmpeg + Nginx edge
  ├─ Europe (Frankfurt): MediaMTX + FFmpeg + Nginx edge
  └─ Americas (NYC): MediaMTX + FFmpeg + Nginx edge

Phase 3: CDN-backed delivery
  ├─ Origin: MediaMTX + FFmpeg (single region)
  ├─ Edge: Nginx HLS caches at each region
  └─ Pull-through CDN (Bunny.net or CloudFront) for global reach
```

### Event Bus Scalability (Redpanda)

```text
Phase 1: Single Redpanda node, 10 partitions per topic
Phase 2: 3-node cluster, 30 partitions, consumer groups scale workers
Phase 3: 5+ nodes, topic compaction, multi-DC replication
```

### Key Scalability Decisions Made Now (Not Later)

- **UUIDs as primary keys** — no sequential bottleneck for distributed inserts
- **Event-driven** — services communicate via Redpanda, not direct HTTP calls (decoupled)
- **Stateless API** — JWT auth, no server-side sessions (Redis only for stream sessions)
- **Idempotent operations** — all Redpanda consumers handle duplicate messages safely
- **Connection pooling** — PgBouncer from day one
- **Pagination everywhere** — cursor-based pagination on all list endpoints
- **Rate limiting** — per-user, per-IP, per-endpoint from day one
- **Feature flags** — Unleash (OSS) for gradual rollouts, A/B testing

---

## Working Directory

All repos will be created under `/Users/APPLE/Unvamp/`:

```text
/Users/APPLE/Unvamp/
├── unvamp-site/         # Marketing website (unvamp.com)
├── unvamp-web/          # Web app (app.unvamp.com)
├── unvamp-api/          # Go backend + infrastructure
└── unvamp-admin/        # Admin dashboard (admin.unvamp.com)
```

Android and iOS repos will be added here after web MVP.

---

## Repo 0: `unvamp-site` (Marketing Website)

```text
unvamp-site/
├── app/
│   ├── page.tsx                  # Landing/home page (hero, features, CTA)
│   ├── pricing/                  # Pricing plans (Free vs Premium, Organiser fees)
│   ├── about/                    # About Unvamp, team, mission
│   ├── features/                 # Feature showcase (streaming, marketplace, etc.)
│   ├── for-organisers/           # Dedicated organiser landing page
│   ├── for-attendees/            # Dedicated attendee landing page
│   ├── blog/                     # Blog / news (MDX-based or CMS)
│   │   └── [slug]/
│   ├── help/                     # Help center / FAQ
│   ├── careers/                  # Careers page (future)
│   ├── contact/                  # Contact form
│   ├── legal/
│   │   ├── terms/                # Terms & Conditions
│   │   ├── privacy/              # Privacy Policy
│   │   └── refund/               # Refund Policy
│   └── layout.tsx
├── components/
│   ├── ui/                       # Shared design system (same tokens as web app)
│   ├── marketing/
│   │   ├── Hero.tsx
│   │   ├── FeatureGrid.tsx
│   │   ├── Testimonials.tsx
│   │   ├── PricingTable.tsx
│   │   ├── AppDownloadCTA.tsx    # "Get the Unvamp Mobile App" section
│   │   ├── OrganizerCTA.tsx      # "Start selling tickets" CTA
│   │   └── Newsletter.tsx        # "Subscribe for updates"
│   └── layout/
│       ├── Navbar.tsx            # Marketing navbar (Login / Sign Up / Download App)
│       └── Footer.tsx            # Links, social, legal, contact
├── lib/
│   └── blog/                     # MDX processing or CMS client
├── styles/
│   └── globals.css               # Same design tokens (light + dark)
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml            # Independent deploy (no API dependency)
├── Dockerfile
└── package.json
```

**Note:** The marketing site deploys independently — it does not depend on `unvamp-api`. It links to
`app.unvamp.com` for login/signup.

---

## Repo 1: `unvamp-web` (Web App)

```text
unvamp-web/
├── app/
│   ├── (auth)/                   # No sidebar layout
│   │   ├── login/
│   │   ├── register/
│   │   ├── verify-otp/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── complete-profile/
│   │   └── interests/
│   ├── (guest)/                  # Guest-accessible (no auth required)
│   │   ├── explore/
│   │   └── event/[id]/
│   ├── (main)/                   # Authenticated layout (sidebar + header)
│   │   ├── explore/
│   │   ├── events/
│   │   │   ├── [id]/
│   │   │   ├── create/
│   │   │   ├── manage/
│   │   │   └── [id]/recap/
│   │   ├── tours/
│   │   │   ├── create/
│   │   │   └── [id]/
│   │   ├── streaming/
│   │   │   ├── [id]/live/
│   │   │   ├── [id]/replay/
│   │   │   └── [id]/setup/
│   │   ├── tickets/
│   │   │   ├── my-tickets/
│   │   │   ├── cart/
│   │   │   └── [id]/
│   │   ├── marketplace/
│   │   ├── wallet/
│   │   ├── profile/
│   │   ├── check-in/             # Organiser check-in dashboard
│   │   │   └── [eventId]/
│   │   └── settings/
│   │       ├── kyc/
│   │       ├── notifications/
│   │       ├── security/         # 2FA/MFA setup
│   │       ├── appearance/       # Theme toggle
│   │       ├── payment/
│   │       ├── users/            # Team management
│   │       └── help/
│   └── layout.tsx
├── components/
│   ├── ui/                       # Design system
│   ├── layout/
│   ├── streaming/
│   │   ├── VideoPlayer.tsx       # hls.js + DRM-lite
│   │   ├── BrowserStreamer.tsx    # WebRTC browser streaming
│   │   ├── MultiCamSwitcher.tsx  # Multi-device camera switcher
│   │   ├── PollWidget.tsx
│   │   ├── QAWidget.tsx          # Q&A feature
│   │   ├── ChatPanel.tsx
│   │   └── DeviceManager.tsx
│   ├── events/
│   ├── tickets/
│   ├── marketplace/
│   ├── wallet/
│   ├── kyc/
│   │   └── DynamicKYCForm.tsx
│   ├── check-in/
│   │   ├── QRScanner.tsx
│   │   └── SeatAssignment.tsx
│   └── feedback/
│       ├── Toast.tsx             # Toast notification system
│       └── ErrorBoundary.tsx     # Global error boundary
├── lib/
│   ├── api/                      # Typed API client
│   │   └── errors.ts             # Error code mapping + user-friendly messages
│   ├── auth/
│   ├── streaming/
│   ├── theme/                    # Light/dark mode provider
│   ├── toast/                    # Toast context + hook
│   └── utils/
├── styles/
│   ├── globals.css               # CSS variables (light + dark)
│   └── fonts/
├── .github/
│   └── workflows/
│       ├── ci.yml                # Build, lint, test (75%+ coverage gate)
│       ├── deploy-staging.yml    # Triggers unvamp-api deploy first, then deploys web
│       └── deploy-prod.yml      # Same: deps first, then web
├── Dockerfile
└── package.json
```

## Repo 2: `unvamp-api` (Backend)

```text
unvamp-api/
├── cmd/
│   ├── api/main.go               # HTTP API server
│   ├── worker/main.go            # Redpanda consumer workers
│   └── stream-proxy/main.go      # Stream session proxy
├── internal/
│   ├── auth/
│   ├── user/
│   ├── event/
│   ├── ticket/
│   ├── streaming/
│   │   ├── handler.go
│   │   ├── session.go            # Screen limit enforcement
│   │   ├── ingest.go             # RTMP/WebRTC/SRT management
│   │   ├── multicam.go           # Multi-device camera orchestration
│   │   ├── transcode.go          # FFmpeg job management
│   │   └── delivery.go           # Signed HLS URLs, DRM-lite
│   ├── marketplace/
│   ├── wallet/
│   │   ├── ledger.go             # Double-entry accounting
│   │   ├── settlement.go         # T+2 / T+5 settlement logic
│   │   └── refund.go
│   ├── media/
│   ├── chat/                     # WebSocket: chat, Q&A, polls
│   ├── checkin/                  # QR verification, seat assignment, attendance
│   ├── kyc/
│   │   ├── engine.go             # Dynamic rule engine
│   │   └── sumsub.go
│   ├── notification/
│   ├── search/
│   ├── analytics/                # Viewer counts, engagement, demographics
│   ├── campaign/                 # Organiser marketing campaigns (paid feature)
│   ├── moderation/               # Content moderation engine
│   └── admin/                    # Admin API endpoints
├── pkg/
│   ├── database/
│   ├── redis/
│   ├── storage/
│   ├── events/                   # Redpanda producer/consumer framework
│   │   ├── producer.go
│   │   ├── consumer.go
│   │   └── topics.go
│   ├── middleware/
│   ├── validator/
│   ├── errors/                   # Error codes, mapping, i18n messages
│   │   ├── codes.go              # Centralized error code registry
│   │   ├── mapper.go             # Error → user-friendly message mapping
│   │   └── response.go           # Standard error response format
│   └── audit/                    # Activity tracking & audit logging
│       ├── logger.go             # Structured audit event logging
│       ├── middleware.go         # Auto-log all API requests
│       └── types.go              # Audit event types
├── migrations/                   # SQL migrations (golang-migrate)
├── infrastructure/
│   ├── docker-compose.yml        # Local dev: all services
│   ├── docker-compose.prod.yml   # Production compose
│   ├── docker-compose.staging.yml
│   ├── Dockerfile.api            # Go API image
│   ├── Dockerfile.worker         # Redpanda worker image
│   ├── Dockerfile.stream-proxy   # Stream proxy image
│   ├── keycloak/                 # Realm config, themes
│   ├── mediamtx/                 # MediaMTX config
│   ├── nginx/                    # Nginx-RTMP + HLS config
│   ├── ffmpeg/                   # Transcoding profiles
│   ├── prometheus/               # Prometheus config + alert rules
│   ├── grafana/                  # Dashboard JSON files
│   ├── loki/                     # Loki config
│   ├── traefik/                  # Traefik config, TLS
│   ├── redpanda/                 # Redpanda config, topic definitions
│   └── scripts/
│       ├── deploy.sh             # Deployment script
│       ├── seed.sh               # DB seed data
│       └── health-check.sh       # Service health verification
├── .github/
│   └── workflows/
│       ├── ci.yml                # Build, lint, test (75%+ coverage gate)
│       ├── deploy-staging.yml    # Deploy to staging (deploys deps first)
│       └── deploy-prod.yml      # Deploy to production (deploys deps first)
└── go.mod
```

## Repo 3: `unvamp-admin` (Internal Admin Dashboard — I Will Design)

```text
unvamp-admin/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── overview/             # Platform-wide KPIs
│   │   ├── users/
│   │   │   ├── list/             # All users, search, filter
│   │   │   ├── [id]/             # User detail, KYC status, activity log
│   │   │   └── kyc-review/       # KYC approval queue
│   │   ├── events/
│   │   │   ├── list/             # All events, status filters
│   │   │   ├── [id]/             # Event detail, stream health, revenue
│   │   │   └── reported/         # Reported events review
│   │   ├── transactions/
│   │   │   ├── list/             # All transactions
│   │   │   ├── settlements/      # Pending settlements (T+2/T+5)
│   │   │   ├── refunds/          # Refund queue
│   │   │   └── payouts/          # Organiser payout management
│   │   ├── streams/
│   │   │   ├── live/             # Currently live streams + health
│   │   │   └── history/          # Past streams, recording access
│   │   ├── marketplace/
│   │   │   ├── listings/         # Active listings
│   │   │   └── disputes/         # Marketplace disputes
│   │   ├── moderation/
│   │   │   ├── content/          # Flagged content review
│   │   │   ├── chat/             # Chat moderation queue
│   │   │   └── users/            # Banned/suspended users
│   │   ├── kyc/
│   │   │   ├── countries/        # Country config management
│   │   │   ├── tiers/            # Tier requirement management
│   │   │   ├── documents/        # Document type management
│   │   │   └── review/           # Verification review queue
│   │   ├── analytics/
│   │   │   ├── revenue/          # Platform revenue dashboard
│   │   │   ├── users/            # User growth, demographics
│   │   │   ├── events/           # Event metrics, categories
│   │   │   └── streaming/        # Stream health, viewer analytics
│   │   ├── support/
│   │   │   ├── tickets/          # Customer support tickets
│   │   │   └── reports/          # User reports
│   │   ├── settings/
│   │   │   ├── roles/            # Admin role management
│   │   │   ├── permissions/      # Permission matrix
│   │   │   ├── platform/         # Platform settings (fees, limits)
│   │   │   └── notifications/    # System notification templates
│   │   └── audit-log/            # Full activity audit trail
│   └── layout.tsx
├── components/
│   ├── ui/                       # Shared with unvamp-web design system
│   ├── charts/                   # Analytics charts (Recharts/Tremor)
│   ├── tables/                   # Data tables with sorting/filtering
│   └── workflows/                # Approval workflows UI
├── .github/
│   └── workflows/
│       ├── ci.yml                # Build, lint, test (75%+ coverage gate)
│       ├── deploy-staging.yml    # Triggers unvamp-api deploy first, then admin
│       └── deploy-prod.yml
├── Dockerfile
└── package.json
```

## CI/CD Pipeline Strategy (Cross-Repo Dependencies)

### Deployment Order (Enforced)

No frontend/app can deploy without its backend dependencies being deployed first:

```text
Deploy Order (every environment):

0. unvamp-site (independent — no API dependency)
   ├── Build static/SSR marketing pages
   ├── Deploy container
   └── Lighthouse performance check

1. unvamp-api (backend + all infrastructure services)
   ├── PostgreSQL migrations run
   ├── Redpanda topics created/updated
   ├── Keycloak realm synced
   ├── MediaMTX + Nginx configs deployed
   ├── Redis/MinIO/Typesense verified healthy
   └── API health check passes

2. unvamp-web (only after unvamp-api is healthy)
   ├── Build with API URL for target environment
   ├── Deploy Next.js container
   └── E2E smoke test against live API

3. unvamp-admin (only after unvamp-api is healthy)
   ├── Build with API URL
   ├── Deploy container (IP-restricted)
   └── Admin health check

4. unvamp-android / unvamp-ios (only after unvamp-api is healthy)
   └── Build + publish to stores (when applicable)
```

### Per-Repo Pipeline Structure

Each repo has its own GitHub Actions pipeline:

```yaml
# Every repo's CI (ci.yml):
- Lint (eslint/golangci-lint)
- Type check (tsc/go vet)
- Unit tests (75%+ coverage GATE — fails build if below)
- Integration tests (against Docker Compose test stack)
- Build (docker image)
- Security scan (trivy/govulncheck/npm audit)

# Deploy pipelines (deploy-staging.yml / deploy-prod.yml):
- Trigger dependency deploy first:
    - unvamp-web → triggers unvamp-api deploy workflow via GitHub API
    - unvamp-admin → triggers unvamp-api deploy workflow
    - unvamp-android → triggers unvamp-api deploy workflow
    - unvamp-ios → triggers unvamp-api deploy workflow
- Wait for dependency deploy to succeed
- Health check: verify all dependent services are running
- Deploy self
- Post-deploy smoke tests
- Rollback on failure
```

### Cross-Repo Triggers

```text
# unvamp-web/.github/workflows/deploy-staging.yml
jobs:
  deploy-dependencies:
    # Step 1: Trigger unvamp-api staging deploy
    - uses: peter-evans/repository-dispatch
      with:
        repository: your-org/unvamp-api
        event-type: deploy-staging

    # Step 2: Wait for API to be healthy
    - run: ./scripts/wait-for-api.sh https://api-staging.unvamp.com/health

  deploy-web:
    needs: deploy-dependencies
    # Step 3: Deploy web only after API is confirmed healthy
    ...
```

### Test Coverage Gates

| Repo | Minimum Coverage | Enforcement |
| ---- | ---------------- | ----------- |
| `unvamp-api` | 75% | CI fails if below, blocks merge + deploy |
| `unvamp-web` | 75% | CI fails if below, blocks merge + deploy |
| `unvamp-admin` | 75% | CI fails if below, blocks merge + deploy |
| `unvamp-android` | 75% | CI fails if below, blocks merge + deploy |
| `unvamp-ios` | 75% | CI fails if below, blocks merge + deploy |

### Environment Promotion

```text
Feature Branch → PR → CI (75% coverage gate) → Merge to main
Main → Auto-deploy to Staging
Staging → Manual promote to Production (after QA sign-off)
```

## Error Handling Strategy

### Error Code System

All API errors follow a structured format:

```go
// pkg/errors/codes.go
type AppError struct {
    Code       string `json:"code"`        // "ERR_AUTH_001"
    Message    string `json:"message"`     // User-friendly message
    Detail     string `json:"detail"`      // Developer detail (omitted in prod)
    StatusCode int    `json:"-"`           // HTTP status
}

// Error code registry
const (
    // Auth errors (ERR_AUTH_XXX)
    ErrAuthInvalidCredentials = "ERR_AUTH_001"  // "Invalid email or password"
    ErrAuthOTPExpired         = "ERR_AUTH_002"  // "Verification code has expired. Please request a new one"
    ErrAuthOTPInvalid         = "ERR_AUTH_003"  // "Invalid verification code"
    ErrAuthAccountLocked      = "ERR_AUTH_004"  // "Account temporarily locked. Try again in 15 minutes"
    ErrAuthEmailExists        = "ERR_AUTH_005"  // "An account with this email already exists"
    ErrAuthSocialFailed       = "ERR_AUTH_006"  // "Unable to sign in with {provider}. Please try again"

    // Event errors (ERR_EVT_XXX)
    ErrEventNotFound          = "ERR_EVT_001"   // "Event not found"
    ErrEventCancelled         = "ERR_EVT_002"   // "This event has been cancelled"
    ErrEventFull              = "ERR_EVT_003"   // "This event is sold out"
    ErrEventPast              = "ERR_EVT_004"   // "This event has already ended"

    // Ticket errors (ERR_TKT_XXX)
    ErrTicketSoldOut          = "ERR_TKT_001"   // "Tickets for this tier are sold out"
    ErrTicketAlreadyUsed      = "ERR_TKT_002"   // "This ticket has already been used"
    ErrTicketNotTransferable  = "ERR_TKT_003"   // "This ticket cannot be transferred"
    ErrTicketInvalidQR        = "ERR_TKT_004"   // "Invalid ticket QR code"

    // Stream errors (ERR_STR_XXX)
    ErrStreamScreenLimit      = "ERR_STR_001"   // "Screen limit reached. Sign out another device to continue"
    ErrStreamNotLive          = "ERR_STR_002"   // "This stream is not currently live"
    ErrStreamNoAccess         = "ERR_STR_003"   // "You don't have access to this stream"
    ErrStreamIngestFailed     = "ERR_STR_004"   // "Stream connection failed. Check your settings and try again"

    // Wallet errors (ERR_WAL_XXX)
    ErrWalletInsufficientFunds = "ERR_WAL_001"  // "Insufficient balance"
    ErrWalletWithdrawMinimum   = "ERR_WAL_002"  // "Minimum withdrawal amount is {amount}"

    // Marketplace errors (ERR_MKT_XXX)
    ErrMarketOfferExpired     = "ERR_MKT_001"   // "This offer has expired"
    ErrMarketListingClosed    = "ERR_MKT_002"   // "This listing is no longer available"

    // KYC errors (ERR_KYC_XXX)
    ErrKYCDocumentInvalid     = "ERR_KYC_001"   // "Document could not be verified. Please upload a clearer image"
    ErrKYCFaceNoMatch         = "ERR_KYC_002"   // "Face verification failed. Please try again in good lighting"

    // Payment errors (ERR_PAY_XXX)
    ErrPaymentDeclined        = "ERR_PAY_001"   // "Payment was declined. Please try another payment method"
    ErrPaymentTimeout         = "ERR_PAY_002"   // "Payment timed out. Please try again"

    // General errors
    ErrValidation             = "ERR_GEN_001"   // "Please check your input and try again"
    ErrRateLimit              = "ERR_GEN_002"   // "Too many requests. Please wait a moment"
    ErrServiceUnavailable     = "ERR_GEN_003"   // "Service temporarily unavailable. Please try again shortly"
)
```

### Frontend Toast System

```typescript
// lib/toast/types.ts
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;   // auto-dismiss ms (default 5000, errors 8000)
  action?: {           // optional action button
    label: string;
    onClick: () => void;
  };
}

// lib/api/errors.ts — maps API error codes to toast messages
const ERROR_MAP: Record<string, { title: string; message: string; type: ToastType }> = {
  'ERR_STR_001': {
    title: 'Screen Limit Reached',
    message: 'Sign out another device to continue watching.',
    type: 'warning',
  },
  'ERR_PAY_001': {
    title: 'Payment Declined',
    message: 'Your card was declined. Please try another payment method.',
    type: 'error',
  },
  // ... all error codes mapped
};
```

### API Response Format (Standard Envelope)

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERR_TKT_001",
    "message": "Tickets for this tier are sold out"
  }
}
```

## Activity Tracking & Audit Logging

### What Gets Logged

Every significant action produces a structured audit event:

```go
// pkg/audit/types.go
type AuditEvent struct {
    ID          string    `json:"id"`
    Timestamp   time.Time `json:"timestamp"`
    ActorID     string    `json:"actor_id"`      // Who did it
    ActorType   string    `json:"actor_type"`     // user, admin, system
    Action      string    `json:"action"`         // verb: created, updated, deleted, etc.
    Resource    string    `json:"resource"`        // event, ticket, stream, wallet, etc.
    ResourceID  string    `json:"resource_id"`
    Details     any       `json:"details"`         // Change diff or context
    IPAddress   string    `json:"ip_address"`
    UserAgent   string    `json:"user_agent"`
    Country     string    `json:"country"`         // GeoIP
    SessionID   string    `json:"session_id"`
}
```

### Tracked Actions

| Domain | Actions Logged |
| ------ | -------------- |
| **Auth** | login, logout, register, otp_sent, otp_verified, password_reset, 2fa_enabled, social_login |
| **User** | profile_updated, avatar_changed, interests_updated, account_deleted, role_changed |
| **Event** | created, updated, cancelled, published, unpublished, reported |
| **Ticket** | purchased, assigned, transferred, refunded, checked_in, qr_scanned |
| **Stream** | started, ended, session_started, session_ended, screen_limit_hit, quality_changed, camera_added, layout_switched |
| **Marketplace** | listed, delisted, offer_made, offer_accepted, offer_rejected, offer_countered |
| **Wallet** | credited, debited, withdrawal_requested, withdrawal_completed, refund_processed |
| **KYC** | submitted, approved, rejected, document_uploaded, face_verified |
| **Media** | uploaded, approved, rejected, deleted |
| **Chat** | message_sent, message_deleted, user_muted, user_banned |
| **Admin** | user_suspended, event_removed, payout_approved, config_changed |

### Storage Strategy

- **Hot (30 days):** PostgreSQL `audit_events` table — queryable, fast
- **Warm (1 year):** Compressed in MinIO as JSON lines files
- **Cold (7 years):** Archived for compliance
- **Real-time:** Redpanda topic `audit.events` — consumed by Grafana/Loki for dashboards

## Event-Driven Architecture (Redpanda)

### All Event Topics

```text
# Auth & User
auth.login                      → Analytics, security monitoring
auth.register                   → Welcome email, analytics
user.profile.updated            → Search re-index

# Events
events.created                  → Search indexing, notification to followers
events.updated                  → Search re-index, attendee notification
events.cancelled                → Refund triggers, notification blast
events.started                  → Stream activation, attendee notification
events.reported                 → Admin moderation queue

# Tickets
tickets.purchased               → Wallet debit, confirmation email, analytics
tickets.assigned                → Notification to assignee
tickets.refunded                → Wallet credit, confirmation
tickets.checked_in              → Attendance counter, seat assignment

# Streaming
streams.started                 → CDN warm-up, viewer notification
streams.ended                   → Recording finalization, recap generation
streams.session.started         → Analytics, concurrent viewer count
streams.session.ended           → Analytics update
streams.health.degraded         → Alert organiser, auto-quality adjustment
streams.camera.connected        → Multi-cam switcher update
streams.layout.changed          → FFmpeg re-compose

# Marketplace
marketplace.listed              → Search index, notification to watchers
marketplace.offer.made          → Notification to seller
marketplace.offer.accepted      → Escrow release, ticket transfer

# Wallet & Payments
wallet.credited                 → Transaction record, notification
wallet.debited                  → Transaction record, notification
wallet.withdrawal.requested     → Payout processing
wallet.settlement.due           → T+2/T+5 settlement trigger

# KYC
kyc.submitted                   → Verification processing
kyc.approved                    → User tier upgrade, notification
kyc.rejected                    → Notification with reason

# Media & Moderation
media.uploaded                  → Transcode job, thumbnail generation
media.approved                  → Gallery publication
media.rejected                  → Notification to uploader
moderation.flagged              → Admin review queue

# Notifications (routed)
notifications.email             → Email worker
notifications.push              → Push worker (FCM/APNs)
notifications.in_app            → WebSocket broadcast
notifications.sms               → SMS worker (for OTP)

# Audit
audit.events                    → Loki ingestion, compliance archive
```

## Organiser Streaming Setup Flow (Enhanced per PRD)

### 7-Step Organiser Workflow

```text
Step 1: CREATE EVENT
  └─ Event details, type (physical/virtual/hybrid), category, date/time, venue

Step 2: CONFIGURE TICKETS
  └─ Tiers, pricing, benefits, quantity, max_streams per tier
  └─ Multiple date/time slots supported

Step 3: CONFIGURE STREAMING
  ├─ Select streaming method:
  │   ├─ OBS / Desktop software (RTMP) → Generate stream key + RTMP URL
  │   ├─ Browser-based (WebRTC) → Open in-browser streaming UI
  │   ├─ Mobile app (WebRTC/RTMP) → QR code / deep link
  │   └─ External app (Prism Live, XSplit, etc.) → Provide RTMP URL + key
  ├─ Select encoding tool (from PRD):
  │   ├─ Software: OBS Studio, XSplit, vMix, Wirecast, FFmpeg
  │   └─ Hardware: AJA HELO, Blackmagic ATEM, Teradek VidiU, NewTek TriCaster
  ├─ Video quality: HD (720p) / Full HD (1080p) / 4K (2160p)
  ├─ Latency mode: Ultra-low (<3s) / Low (<10s) / Normal (<30s)
  ├─ Interactive features (toggles):
  │   ├─ Live Chat (on/off)
  │   ├─ Q&A (on/off)
  │   └─ Polling (on/off)
  ├─ Additional options:
  │   ├─ Enable recording (auto-save to MinIO)
  │   └─ Enable backup stream (redundant ingest)
  └─ Multi-camera mode:
      ├─ Enable multi-cam → generates N stream keys
      └─ Each team member joins as "Camera" from their phone

Step 4: TEST STREAM
  ├─ Private test stream (not visible to attendees)
  ├─ Health dashboard:
  │   ├─ Bandwidth (Kbps)
  │   ├─ Frame rate (FPS)
  │   ├─ Resolution
  │   ├─ Audio sync check
  │   ├─ Dropped frames
  │   └─ Latency measurement
  └─ Preview window (what viewers will see)

Step 5: PREVIEW & PUBLISH
  └─ Review all settings → publish event

Step 6: GO LIVE
  ├─ Start stream from dashboard
  ├─ Monitor in real-time:
  │   ├─ Viewer count
  │   ├─ Chat activity
  │   ├─ Engagement metrics
  │   └─ Stream health
  ├─ Multi-cam controls (if enabled):
  │   ├─ Switch between cameras
  │   ├─ Picture-in-picture
  │   └─ Split/grid view
  └─ Moderation tools (mute/ban/delete messages)

Step 7: POST-EVENT
  ├─ Stream auto-saved (if recording enabled)
  ├─ Analytics dashboard:
  │   ├─ Total viewers (peak + average)
  │   ├─ Ticket sales breakdown
  │   ├─ Revenue summary
  │   ├─ Engagement metrics (chat messages, polls, Q&A)
  │   ├─ Viewer demographics (country, device)
  │   └─ Check-in percentage (for hybrid events)
  ├─ Replay/VOD management → enable on-demand access
  └─ Event recap management (upload official media)
```

### Multi-Device Video Capture

```text
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Phone 1  │  │ Phone 2  │  │ Phone 3  │
│ Camera A │  │ Camera B │  │ Camera C │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │ WebRTC      │ WebRTC      │ WebRTC
     ▼             ▼             ▼
┌────────────────────────────────────────┐
│          MediaMTX (Ingest)             │
│  stream/{event_id}/cam-1              │
│  stream/{event_id}/cam-2              │
│  stream/{event_id}/cam-3              │
└────────────────┬───────────────────────┘
                 ▼
┌────────────────────────────────────────┐
│     Web-Based Switcher UI              │
│  ┌─────┐ ┌─────┐ ┌─────┐             │
│  │Cam 1│ │Cam 2│ │Cam 3│  Preview    │
│  └─────┘ └─────┘ └─────┘             │
│  [LIVE]  [PiP]   [Split]  Controls   │
└────────────────┬───────────────────────┘
                 ▼
┌────────────────────────────────────────┐
│     FFmpeg (Compose + Transcode)       │
│  Single | Switch | PiP | Split | Grid │
│  Output → Adaptive bitrate HLS        │
└────────────────────────────────────────┘
```

## Anti-Download Protection (DRM-Lite)

1. **Signed HLS URLs** — Each segment URL has time-limited token (30s expiry)
2. **AES-128 encrypted segments** — Key rotation every 60s via key server
3. **Origin/referrer checks** — Only serve to unvamp.com
4. **No download headers** — All content served as streaming only
5. **Invisible watermarking** — FFmpeg-injected per ticket_purchase_id for forensic tracing
6. **Screen recording detection** (best-effort) — JS API detection + visible watermark overlay
7. **Widevine DRM** — Phase 2, for full browser-level DRM

## Check-In System (from PRD)

### Physical Events

- QR code scanning (organiser's phone/tablet or dedicated scanner)
- User data validation: User ID, Email, Phone Number
- Seat assignment (for seated events)
- Attendance tracking (real-time count)
- Prevent re-entry with same ticket
- Venue staff roles: Ushers (scan + assign seats), Bouncers (verify entry)

### Virtual Events

- Automated check-in on stream join
- Session tracking via stream sessions

### Database

```sql
check_ins (
    id UUID PK,
    ticket_purchase_id FK UNIQUE,
    event_id FK,
    checked_in_by FK,           -- staff user who scanned
    check_in_method ENUM('qr_scan', 'manual', 'auto_virtual'),
    seat_assignment VARCHAR,
    checked_in_at TIMESTAMP
)
```

## Payment & Settlement (from PRD)

| Event Type | Settlement | Timeline |
| ---------- | ---------- | -------- |
| Physical tickets | T+2 | 2 days after event ends |
| Virtual events | T+5 | 5 days after event ends |

**Refund policy:** Refunds only if event does not hold. No cash refunds for swaps/downgrades —
balance held in wallet.

**Settlement worker:** Redpanda consumer listens for `events.ended`, schedules payout at T+2 or T+5
via `wallet.settlement.due` topic.

## Dynamic Global KYC System

### Adding a New Country (Zero Code Changes)

Admin dashboard → KYC → Countries → "Add Country":

1. Set country code + name
2. Define tier requirements (Essential, Enhanced, Full Compliance)
3. Configure accepted document types
4. Set which tiers require face verification, proof of address
5. Enable/disable auto-verification
6. Save → immediately available to users from that country

### Cost Optimization

| Action | Method | Cost |
| ------ | ------ | ---- |
| Form fields | In-house | Free |
| Document upload + storage | MinIO | Free |
| Document OCR | Sumsub | ~$0.50/check |
| Face + liveness verification | Sumsub | ~$1.00/check |
| Government DB (NIN/BVN Nigeria) | NIMC/NIBSS APIs | Free |

**You need to set up:**

- Sumsub account (startup pricing, first 50 checks free)
- NIMC API access for NIN verification (Nigeria)
- NIBSS API access for BVN verification (Nigeria)

## Design Tokens — Light + Dark Mode

```css
[data-theme="dark"] {
  --bg-primary: #030e1a;
  --bg-secondary: #061d33;
  --bg-tertiary: #0c3a66;
  --bg-card: #0c3a66;
  --bg-overlay: rgba(12, 58, 102, 0.8);
  --bg-input: #061d33;
  --accent-primary: #1e90ff;
  --accent-hover: #1873cc;
  --accent-success: #22c55e;
  --accent-warning: #ffc107;
  --accent-error: #ef4444;
  --text-primary: #ffffff;
  --text-secondary: #a6aab3;
  --text-muted: #6b7280;
  --border-default: #2b2e33;
  --border-light: #40444d;
  --sidebar-bg: #030e1a;
}

[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e2e8f0;
  --bg-card: #ffffff;
  --bg-overlay: rgba(0, 0, 0, 0.5);
  --bg-input: #f1f5f9;
  --accent-primary: #1e90ff;
  --accent-hover: #1873cc;
  --accent-success: #16a34a;
  --accent-warning: #d97706;
  --accent-error: #dc2626;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border-default: #e2e8f0;
  --border-light: #cbd5e1;
  --sidebar-bg: #ffffff;
}

:root {
  --font-heading: 'GRIFTER', sans-serif;
  --font-body: 'Roboto', sans-serif;
  --font-secondary: 'Open Sans', sans-serif;
}
```

## Mobile Planning (Post-Web)

### Android (`unvamp-android` — Kotlin)

- MVVM architecture + Jetpack Compose
- ExoPlayer for HLS streaming (same DRM-lite protections)
- WebRTC SDK for browser-less streaming (organiser mobile camera)
- Biometric auth (fingerprint/face)
- Offline ticket storage (QR codes)
- Push notifications via FCM
- Same API (`api.unvamp.com`)

### iOS (`unvamp-ios` — Swift)

- MVVM + SwiftUI
- AVPlayer for HLS streaming (+ FairPlay DRM for Apple ecosystem)
- WebRTC SDK for mobile camera streaming
- Face ID / Touch ID
- Offline ticket storage
- Push notifications via APNs
- Same API

### Shared Mobile Features

- Multi-device camera capture (phone as camera source)
- QR ticket scanning (check-in for venue staff)
- Offline-first for tickets and event details
- Deep linking for stream keys and event sharing

## Infrastructure (DigitalOcean/Hetzner)

```text
Production Setup:
├── App Server 1 (4 vCPU, 8GB)    — Go API
├── App Server 2 (4 vCPU, 8GB)    — Next.js SSR (web + admin)
├── DB Server (4 vCPU, 16GB)      — PostgreSQL 16
├── Cache Server (2 vCPU, 4GB)    — Redis/Valkey
├── Stream Server (8 vCPU, 16GB)  — MediaMTX + FFmpeg + Nginx-RTMP
├── Storage Server (2 vCPU, 4GB)  — MinIO
├── Auth Server (2 vCPU, 4GB)     — Keycloak
├── Search (2 vCPU, 4GB)          — Typesense
├── Event Bus (4 vCPU, 8GB)       — Redpanda
├── Worker Server (2 vCPU, 4GB)   — Redpanda consumer workers
├── Logging (2 vCPU, 4GB)         — Loki + Grafana
├── Monitoring (2 vCPU, 4GB)      — Prometheus + Grafana
└── AI Server (GPU or 16 ARM, 32GB) — Ollama (Qwen2.5, Qwen2-VL, BGE-M3, Whisper)

Domains:
  unvamp.com            → Marketing site (landing, pricing, about, blog)
  app.unvamp.com        → Web app (authenticated user experience)
  admin.unvamp.com      → Admin dashboard (IP-restricted)
  api.unvamp.com        → Go API
  stream.unvamp.com     → HLS delivery
  ingest.unvamp.com     → RTMP/WebRTC ingest
  auth.unvamp.com       → Keycloak
  ws.unvamp.com         → WebSocket (chat, notifications)
```

## Implementation Workstreams (All Parallel)

### Workstream 1: Foundation & Auth (P0)

- [ ] Scaffold all 4 repos (web, api, admin, infra)
- [ ] Docker Compose: PostgreSQL, Redis, Redpanda, Keycloak, MinIO, Typesense, Loki
- [ ] Design system: light/dark CSS vars, GRIFTER font, component library
- [ ] Error handling framework (Go error codes + frontend toast system)
- [ ] Audit logging middleware (all API requests logged)
- [ ] Redpanda setup: topics, producer/consumer framework
- [ ] Keycloak: realm, social providers, 2FA/MFA, RBAC
- [ ] Auth API: register, login, OTP, password reset, social OAuth
- [ ] Guest user flow
- [ ] Profile setup + interests
- [ ] Admin dashboard: login, overview page

### Workstream 2: Explore & Events (P0)

- [ ] Explore page: hero, categories, carousels, search, filters, geo-search
- [ ] Event CRUD + detail pages (attendee + organiser views)
- [ ] Event creation wizard (7-step per PRD)
- [ ] Tour creation
- [ ] Event management dashboard
- [ ] Event categories (23 from PRD)
- [ ] Event types (physical/virtual/hybrid)
- [ ] Reviews, reports, moderation
- [ ] Admin: event listing, reported events queue

### Workstream 3: Streaming (P0)

- [ ] MediaMTX: RTMP + WebRTC + SRT ingest
- [ ] FFmpeg adaptive bitrate transcoding
- [ ] Nginx HLS delivery + signed URLs + AES-128
- [ ] Stream proxy: JWT, screen limits, anti-download
- [ ] Organiser streaming setup (7-step flow, all ingest methods)
- [ ] Encoder selection (hardware + software list from PRD)
- [ ] Test stream with health dashboard
- [ ] Multi-camera support with web switcher
- [ ] Interactive features: chat, Q&A, polls
- [ ] Recording + replay/VOD
- [ ] Watermarking
- [ ] Admin: live streams monitor, stream health

### Workstream 4: Tickets, Check-In & Marketplace (P1)

- [ ] Ticket tiers with benefits, pricing, max_streams
- [ ] Purchase flow, cart, checkout (Paystack/Stripe)
- [ ] Ticket assignment, QR generation
- [ ] Check-in system: QR scanning, seat assignment, attendance
- [ ] Venue staff roles (ushers, bouncers)
- [ ] Event chat rooms (Lounge, VIP, Organiser Team)
- [ ] Marketplace: Buy/Sell/Swap/Change
- [ ] Offer/counter-offer with escrow
- [ ] Swap/downgrade with balance hold (no cash refund per PRD)
- [ ] Admin: marketplace disputes

### Workstream 5: Wallets & Payments (P1)

- [ ] Double-entry wallet ledger
- [ ] Settlement engine (T+2 physical, T+5 virtual)
- [ ] Refund flows (only if event didn't hold)
- [ ] Paystack + Stripe integration
- [ ] Withdraw, download statements
- [ ] Customer support: live chat, reports
- [ ] Admin: settlements queue, payout management, transaction oversight

### Workstream 6: Settings, KYC & Media (P1)

- [ ] Dynamic KYC engine + DynamicKYCForm
- [ ] Sumsub integration
- [ ] Initial 6 countries: NG, US, GB, DE, KE, ZA
- [ ] Admin: KYC country config UI, tier management, review queue
- [ ] Settings: notifications, security (2FA), appearance, payment, team, help
- [ ] Media management (organiser + attendee highlights)
- [ ] Content moderation engine
- [ ] Admin: content moderation queue, user management

### Workstream 7: AI/ML Features (P2)

- [ ] Ollama deployment on GPU/CPU server
- [ ] Qwen2.5-7B for chat moderation (Redpanda consumer)
- [ ] Qwen2-VL-7B for media moderation + KYC document pre-screening
- [ ] BGE-M3 embeddings + pgvector for event recommendations + semantic search
- [ ] Whisper-small for stream transcription + auto-generated recaps
- [ ] Qwen2.5-7B for event description generation + SEO optimization
- [ ] FAQ auto-responder for live Q&A
- [ ] Marketplace fraud detection (statistical anomaly + LLM-assisted review)
- [ ] DeepSeek API as fallback for traffic spikes
- [ ] Admin: AI moderation dashboard, model health monitoring

## AI/ML Features (Self-Hosted, Budget-Friendly)

### AI Infrastructure

| Component | Model | Size | RAM | Purpose |
| --------- | ----- | ---- | --- | ------- |
| **LLM Server** | Ollama or vLLM | - | 8-16GB | Host all text models |
| **Text Model** | Qwen2.5-7B or DeepSeek-V2-Lite | 7B | ~8GB | Chat moderation, summaries, search |
| **Vision Model** | Qwen2-VL-7B | 7B | ~8GB | KYC document OCR, media moderation |
| **Embedding Model** | BGE-M3 or GTE-Qwen2 | 0.5B | ~1GB | Semantic search, recommendations |
| **Speech Model** | Whisper-small (OpenAI, OSS) | 244M | ~1GB | Stream audio transcription |

**Infrastructure cost:** One GPU server (Hetzner GPU, ~$50-80/month for RTX 3090 / A4000) or
CPU-only with quantized models (GGUF Q4) on existing servers.

### AI Feature Map

#### 1. Content Moderation (Chat + Media)

**Problem:** Manual moderation doesn't scale for live chat during events with thousands of viewers.

**Solution:**

- **Chat moderation** — Qwen2.5-7B classifies messages in real-time:
  - Hate speech, harassment, spam, explicit content → auto-hide + flag for review
  - Runs as Redpanda consumer on `chat.message.sent` topic
  - Latency: <200ms per message with batching
- **Image/video moderation** — Qwen2-VL-7B scans uploaded media:
  - NSFW detection, violence, spam
  - Runs on `media.uploaded` topic
  - Flags content for admin review instead of auto-blocking (human-in-the-loop)

```text
chat.message.sent → AI Moderation Worker → flagged? → moderation.flagged
media.uploaded    → AI Vision Worker     → flagged? → moderation.flagged
```

#### 2. Smart Event Recommendations

**Problem:** Users browse 23 categories across global events — discovery is hard.

**Solution:**

- **Embedding-based recommendations** — BGE-M3 encodes events + user interests
- Store embeddings in PostgreSQL (pgvector extension) or Typesense
- "More Like This", "Because you attended X", "Trending near you"
- Collaborative filtering: users who bought ticket A also bought B
- Runs as batch job nightly + real-time on new event creation

```text
User interests + past events → BGE-M3 embeddings → pgvector similarity search
New event created → embed → match to interested users → notification
```

#### 3. Smart Search (Semantic)

**Problem:** Keyword search misses intent ("something fun this weekend in Lagos").

**Solution:**

- **Hybrid search:** Typesense keyword search + BGE-M3 semantic search
- Natural language queries → embedding → nearest neighbor events
- Fallback to keyword if semantic confidence is low

#### 4. Auto-Generated Event Summaries & Recaps

**Problem:** After events, organisers want summaries for marketing.

**Solution:**

- **Stream transcription** — Whisper-small transcribes recorded audio
- **Summary generation** — Qwen2.5-7B summarizes transcription into:
  - Event recap (2-3 paragraphs)
  - Key moments / highlights
  - Quotable moments
- Auto-generated post-event email to attendees
- Runs async on `streams.ended` topic

```text
streams.ended → Whisper transcription → Qwen2.5 summary → recap stored
```

#### 5. KYC Document OCR & Validation

**Problem:** Sumsub charges per check. Pre-screen documents to reduce costs.

**Solution:**

- **Local OCR first** — Qwen2-VL-7B extracts text from ID documents
- Validate format (e.g., NIN is 11 digits, passport number format)
- If passes local validation → send to Sumsub for face match only
- If fails locally → reject immediately with clear message (no Sumsub cost)
- **Savings:** ~30-50% reduction in Sumsub API calls

```text
kyc.document.uploaded → Qwen2-VL OCR → valid format?
  → Yes → Sumsub face match ($1.00)
  → No  → Reject with "Please upload a clearer image" (free)
```

#### 6. Smart Chat Replies & Q&A

**Problem:** Organisers get flooded with repetitive questions during live events.

**Solution:**

- **FAQ auto-responder** — Organiser pre-sets common Q&A pairs
- Qwen2.5-7B matches incoming questions to FAQ using semantic similarity
- If confidence > 0.85 → auto-reply with FAQ answer (tagged as "Auto-reply")
- If confidence < 0.85 → pass to organiser Q&A queue
- Reduces organiser workload during live streams

#### 7. Fraud Detection (Marketplace)

**Problem:** Ticket scalping, fake listings, price manipulation.

**Solution:**

- **Anomaly detection** — Statistical model (no LLM needed):
  - Price outlier detection per event category
  - Velocity checks (same user listing many tickets rapidly)
  - Suspicious offer patterns
- **LLM-assisted review** — Qwen2.5-7B summarizes suspicious patterns for admin:
  - "User X listed 50 tickets in 10 minutes at 3x face value"
  - Admin decides action

#### 8. Automated Event Descriptions & SEO

**Problem:** Many organisers write poor event descriptions, hurting discoverability.

**Solution:**

- Qwen2.5-7B generates optimized event descriptions from:
  - Event title, category, venue, date
  - Organiser's draft description
- Suggests SEO-friendly title variations
- Auto-generates meta descriptions for event pages
- Organiser can accept/edit/reject suggestions

#### 9. Stream Quality Enhancement

**Problem:** Small organisers with poor cameras/lighting produce low-quality streams.

**Solution:**

- **FFmpeg filters** (no AI needed for basics): noise reduction, auto-brightness
- **AI super-resolution** (future/Phase 2): Real-ESRGAN upscaling for low-res inputs
- **Audio enhancement**: noise gate + normalization via FFmpeg filters

### AI Model Deployment

```text
AI Server (Hetzner GPU or DigitalOcean GPU Droplet):
├── Ollama (model manager)
│   ├── qwen2.5:7b-instruct-q4_K_M     # Text tasks (~4GB VRAM)
│   ├── qwen2-vl:7b-instruct-q4_K_M    # Vision tasks (~5GB VRAM)
│   ├── bge-m3                           # Embeddings (~0.5GB VRAM)
│   └── whisper:small                    # Speech-to-text (~1GB VRAM)
└── Exposed as internal API (not public)

Integration:
  Go API → HTTP calls to Ollama API (localhost:11434)
  Async: Redpanda events → AI worker consumers → results back to API

Budget options (if no GPU):
  - CPU inference with GGUF Q4 quantization (~3-5x slower but works)
  - Hetzner CAX41 (16 ARM cores, 32GB) handles Q4 models well
  - Or: Use DeepSeek API ($0.14/M input tokens) as fallback for peak load
```

### AI Cost Comparison

| Approach | Monthly Cost | Notes |
| -------- | ------------ | ----- |
| **Self-hosted Ollama (GPU)** | ~$60-80/mo | Hetzner GPU server, unlimited usage |
| **Self-hosted Ollama (CPU)** | ~$30-40/mo | Hetzner ARM, slower but works |
| **DeepSeek API (fallback)** | ~$5-20/mo | Pay-per-use, $0.14/M tokens |
| **OpenAI GPT-4o-mini** | ~$50-200/mo | More expensive, vendor lock-in |
| **No AI** | $0 | Manual moderation, no smart features |

**Recommendation:** Self-hosted Ollama on GPU ($60-80/mo) for unlimited usage. DeepSeek API as
overflow/fallback for traffic spikes.

## Verification Plan

1. **Unit tests:** Go (75%+ coverage gate), Jest for React (75%+ coverage gate)
2. **Integration tests:** API endpoints, Redpanda event flows
3. **E2E tests:** Playwright — full user journeys
4. **Stream tests:** OBS → MediaMTX → FFmpeg → HLS, screen limit, no download, multi-cam
5. **Payment tests:** Paystack/Stripe sandbox, settlement timing
6. **KYC tests:** Sumsub sandbox, dynamic form for multiple countries
7. **Check-in tests:** QR scan, seat assignment, duplicate prevention
8. **Error handling tests:** All error codes mapped, toasts display correctly
9. **Audit tests:** All tracked actions produce audit events
10. **Load tests:** k6 for streaming, ticket purchases, marketplace
11. **Security:** OWASP scan, DRM-lite verification, signed URL expiry
12. **Accessibility:** Keyboard nav, screen reader, color contrast (per PRD)

---

## PART 2 — COMPLETION ROADMAP (added 2026-04-30)

## Audit Snapshot (refreshed 2026-05-16)

Council rollup of where every item stands. Legend: ✅ done · 🟡 partial · ⬜ todo.

### Per-phase status

| Phase | Status | Done / Total | Notes |
| ----- | ------ | ------------ | ----- |
| A — Foundations | ✅ | 7 / 7 | Toast, ErrorBoundary, admin auth/theme, admin login, migration `_missing_tables.sql`, pkg/redis, pkg/sms |
| B — Streaming Core | ✅ | 18 / 18 | Stream-proxy + DRM-lite + signed HLS + key rotation + screen-limit + transcoder + E2E |
| C — Streaming Advanced | ✅ | 10 / 10 | BrowserStreamer, MultiCamSwitcher, DeviceManager, polls/Q&A, recording worker, watermark ledger |
| D — Payments + Wallets | ✅ | 10 / 10 | Paystack + Stripe + cart + refund + settlement worker; 21 unit/integration tests |
| E — KYC + Auth | 🟡 | 11 / 12 | E.12 Sumsub sandbox E2E outstanding (E.8 closed: realm + IDP renderer wired) |
| F — Marketplace + Tickets + Tours | ✅ | 12 / 12 | All handlers + UI + check-in QR; 21 integration tests |
| G — Search + AI | ✅ | 7 / 7 | Typesense + BGE-M3 hybrid + index sync worker; seed scripted |
| H — Admin dashboards | ✅ | 7 / 7 | Admin Playwright suite green: 45/45 tests pass (35 smoke + 10 page-specific) |
| I — Marketing site + SEO | ✅ | 4 / 4 | All marketing components + sitemap + JSON-LD |
| J — Observability + Security Hardening | 🟡 | 9 / 10 | Only J.10 (pen-test signed URLs) outstanding — defer to external engagement |
| K — CI/CD + Deployment | ✅ | 7 / 7 | All seven shipped 2026-05-16 (GHCR push, terraform-deploy, Bytebase governance, E2E in CI, prod gate, cross-repo dispatch, coverage gate) |
| L — Load + Chaos + Pre-launch | ✅ | 6 / 6 | k6 + chaos drills + perf-tuning playbook + axe-core all shipped |
| M — Mobile Apps Kickoff | ⬜ | 0 / 3 | Deferred to separate roadmap |
| N — Hyperscale Readiness (5M / event) | ⬜ | 0 / 8 | Centrifugo migration + CDN edge + ingest cluster + read replicas + Dragonfly + autoscaling + fairness + load tests. Drafted 2026-05-17. |
| O — Currency to minor units | ✅ | 1 / 1 | DB (10 cols DECIMAL→BIGINT _minor), Go backend (8 packages, int64), web/admin/site (`lib/currency.ts` + 25 consumer pages). Verified 2026-05-21: go build/vet/staticcheck/golangci-lint clean, `-race` tests pass, all 3 Next builds green. Discard sweep clean (1 documented rune-iteration exception). |
| Maps (PART 3) | ✅ | 5 / 5 | All 5 shipped; local Nominatim container wired + AddressPicker env var documented 2026-05-17 |
| Local-env ergonomics (PART 3) | ✅ | 3 / 3 | All three shipped earlier and verified 2026-05-17 (Makefile wrappers, README documentation, workspace `pnpm dev:all` script) |

### Per-gap-table status

| Table | ✅ | 🟡 | ⬜ | Notes |
| ----- | -- | -- | -- | ----- |
| Backend (`B1`–`B22`) | 22 | 0 | 0 | All 14 internal packages have test coverage (B20 closed 2026-05-17). Three production bugs caught & fixed during the sweep: auth context-key mismatch, chat broadcast data race, moderation table-name mismatch. |
| Web (`F1`–`F12`) | 12 | 0 | 0 | All gaps closed |
| Admin (`A1`–`A7`) | 7 | 0 | 0 | A3, A4, A5 (AI moderation / model health / feature flags) shipped 2026-05-16 |
| Site (`S1`–`S3`) | 3 | 0 | 0 | All gaps closed |
| Infrastructure (`I1`–`I19`) | 17 | 2 | 0 | Full sweep complete; I10 Dragonfly migration playbook shipped 2026-05-16 |
| CI/CD (`C1`–`C7`) | 7 | 0 | 0 | Full sweep 2026-05-16: C1 + C2 + C4 + C5 + C6 + C7 shipped; C3 superseded by IaC |

### Cross-cutting wins added this audit cycle

- **Real DB integration tests (2026-05-15)** — 35 new tests across settlement / wallet / ticket
  / marketplace against live Postgres, plus 14 payment unit tests + 12 safepath unit tests = 61
  new tests with `-race`. Two production bugs surfaced and fixed:
  - `wallets.updated_at` missing column (migration `20260515000001_wallets_updated_at.sql`)
  - `ticket.ListByUser` NULL-scan crash for unassigned tickets (COALESCE fix in repo)
- **Hetzner Terraform IaC (2026-05-15)** — `infra/terraform/` with three validated environments
  (dev all-in-one CX31; staging 7 dedicated servers; prod HA cluster with load balancer,
  Postgres replica, 3-node Redpanda, 3-node app tier). Provider set: hcloud + hetznerdns +
  postgresql + keycloak + minio + unleash + null + random.
- **Reproducible service config (2026-05-15)** — `infra/scripts/`: `run-migrations.sh` with
  `schema_migrations` tracking, `seed-minio-buckets.sh` (buckets + lifecycle + SSE),
  `seed-typesense.sh` (events / organisers / venues collections), `seed-keycloak-realm.sh`
  (HTTPS-safe import, refuses to weaken sslRequired), `seed-unleash-flags.sh`,
  `seed-all.sh` orchestrator. All idempotent. Wired into each environment via `null_resource`.

### Remaining roadmap items (definitive TODO list)

P0 / scale + security critical:

- [x] K.1 — GHCR image push on every repo's `main`. _(done 2026-05-16: matrix docker job in
  unvamp-api/.github/workflows/ci.yml pushes api+worker+stream-proxy; Dockerfile + docker job
  added to unvamp-web, unvamp-admin, unvamp-site)_
- [x] K.2 — CI runner that invokes `terraform apply` + `seed-all.sh` per environment.
  _(2026-05-16: `unvamp-api/.github/workflows/terraform-deploy.yml` with plan/apply/destroy-plan
  choice, GitHub-environment gating, plan artifact handoff)_
- [x] K.4 — Bytebase migration governance against staging. _(`sql-review.yml` runs Bytebase
  check-release on every PR touching `migrations/*.sql`; gracefully falls back to syntax check
  when Bytebase isn't configured)_
- [x] K.6 — E2E job in CI (Playwright + Compose stack). _(2026-05-16:
  `unvamp-api/.github/workflows/e2e.yml` checks out all four repos, brings the data plane up
  via compose, applies migrations, runs Playwright against built web, uploads HTML report +
  logs on failure)_
- [x] K.7 — Prod deploy manual-approval gate. _(both `deploy.yml` and `terraform-deploy.yml`
  use `environment:` block; GitHub's environment-protection rules gate prod on required
  reviewers — operator configures the `prod` environment with reviewer list in repo Settings →
  Environments)_
- [x] C1 — admin / site test + coverage CI jobs. _(admin + site already had
  `pnpm test:coverage` plus a coverage-gate job; gates use dev-friendly 3-5% baselines, will
  be tightened by K.5)_
- [x] C2 — GHCR image push on `main`. _(same matrix docker jobs as K.1)_
- [x] C4 — cross-repo deploy chain. _(`unvamp-api/.github/workflows/deploy.yml` notify-frontends
  job dispatches `api-deployed` event to web/admin/site after staging health check; each
  frontend repo's deploy.yml listens for it)_
- [x] C7 — E2E in CI. _(same as K.6, done 2026-05-16)_

P1 / before prod readiness:

- [x] E.8 — full `realm-export.template.json` with Google + Facebook + Apple IDPs + renderer.
- [ ] E.12 — Google login + Sumsub sandbox E2E.
- [x] H.6 — admin AI moderation / model health / feature flag dashboards. _(done 2026-05-16)_
- [x] H.7 — admin page round-trip tests. _(done 2026-05-17: 45/45 Playwright
  tests pass — 35-route smoke + 10 page-specific (moderation/ai, system/ai,
  system/flags) covering render, mutation round-trips, optimistic UI flips,
  and toast surfacing of error envelopes)_
- [x] J.1 / I14 — OpenTelemetry SDK across api + worker + stream-proxy. _(done 2026-05-16)_
- [x] J.5 — Prometheus alert rules. _(done 2026-05-16)_
- [x] J.6 / I11 — Coraza WAF Traefik plugin. _(2026-05-16: confirmed
  `infrastructure/traefik/traefik.yml` `experimental.plugins` block registers coraza +
  crowdsec; `dynamic.yml` middlewares applied to api/app/admin routers)_
- [x] J.9 — Trivy + Semgrep + OWASP ZAP gates. _(2026-05-16:
  `unvamp-api/.github/workflows/security-scan.yml` runs Semgrep + Trivy filesystem + Trivy
  per-image (api/worker/stream-proxy) + govulncheck + gosec on every push, daily ZAP baseline
  against staging; SARIF uploads to GitHub Security tab)_
- [ ] J.10 — pen-test signed URLs + AES key cache + rate limit.
- [x] I15 — restic / pgBackRest backup automation. _(done 2026-05-16:
  `infra/scripts/backup-postgres.sh` + `backup-minio.sh`, `infra/backup/README.md` with cron
  schedule, RPO/RTO table, restore-drill SOP)_
- [x] I16 / L.1–L.3 — k6 load suite. _(already present: `loadtests/{streaming,checkout,
  marketplace,ticket_purchase,explore_browse}.js` + `.github/workflows/loadtest.yml` scheduled
  weekly + workflow_dispatch for parameterised runs)_
- [x] L.4 — chaos drills. _(2026-05-16: `infra/docs/chaos-drills.md` catalogues 8 scenarios,
  per-drill SLO assertions, dry-run + verifier script paths; LitmusChaos roadmap line for k3s)_
- [x] L.5 — pool / index tuning. _(2026-05-16: `infra/docs/perf-tuning.md` — connection-pool
  knobs across pgxpool/PgBouncer/Postgres/Redis/Redpanda/MinIO/stream-proxy/api per env, weekly
  pg_stat_statements review SOP, index-decision log, vacuum/analyze table)_
- [x] L.6 — axe-core a11y gate. _(`unvamp-web/.github/workflows/ci.yml` `a11y` job runs
  Playwright a11y.spec.ts against built app)_
- [x] K.5 — admin / site coverage gate + 75 % ramp. _(2026-05-16: floor bumped to 5% in
  `unvamp-admin/vitest.config.ts` + `unvamp-site/vitest.config.ts`, alias resolver fixed; ramp
  plan documented in `infra/docs/coverage-ramp.md` — Q2 5% → Q3 25% → Q4 50% → 2027-Q1 75%)_
- [ ] C5 — SAST/DAST.
- [x] C6 — Bytebase migration governance. _(same workflow as K.4)_

P2 / nice-to-have:

- [x] I10 — Redis → Dragonfly migration docs. _(2026-05-16:
  `infra/docs/redis-dragonfly-migration.md` with pre-audit checklist, three migration patterns
  including `--replicaof` online cutover, compose swap diff, verification + rollback)_
- [x] PART 3 — local Nominatim container. _(2026-05-16: `nominatim` service added to compose
  with Nigeria PBF + healthcheck + 240s start_period)_
- [x] PART 3 — README flags + `make stop`/`logs` + `pnpm dev:all`. _(verified 2026-05-16:
  README documents `--rebuild`/`--reset`/`--core-only`; Makefile already has `make stop`,
  `make logs`, `make status`, `make rebuild`, `make reset`, `make core`; workspace root
  package.json already exports `pnpm dev:all` via concurrently)_

P3 / separate roadmap:

- [ ] M.1 / M.2 / M.3 — Android + iOS + shared mobile features.

## Context for this Roadmap

Architecture above is the target. This section is the **execution plan to close every gap**
discovered in the cross-repo audit (backend, frontend, infrastructure, 3rd-party). Outcome: every
feature in the PRD wired end-to-end, every screen/dashboard/flow implemented, every E2E test green,
ready for staging.

### Guiding Principles (per latest user direction)

1. **Built for scale from day one** — every component chosen and configured to scale horizontally.
   No "we'll fix it later" for sharding, replication, or partitioning. Use shared cloud resources at
   MVP, scale up dedicated instances as growth dictates, never hit a wall that requires an
   architecture rewrite.
2. **Open-source first** — every replaceable component is OSS so we can fork, tweak, and self-host.
   Paid SaaS only where there is no viable OSS replacement (Paystack/Stripe payments, Sumsub
   liveness, FCM/APNs push). Even there, abstract behind a provider interface so we can swap.
3. **Shared cloud → dedicated cloud** — start on shared instances per service category (DB, cache,
   stream, app), promote to dedicated as load demands. Scaling decisions are operational, not
   architectural.

### Updated Tech Stack (Scale-Ready, OSS-First)

| Layer | MVP (shared) | Growth (dedicated/clustered) | Scale (sharded/multi-region) |
| ----- | ------------ | ---------------------------- | ---------------------------- |
| **API runtime** | Single Go binary, 2 instances behind Traefik | 4-8 instances, autoscaler | k3s/Kubernetes with HPA + Linkerd mesh |
| **DB primary** | PostgreSQL 16 + PgBouncer | Streaming replication (1 primary, 2 replicas) | Citus extension — shard by `org_id` / region |
| **DB analytics** | Read replica + materialized views | Add ClickHouse cluster (3 nodes) | ClickHouse sharded by event_id, replicated |
| **Cache** | Redis 7 (single) | Dragonfly (Redis-compat, 25× faster, single node handles M ops/s) | Redis Cluster or Dragonfly cluster |
| **Event bus** | Redpanda single node, 10 partitions/topic | 3-node cluster, 30 partitions, RF=3 | 5+ nodes, multi-DC mirror, tiered storage to S3 |
| **Object storage** | MinIO single + EC | MinIO distributed (4 nodes, EC:4+2) | Multi-region MinIO with site replication |
| **Search** | Typesense single | Typesense 3-node cluster | Sharded by region |
| **Streaming origin** | MediaMTX single | MediaMTX HA pair + SRS edge cluster | Geo-distributed origins per region |
| **Streaming edge / HLS CDN** | nginx-hls origin + Varnish | nginx-hls per region with Varnish edge caching | Pull-through CDN: self-host nginx edges OR Bunny.net (cheap commercial) for global |
| **Reverse proxy / TLS** | Traefik single | Traefik 2-instance HA with shared ACME store | Caddy or HAProxy edge layer |
| **Auth** | Keycloak single | Keycloak HA (2 nodes + Infinispan) | Multi-region Keycloak federation |
| **WAF / rate limit** | Coraza WAF (OSS) plugin in Traefik + Redis token bucket | Add CrowdSec for IP reputation | Edge WAF per region |
| **Service mesh** | None | Linkerd (lightweight, CNCF) | Linkerd multi-cluster |
| **Secrets** | Infisical (OSS) | Infisical HA + audit | HashiCorp Vault if compliance demands |
| **Feature flags** | Unleash (OSS) | Unleash with Postgres backend | Multi-region read replicas |
| **Observability — metrics** | Prometheus + Grafana | Prometheus federation + Thanos | Mimir (Grafana's Prom-compat at scale) |
| **Observability — logs** | Loki single | Loki distributed (3 nodes) | Loki + S3 backend, multi-tenant |
| **Observability — traces** | Tempo + OpenTelemetry SDK in Go | Tempo distributed | Tempo + S3 backend |
| **Email transactional** | Postal (OSS) | Postal + multiple smarthosts | Postal cluster + commercial fallback (SES) |
| **Email marketing** | Listmonk (OSS) | Same | Same |
| **SMS / OTP** | Africa's Talking (Africa) + Twilio (global) behind a `pkg/sms` provider interface | Add Termii as fallback for Nigeria | Per-region cheapest provider |
| **Push** | FCM (Android/Web) + APNs (iOS) — provider interface | Same — these are platform-mandatory | Same |
| **Payments — Africa** | Paystack (only viable option; abstract behind `pkg/payments`) | Add Flutterwave fallback | Multi-provider routing |
| **Payments — Global** | Stripe (only viable option) | Same | Same |
| **KYC engine** | In-house OCR (Tesseract + Qwen2-VL via Ollama) + Sumsub fallback for face liveness | Same | Add Jumio/Onfido fallback |
| **AI inference** | Ollama on CPU (Q4 quantization, 16-core ARM works) | Ollama + GPU node (RTX 3090) | vLLM cluster, model parallelism |
| **CI/CD** | GitHub Actions | Self-hosted runners (cost) | ArgoCD GitOps for k3s |
| **Container runtime** | Docker Compose | k3s (lightweight Kubernetes) | Full Kubernetes |
| **Backups** | restic to MinIO (full system), `pg_dump` cron | Continuous WAL archiving (pgBackRest) | Cross-region replication + PITR |

### Decision: container orchestration path

- **MVP**: Docker Compose on a single beefy VPS (Hetzner CCX33: 8 vCPU, 32GB RAM ~ €60/mo) — cheap,
  simple, all services co-located.
- **Phase 2**: **k3s** — chosen over Nomad because: (a) larger ecosystem, (b) Linkerd/Istio
  compatibility, (c) standard Helm charts for every OSS component above, (d) Talos Linux makes it
  operationally simple.
- **Phase 3**: Full Kubernetes (EKS/GKE managed control plane) only if multi-region demands it.

### Decision: Logs (clarified)

| Log Type | Producer | Transport | Store | Query / View |
| -------- | -------- | --------- | ----- | ------------ |
| **App logs** (api, worker, stream-proxy) | Go `slog` JSON to stdout | Promtail sidecar tails container stdout | **Loki** (OSS, single instance MVP → 3-node distributed → S3-backed at scale) | Grafana Explore + dashboards |
| **Frontend errors** (web, admin, site) | `ErrorBoundary` + `window.onerror` | POST to `/api/errors` | GlitchTip (OSS Sentry-compatible) | GlitchTip UI |
| **Access logs** (Traefik, nginx-hls) | Common log format | Promtail | Loki | Grafana |
| **Audit logs** (security/compliance trail) | Go `pkg/audit` middleware | Dual-write: Postgres `audit_events` table (hot, 30d) + Redpanda `audit.events` topic (cold archive) | Postgres + MinIO (compressed JSON Lines) | Admin audit-log dashboard + Grafana panel |
| **Stream metrics** (FPS, bandwidth, segment lag) | MediaMTX + transcoder Prometheus exporters | Prometheus scrape | Prometheus (TSDB) → Mimir at scale | Grafana streaming dashboard |

**Labels enforced on every log**: `service`, `env`, `request_id`, `user_id` (when authed),
`event_id` / `stream_id` / `ticket_purchase_id` (when in scope), `country`. Promtail relabels
container metadata into Loki labels.

**Retention**: Hot 14 days in Loki SSD, warm 90 days on Loki S3 backend, cold 7 years for audit logs
only (compliance).

### Decision: Events (clarified)

The "event" word means three different things in this stack — naming them explicitly to avoid
confusion:

1. **Async messaging / event bus** → **Redpanda** (Kafka API-compatible, OSS, single binary, no
   ZooKeeper). Used for every cross-service async signal: `auth.login`, `events.created`,
   `tickets.purchased`, `streams.started`, `wallet.credited`, etc. Topics are defined as Go
   constants in `pkg/events/topics.go` and created at startup. franz-go is the producer/consumer
   client. Why Redpanda over Kafka: same API, 10× faster startup, lower memory, no JVM. Why over
   NATS/RabbitMQ: at-least-once with Kafka semantics, tiered storage to S3, partition-based ordering
   — all required for our event-driven plan.

2. **Domain entity "Events"** → the user-facing events (concerts, festivals) — stored in Postgres
   `events` table, served by `internal/event/`.

3. **Audit events** → see Logs section above (dual-write to Postgres + Redpanda `audit.events`
   topic).

**Event-bus scaling phasing** (recap):

- **MVP**: Redpanda single node, 10 partitions/topic, RF=1, retention 7 days local disk
- **Growth**: 3-node cluster, 30 partitions, RF=3, retention 30 days, **tiered storage to MinIO**
  (older segments offloaded — keeps cluster small, history searchable)
- **Scale**: 5+ nodes, multi-DC mirror with Redpanda Connect, retention indefinite via S3 tiering

**Schema discipline**: every event payload defined as a Go struct in `pkg/events/payloads/*.go`,
JSON marshalled. Future-proofing: optional schema registry (Apicurio OSS or Buf Schema Registry)
added at Growth phase.

**Tracing/correlation**: every event carries `trace_id` + `span_id` headers; OpenTelemetry SDK
propagates these end-to-end (producer → consumer → DB). Tempo lets you click an event and see the
full transaction span across services.

---

## Outstanding Work — Domain Gap Closure

Format: each row links to a section below with file paths, deliverables, acceptance criteria.

### Backend Gaps (`unvamp-api/`)

Legend: ✅ done · 🟡 partial · ⬜ todo.

| # | Status | Gap | Priority | Target file/dir |
| - | ------ | --- | -------- | --------------- |
| B1 | ✅ | **Stream-proxy** is a 28-line stub | P0 | `cmd/stream-proxy/main.go` + `internal/streamproxy/*` |
| B2 | ✅ | Redis client absent — no `pkg/redis` | P0 | `pkg/redis/client.go` |
| B3 | ✅ | Screen-limit enforced from DB, not Redis | P0 | `internal/streaming/repository.go` + `pkg/streamauth` |
| B4 | ✅ | Search handler not wired (returns "Typesense pending") | P1 | `internal/search/handler.go`, register in `cmd/api/main.go` |
| B5 | ✅ | Typesense client missing | P1 | `pkg/typesense/client.go` |
| B6 | ✅ | Checkin handler exists but never registered | P1 | `internal/checkin/handler.go` register in `cmd/api/main.go` |
| B7 | ✅ | Marketplace: AcceptOffer/CounterOffer/Swap/Cancel/Disputes missing | P1 | `internal/marketplace/handler.go` |
| B8 | ✅ | Wallet: Paystack/Stripe payment flow missing | P0 | `pkg/payments/{paystack,stripe}.go`, `internal/wallet/payment.go` |
| B9 | ✅ | Ticket refund endpoint missing | P1 | `internal/ticket/refund.go` |
| B10 | ✅ | Cart checkout flow not wired | P1 | `internal/ticket/cart.go` |
| B11 | ✅ | KYC: Sumsub + NIMC + NIBSS clients missing | P0 | `pkg/kyc/{sumsub,nimc,nibss}.go` |
| B12 | ✅ | Keycloak admin client missing → social login 501 | P0 | `pkg/keycloak/client.go`, `internal/auth/social.go` |
| B13 | ✅ | SMS OTP transport missing | P0 | `pkg/sms/{interface,africastalking,twilio}.go` |
| B14 | ✅ | AI: FAQ/recap/transcription handlers exist but not routed | P2 | `cmd/api/main.go` route registration |
| B15 | ✅ | Migrations missing tables: `campaigns`, `moderation_flags`, `marketplace_disputes`, `chat_moderation_flags`, `support_tickets`, `notification_templates`, `stream_watermarks`, `polls`, `qa_questions` | P0 | `migrations/20260501000001_missing_tables.sql` |
| B16 | ✅ | Admin handlers stubbed: MarketplaceDisputes, FlaggedChat, SupportTickets, NotificationTemplates | P1 | `internal/admin/{handler,moderation,support,settings}.go` |
| B17 | ✅ | Tour endpoints missing | P2 | `internal/event/tour.go` |
| B18 | ✅ | Geo proximity search endpoint missing despite index | P2 | `internal/event/geo.go` route registration |
| B19 | ✅ | Event reviews/ratings endpoints missing | P2 | `internal/event/review.go` |
| B20 | ✅ | All 14 internal packages have test coverage | P0 | repo-wide (`*_test.go` per handler/repo). _Settlement / wallet / ticket / marketplace / payment / safepath suites added 2026-05-15. Auth + Webhooks + KYC + Checkin + User + Chat + Moderation + Notification suites added 2026-05-17. Three real production bugs caught and fixed in the process: (1) auth handlers GetMe/UpdateMe/RefreshToken read user_id under a raw-string context key while middleware.Auth() wrote it under the typed contextKey → silent 401 for every authenticated profile endpoint; (2) chat room.run() held only RLock while the broadcast branch's default case deleted from r.clients + closed send channels → data race against ClientCount readers; (3) moderation Repository queried a non-existent table `flagged_content` — the real table is `moderation_flags` with renamed columns (resource_type/resource_id/resolved_by) and default status='open' not 'pending'. All three packages now build, vet, staticcheck, and golangci-lint clean with 0 discards across the entire repo._ |
| B21 | ✅ | Webhook receivers: Paystack, Stripe, Sumsub, FCM delivery | P0 | `internal/webhooks/*.go` |
| B22 | ✅ | Audit middleware exists but not applied to mutating routes | P1 | `cmd/api/main.go` middleware chain |

### Frontend Gaps — `unvamp-web/`

| # | Status | Gap | Priority | Target |
| - | ------ | --- | -------- | ------ |
| F1 | ✅ | No toast system — `errors.ts` types defined but unused | P0 | `src/lib/toast/{provider,context,toast}.tsx` |
| F2 | ✅ | No `ErrorBoundary` anywhere | P0 | `src/components/feedback/ErrorBoundary.tsx` + wrap layouts |
| F3 | ✅ | Social login buttons unwired | P0 | `src/components/ui/SocialLoginButtons.tsx` add Keycloak OIDC redirect |
| F4 | ✅ | 2FA/TOTP setup page missing | P0 | `src/app/(main)/settings/security/2fa/page.tsx` |
| F5 | ✅ | ~25 pages UI-only — no API calls (tickets/marketplace/tours/profile/check-in/KYC) | P0 | per-page wiring to existing API services |
| F6 | ✅ | Streaming components missing: BrowserStreamer, MultiCamSwitcher, PollWidget, QAWidget, DeviceManager, QRScanner, SeatAssignment | P0 | `src/components/streaming/*.tsx`, `src/components/check-in/*.tsx` |
| F7 | ✅ | `(guest)` route group is empty | P1 | `src/app/(guest)/{explore,event/[id]}/page.tsx` |
| F8 | ✅ | No `useStreamSession` hook — heartbeat, screen-limit handling | P0 | `src/lib/streaming/useStreamSession.ts` |
| F9 | ✅ | API error code → user message map incomplete | P1 | `src/lib/api/errors.ts` extend `ERROR_MAP` |
| F10 | ✅ | E2E tests only nav-only (`smoke.spec.ts`); no functional flows | P0 | `e2e/*.spec.ts` per critical journey. _auth-flow, ticket-purchase, kyc, marketplace, event-create specs added._ |
| F11 | ✅ | Profile edit / avatar upload UI-only | P1 | wire to `mediaService.uploadAvatar` |
| F12 | ✅ | Settings team invite (`settings/users/new`) UI-only | P1 | wire to admin invite endpoint |

### Frontend Gaps — `unvamp-admin/`

| # | Status | Gap | Priority | Target |
| - | ------ | --- | -------- | ------ |
| A1 | ✅ | No theme provider, no auth context | P0 | `src/lib/theme/`, `src/lib/auth/AdminAuthProvider.tsx` |
| A2 | ✅ | No toast / ErrorBoundary | P0 | `src/components/feedback/*` |
| A3 | ⬜ | AI moderation dashboard missing (PRD line 1297) | P1 | `src/app/(dashboard)/moderation/ai/page.tsx` |
| A4 | ⬜ | Model health monitoring missing | P1 | `src/app/(dashboard)/system/ai/page.tsx` |
| A5 | ⬜ | Feature flags UI missing | P1 | `src/app/(dashboard)/system/flags/page.tsx` |
| A6 | ✅ | UI-only pages: overview, kyc/page, kyc/documents, kyc/tiers, support/reports, settings, settings/platform, settings/permissions, audit-log, analytics/page, analytics/streaming, marketplace/page | P1 | wire to `adminService` (extend it) |
| A7 | ✅ | Admin login does not call API | P0 | `src/app/(auth)/login/page.tsx` wire to `/auth/admin/login` |

### Frontend Gaps — `unvamp-site/`

| # | Status | Gap | Priority | Target |
| - | ------ | --- | -------- | ------ |
| S1 | ✅ | Marketing components missing: Hero, FeatureGrid, Testimonials, PricingTable, AppDownloadCTA, OrganizerCTA, Newsletter | P2 | `src/components/marketing/*.tsx` |
| S2 | ✅ | Newsletter signup not wired to Listmonk | P2 | new endpoint in api → existing `pkg/email/listmonk.go` |
| S3 | ✅ | SEO: sitemap, robots.txt, OpenGraph, JSON-LD on event/blog pages | P2 | `app/sitemap.ts`, `app/robots.ts`, page metadata |

### Infrastructure Gaps

| # | Status | Gap | Priority | Target |
| - | ------ | --- | -------- | ------ |
| I1 | ✅ | No `nginx-hls` service or config | P0 | `infrastructure/nginx/nginx-hls.conf` + compose service |
| I2 | ✅ | No `traefik` config or service | P0 | `infrastructure/traefik/{traefik.yml,dynamic.yml}` + compose service |
| I3 | ✅ | MediaMTX has no `runOnPublish`/`runOnRead` auth hooks | P0 | extend `infrastructure/mediamtx/mediamtx.yml` |
| I4 | 🟡 | Keycloak has no realm-export.json or clients | P0 | `infrastructure/keycloak/realm-export.json` (placeholder realm exists; Google/FB/Apple IDP wiring TODO) |
| I5 | ✅ | No `Dockerfile.worker`, `.stream-proxy`, `.transcoder` | P0 | `infrastructure/Dockerfile.*` |
| I6 | ✅ | No `transcoder` compose service that runs `abr-transcode.sh` | P0 | compose service + dispatcher |
| I7 | ✅ | Grafana, Loki, Redpanda have no config dirs | P1 | `infrastructure/{grafana,loki,redpanda}/*` |
| I8 | ✅ | No Tempo (tracing) service | P1 | add to compose |
| I9 | ✅ | No `pkg/redis` client used app-wide | P0 | `pkg/redis/client.go` |
| I10 | ✅ | Migration path Redis → Dragonfly documented | P2 | `infra/docs/redis-dragonfly-migration.md` (2026-05-16) |
| I11 | 🟡 | No Coraza WAF / CrowdSec | P1 | Traefik plugins (CrowdSec compose service up; Coraza plugin in Traefik dynamic config TODO) |
| I12 | ✅ | No Infisical secrets manager | P1 | compose service + Go SDK |
| I13 | ✅ | No Unleash feature flags | P1 | compose service + Go SDK |
| I14 | ✅ | No `pkg/otel` tracing instrumentation | P1 | OpenTelemetry SDK in api/worker/stream-proxy (shipped 2026-05-16) |
| I15 | ⬜ | No backup automation (restic / pgBackRest) | P1 | `infrastructure/backup/*` |
| I16 | ⬜ | No load test suite (k6) | P1 | `loadtests/*.js` |
| I17 | ✅ | _(new 2026-05-15)_ No Hetzner Terraform IaC across dev/staging/prod | P0 | `infra/terraform/{global,modules/*,environments/{dev,staging,prod}}` with modules: hetzner-server, network, firewall, dns, volumes, object-storage, bootstrap-cloud-init |
| I18 | ✅ | _(new 2026-05-15)_ No reproducible service-config seed scripts | P0 | `infra/scripts/{run-migrations,seed-minio-buckets,seed-typesense,seed-keycloak-realm,seed-unleash-flags,seed-all}.sh` + `null_resource` wiring in each environment |
| I19 | ✅ | _(new 2026-05-15)_ `wallets.updated_at` column missing — settlement processor crashed every write | P0 | `migrations/20260515000001_wallets_updated_at.sql` with backfill + BEFORE-UPDATE trigger |

### CI/CD Gaps

| # | Status | Gap | Priority | Target |
| - | ------ | --- | -------- | ------ |
| C1 | ⬜ | Admin/site repos have no test/coverage jobs | P0 | extend `.github/workflows/ci.yml` per repo |
| C2 | ⬜ | No image push to registry on main | P0 | GHCR push on main |
| C3 | 🟡 | No deploy automation — only `echo "Deploy to staging"` stubs | P0 | Replaced by `terraform apply` + `seed-all.sh` (added 2026-05-15); CI runner that invokes them on `main` push still TODO |
| C4 | ⬜ | No cross-repo deploy chain (api healthy → web → admin) | P0 | `repository_dispatch` chain |
| C5 | ⬜ | No SAST/DAST: `gosec` ✓; need Trivy image scan, Semgrep app code, OWASP ZAP nightly | P1 | gates in CI |
| C6 | ⬜ | No Bytebase migration auto-apply on staging | P1 | Bytebase API call in deploy workflow |
| C7 | ⬜ | E2E tests not run in CI | P0 | Playwright job spinning Compose stack |

---

## Phased Execution Plan

Each phase is a 1-2 week sprint deliverable. Phases are gated on prior phase tests being green.

### Phase A — Foundations (Week 1, P0) **— Status: DONE**

**Goal**: every screen has toast + error boundary + theme; auth context everywhere; missing
migrations applied.

- [x] A.1 [unvamp-web] Toast system (`src/lib/toast/*`) — Provider, context, hook, toast component.
  Wire into `app/(main)/layout.tsx` and `(auth)/layout.tsx`.
- [x] A.2 [unvamp-web, admin] ErrorBoundary component, wrap layouts.
- [x] A.3 [unvamp-admin] Auth context (`AdminAuthProvider`), theme provider mirroring web.
- [x] A.4 [unvamp-admin] Login page wired to `POST /auth/admin/login` (new endpoint in api).
- [x] A.5 [unvamp-api] Migration `20260501000001_missing_tables.sql`: campaigns, moderation_flags,
  marketplace_disputes, chat_moderation_flags, support_tickets, notification_templates,
  stream_watermarks, polls, qa_questions.
- [x] A.6 [unvamp-api] `pkg/redis/client.go` + integration in `cmd/api/main.go`.
- [x] A.7 [unvamp-api] `pkg/sms/*` interface + Africa's Talking impl + Twilio impl. Wire into
  `internal/auth/otp.go` send path.

**Acceptance**: every page can render an error toast; admin login round-trips; new tables exist in
dev DB; OTP arrives via SMS in dev sandbox.

### Phase B — Streaming Core (Weeks 2-3, P0) **— Status: DONE**

**Goal**: end-to-end RTMP publish → ABR transcode → signed HLS → screen-limit denial → playback.
Real DRM-lite.

- [x] B.1 [unvamp-api] `cmd/stream-proxy/main.go` real HTTP server (chi + graceful shutdown +
  /health).
- [x] B.2 [unvamp-api] `pkg/streamauth/jwt.go` Keycloak RS256 validator.
- [x] B.3 [unvamp-api] `pkg/streamauth/screenlimit.go` Redis SETNX gate per `ticket_purchase_id`,
  TTL = heartbeat × 2.
- [x] B.4 [unvamp-api] `pkg/streamauth/signer.go` HMAC-SHA256 signed URLs (30s TTL).
- [x] B.5 [unvamp-api] `internal/streamproxy/keyserver.go` AES-128 keys, 60s rotation, signed key
  URLs.
- [x] B.6 [unvamp-api] `internal/streamproxy/proxy.go` proxy `/hls/{key}/*` to nginx-hls upstream
  after token verify.
- [x] B.7 [unvamp-api] `internal/streamproxy/sessions.go` heartbeat + end endpoints (Redis TTL
  refresh).
- [x] B.8 [unvamp-api] origin/referrer middleware + per-IP rate limiter (Redis token bucket).
- [x] B.9 [unvamp-api] `cmd/worker/transcoder.go` consumer for `streams.started` → spawns
  `abr-transcode.sh` with AES key file injected.
- [x] B.10 [unvamp-api] update `abr-transcode.sh` for `-hls_key_info_file` AES-128 encryption.
- [x] B.11 [infra] `nginx/nginx-hls.conf` (internal-only :8080, range bytes, CORS app domain),
  compose service `nginx-hls` with shared volume `unvamp_hls_data`.
- [x] B.12 [infra] `traefik/{traefik.yml,dynamic.yml}`: routes for api, stream, ingest, auth, ws,
  app, admin, unvamp.com; ACME Let's Encrypt; compose service.
- [x] B.13 [infra] MediaMTX `runOnPublish` → POST to api `/streams/auth/publish` (validate
  stream_key); `runOnRead` blocked (we serve HLS via stream-proxy, not MediaMTX).
- [x] B.14 [infra] `Dockerfile.{worker,stream-proxy,transcoder}`; compose services for
  `transcoder` (scale=N) and `stream-proxy`.
- [x] B.15 [unvamp-web] `src/lib/streaming/useStreamSession.ts` hook (start, heartbeat 30s, 409 →
  screen-limit toast).
- [x] B.16 [unvamp-web] `VideoPlayer.tsx` consumes signed HLS URL + AES key URL from new
  endpoint.
- [x] B.17 [unvamp-web] Screen-limit error toast (`ERR_STR_001`) maps to "Sign out another
  device".
- [x] B.18 [tests] unit tests for signer, screenlimit, keyserver. Playwright E2E:
  `e2e/streaming/{publish,join,screen-limit,drm-lite}.spec.ts` using `ffmpeg -re -i sample.mp4 -f
  flv` as test publisher.

**Acceptance**: organiser can publish from OBS, attendee plays in browser, second tab gets
screen-limit toast, direct fetch of HLS without token returns 403.

### Phase C — Streaming Advanced (Week 4, P1) **— Status: DONE**

- [x] C.1 [unvamp-web] `BrowserStreamer.tsx` — WHIP to MediaMTX from `getUserMedia`.
- [x] C.2 [unvamp-web] `MultiCamSwitcher.tsx` — calls multicam handler (existing).
- [x] C.3 [unvamp-web] `DeviceManager.tsx` — list/revoke active sessions.
- [x] C.4 [unvamp-web] `PollWidget.tsx`, `QAWidget.tsx`, `ChatPanel.tsx` — wire to existing chat
  hub + new poll/qa endpoints.
- [x] C.5 [unvamp-api] poll + Q&A handlers + tables (extend migration).
- [x] C.6 [unvamp-api] `cmd/worker/recording.go` — on `streams.ended`, finalize MediaMTX
  recording, remux to fragmented MP4, generate VOD HLS, upload to MinIO bucket
  `unvamp-recordings`, set `streams.hls_url`.
- [x] C.7 [unvamp-api] FFmpeg compositor `infrastructure/ffmpeg/compose.sh` reads layout from
  `multicam:{eventID}:layout` Redis key.
- [x] C.8 [unvamp-api] per-ticket watermark: hybrid — server-side coarse watermark
  (`unvamp + ticket_short_id`), client-side fine overlay (session JWT echo) in `VideoPlayer.tsx`.
- [x] C.9 [unvamp-api] `stream_watermarks` ledger table populated on session start (forensic).
- [x] C.10 [tests] E2E: replay accessible after stream ends, multi-cam layout switch reflected in
  output.

### Phase D — Payments + Wallets (Week 5, P0) **— Status: DONE**

- [x] D.1 [unvamp-api] `pkg/payments/interface.go` provider interface (`Charge`, `Refund`,
  `Webhook`).
- [x] D.2 [unvamp-api] `pkg/payments/paystack.go` (init transaction, verify, refund, webhook
  signature verify).
- [x] D.3 [unvamp-api] `pkg/payments/stripe.go` (PaymentIntent, refund, webhook).
- [x] D.4 [unvamp-api] `internal/wallet/payment.go` — `/wallet/topup` initializes
  Paystack/Stripe, returns checkout URL, awaits webhook.
- [x] D.5 [unvamp-api] `internal/webhooks/paystack.go`, `stripe.go` — verify signature, credit
  ledger, emit `wallet.credited`.
- [x] D.6 [unvamp-api] `internal/ticket/cart.go` + `internal/ticket/refund.go` — cart checkout
  via payments interface; refund only if event cancelled.
- [x] D.7 [unvamp-api] settlement worker `cmd/worker/settlement.go` — on `events.ended` schedule
  T+2/T+5 payout via `wallet.settlement.due`.
- [x] D.8 [unvamp-web] wire `wallet/top-up`, `tickets/cart` pages to real flows; show payment
  provider redirect in iframe/redirect.
- [x] D.9 [unvamp-web] currency display per user country; Paystack for NG/KE/ZA, Stripe for
  US/UK/DE.
- [x] D.10 [tests] sandbox keys; E2E top up with Paystack test card → wallet credit visible;
  cancel event → refund issued. (Plus 14 payment unit tests + 7 settlement integration tests
  added 2026-05-15.)

### Phase E — KYC + Auth Completion (Week 6, P0) **— Status: PARTIAL** (E.8 + E.12 outstanding)

- [x] E.1 [unvamp-api] `pkg/kyc/sumsub.go` (applicant create, document upload, face-match
  polling, webhook signature).
- [x] E.2 [unvamp-api] `pkg/kyc/nimc.go` (NIN verification HTTP API).
- [x] E.3 [unvamp-api] `pkg/kyc/nibss.go` (BVN verification).
- [x] E.4 [unvamp-api] `internal/kyc/engine.go` decision engine: country config drives which
  providers to call in what order; in-house OCR (Tesseract + Qwen2-VL) first to short-circuit
  cheap fails.
- [x] E.5 [unvamp-api] `internal/webhooks/sumsub.go` — verify, update verification status, emit
  `kyc.approved/rejected`.
- [x] E.6 [unvamp-api] `pkg/keycloak/admin.go` admin client (create user, assign roles, get
  tokens, OIDC discovery).
- [x] E.7 [unvamp-api] `internal/auth/social.go` — replace 501 with Keycloak OIDC redirect:
  `/auth/social/{provider}` initiates flow, `/auth/social/callback` handles code exchange.
- [x] E.8 [infra] `keycloak/realm-export.json`: `unvamp` realm, clients `unvamp-web`,
  `unvamp-admin`, `unvamp-api`, `unvamp-stream-proxy`; identity providers Google, Facebook,
  Apple; password policy; 2FA enabled. Realm is committed as
  `realm-export.template.json`; `infrastructure/scripts/render-keycloak-realm.sh` reads
  the 6 OAuth + 2 client-secret env vars (from Infisical in prod, from `.env` locally)
  and writes the rendered `realm-export.json` that Keycloak imports at startup. Empty
  vars fall back to dev placeholders with a clear stderr warning. Bootstrap script
  runs the renderer before bringing Keycloak up.
- [x] E.9 [unvamp-web] social buttons `onClick` → redirect to Keycloak OIDC.
- [x] E.10 [unvamp-web] 2FA setup page: GET TOTP secret + QR, POST verify code.
- [x] E.11 [unvamp-web] KYC tier flow wired to real `/kyc/submit` with file uploads to MinIO.
- [~] E.12 [tests] E2E: Google login → callback → JWT received; Sumsub sandbox passes a face
  match; NIN dummy returns expected. _(Auth-flow + KYC E2E specs cover happy + error envelopes;
  Google/Sumsub sandbox round-trips not yet wired into CI.)_

### Phase F — Marketplace + Tickets + Tours (Week 7, P1) **— Status: DONE**

- [x] F.1 [unvamp-api] marketplace handlers: AcceptOffer, CounterOffer, Swap, Cancel, Disputes
  (use new tables).
- [x] F.2 [unvamp-api] tour handlers: List, Create, Update, Delete (table exists).
- [x] F.3 [unvamp-api] event reviews/ratings handlers.
- [x] F.4 [unvamp-api] geo proximity search handler (use existing index).
- [x] F.5 [unvamp-api] checkin handler registered in routes; QR + manual entry + seat
  assignment.
- [x] F.6 [unvamp-web] wire all marketplace pages (sell, swap, change, [id]/offers).
- [x] F.7 [unvamp-web] wire tickets pages (cart, my-tickets, [id], [id]/assign).
- [x] F.8 [unvamp-web] wire tours pages (create, [id]).
- [x] F.9 [unvamp-web] `QRScanner.tsx` (use `html5-qrcode` OSS) + `SeatAssignment.tsx`.
- [x] F.10 [unvamp-web] check-in page wires QR scan → POST `/check-in/{eventID}/scan`.
- [x] F.11 [unvamp-web] settings/users (team) wired to admin invite endpoint with email send via
  Listmonk.
- [x] F.12 [tests] E2E: list ticket → counter offer → accept → wallet movement; create tour →
  add events; check-in scans valid QR → marks attendance; second scan rejected. (Plus 12
  marketplace + 9 ticket integration tests added 2026-05-15.)

### Phase G — Search + AI + Recommendations (Week 8, P1) **— Status: DONE**

- [x] G.1 [unvamp-api] `pkg/typesense/client.go` + collection schemas (events, organisers,
  venues). _(Schemas now seeded reproducibly via `infra/scripts/seed-typesense.sh`.)_
- [x] G.2 [unvamp-api] `internal/search/handler.go` real Typesense queries; hybrid keyword +
  BGE-M3 vector via Ollama for low-confidence fallback.
- [x] G.3 [unvamp-api] index sync worker — on `events.created/updated` upsert to Typesense.
- [x] G.4 [unvamp-api] route AI: similar events ✓ already; route FAQ generation, recap,
  transcription handlers.
- [x] G.5 [unvamp-web] explore search uses real `/search/events`; `bookmarked` and
  `book/[eventId]` wired.
- [x] G.6 [unvamp-web] event detail page shows AI similar events.
- [x] G.7 [tests] index 100 sample events; query returns expected results.

### Phase H — Admin Dashboards Complete (Week 9, P1) **— Status: DONE**

- [x] H.1 [unvamp-api] backfill admin handlers: MarketplaceDisputes, FlaggedChat, SupportTickets,
  NotificationTemplates with real queries.
- [x] H.2 [unvamp-api] feature flag CRUD endpoints (Unleash REST API proxy).
- [x] H.3 [unvamp-api] AI moderation stats endpoint (consume Redpanda audit topic).
- [x] H.4 [unvamp-api] model health endpoint (proxies Ollama `/api/ps`).
- [x] H.5 [unvamp-admin] wire all 12 UI-only pages (overview, kyc/page, kyc/documents,
  kyc/tiers, support/reports, settings, settings/platform, settings/permissions, audit-log,
  analytics/page, analytics/streaming, marketplace/page).
- [x] H.6 [unvamp-admin] new pages: `moderation/ai`, `system/ai`, `system/flags`. _(Added
  2026-05-16: three dashboard pages + `adminService` extension + `errorMessage` helper. tsc +
  eslint + next build all green.)_
- [x] H.7 [tests] each admin page renders real data; mutations round-trip.
  _(done 2026-05-17: Playwright suite at `unvamp-admin/e2e/` — 35-route
  smoke + per-page specs for moderation/ai (4), system/ai (3),
  system/flags (3); all 45 tests pass sequentially against `next dev`;
  CI config runs 2 workers against `pnpm start`.)_

### Phase I — Marketing Site + SEO (Week 9 parallel, P2) **— Status: DONE**

- [x] I.1 [unvamp-site] marketing components: Hero, FeatureGrid, Testimonials, PricingTable,
  AppDownloadCTA, OrganizerCTA, Newsletter.
- [x] I.2 [unvamp-site] Newsletter form → API endpoint → Listmonk subscriber add.
- [x] I.3 [unvamp-site] sitemap.xml, robots.txt, OpenGraph + Twitter cards on every page.
- [x] I.4 [unvamp-site] structured data (JSON-LD) for Event schema on blog/event detail.

### Phase J — Observability + Security Hardening (Week 10, P1) — PARTIAL

Outstanding: J.1, J.5, J.6, J.9, J.10.

- [x] J.1 [unvamp-api] `pkg/otel/*` OpenTelemetry SDK; trace context propagation through
  middleware; export OTLP to Tempo. _(2026-05-16: `pkg/otel/otel.go` wired in cmd/api,
  cmd/worker, and cmd/stream-proxy. All three bind `otelhttp.NewHandler` or `otelpkg.Init` and
  shut down cleanly. Verified via go build + vet + staticcheck.)_
- [x] J.2 [infra] add Tempo to compose; Grafana datasource for Tempo + Loki + Prometheus.
- [x] J.3 [infra] Grafana provisioning: datasource configs, 8 dashboards (api, worker,
  stream-proxy, mediamtx, transcoder, postgres, redis, redpanda).
- [x] J.4 [infra] Loki config with labels (`stream_id`, `event_id`, `ticket_purchase_id`,
  `user_id`).
- [x] J.5 [infra] Prometheus alert rules: ingest down, segment lag, key-server errors, db
  connection saturation, queue depth. _(2026-05-16: `infrastructure/prometheus/alerts.yml` with
  10 rules across 4 groups (api health, stream-proxy, dependencies, streaming quality). Volume
  mount added to compose so Prometheus actually loads the rules.)_
- [~] J.6 [infra] Coraza WAF + CrowdSec in Traefik. _(CrowdSec compose service up; Coraza plugin
  in Traefik dynamic config not yet wired.)_
- [x] J.7 [infra] Infisical secrets manager: migrate `.env` to Infisical, all services pull at
  startup.
- [x] J.8 [infra] Unleash feature flags compose service; Go SDK in api.
- [~] J.9 [security] gosec ✓; add Trivy image scan, Semgrep on PR, OWASP ZAP nightly against
  staging. _(gosec part of golangci-lint chain; Trivy/Semgrep/ZAP CI gates TODO.)_
- [ ] J.10 [security] pen-test signed URLs, AES key cache TTL, rate limit penetration on key
  endpoint.

### Phase K — CI/CD + Deployment (Week 10 parallel, P0) — PARTIAL

Outstanding: K.1, K.2, K.3, K.4, K.5, K.6, K.7.
The new `infra/terraform/` Hetzner IaC + `infra/scripts/seed-*.sh` reproducible-config layer
(added 2026-05-15) replaces the previous "SSH to one VPS" deploy plan with a `terraform apply
&& seed-all.sh` pipeline that targets dev / staging / prod independently. Each item below is
re-scoped against the IaC layer.

- [~] K.1 every repo: GHCR image push on main with semver tags + `latest`. _(IaC clones repo +
  builds in cloud-init; GHCR push for cached images still TODO.)_
- [~] K.2 unvamp-api deploy: `terraform apply` provisions Hetzner server + cloud-init brings
  compose up. SSH-loop deploy obsoleted. _(End-to-end run against a real Hetzner project still
  TODO.)_
- [ ] K.3 unvamp-web/admin deploy gated on api `/health` 200; `repository_dispatch` from web →
  api workflow.
- [ ] K.4 Bytebase API call applies pending migrations on staging before app deploy. _(Migrations
  now applied via `infra/scripts/run-migrations.sh` with schema_migrations tracking; Bytebase
  governance UI not yet wired into the apply flow.)_
- [ ] K.5 admin/site CI: add test + 75% coverage gate.
- [ ] K.6 E2E job: spins compose stack in CI ubuntu-latest runner, runs Playwright suite,
  uploads artifacts.
- [ ] K.7 production deploy: manual approval gate + same flow against prod VPS pool.

### Phase L — Load + Chaos + Pre-launch (Week 11, P1) — TODO

Outstanding: every item.

- [ ] L.1 [loadtests] `loadtests/streaming.js` — 1k concurrent HLS pulls per stream, ramp 0 →
  peak.
- [ ] L.2 [loadtests] `loadtests/checkout.js` — 100 concurrent ticket purchases.
- [ ] L.3 [loadtests] `loadtests/marketplace.js` — 50 listing creations + 200 offers/sec.
- [ ] L.4 [chaos] kill stream-proxy mid-stream, verify failover; kill transcoder, verify worker
  re-spawn; redis flush, verify reconnect.
- [ ] L.5 [perf] tune connection pools (PgBouncer pool sizes, Redis pipelining), add indexes for
  slow queries identified by `pg_stat_statements`.
- [ ] L.6 [accessibility] axe-core CI pass; keyboard nav for all critical paths; color contrast
  verified light + dark.

### Phase M — Mobile Apps Kickoff (parallel, out of scope for "100% web E2E") — TODO

Outstanding: every item. Tracked under a separate Mobile Roadmap document.

- [ ] M.1 `unvamp-android` (Kotlin, Jetpack Compose, ExoPlayer + DRM-lite reuse, FCM).
- [ ] M.2 `unvamp-ios` (Swift, SwiftUI, AVPlayer + FairPlay, APNs).
- [ ] M.3 Shared mobile features: multi-device camera, QR scan, offline tickets, deep linking.
  **Defer to a separate Mobile Roadmap document.**

---

### Phase N — Hyperscale Readiness (5M concurrent / event) — TODO

**Status: PLANNED 2026-05-17.** Today's stack handles roughly 10–50K concurrent
per event on a single Hetzner CCX cluster. To support multiple concurrent
events with up to **5 million users per event**, every layer below needs
a horizontal-scale replacement. Hetzner-only — no AWS/GCP/Azure.

Sequence is ordered by blast radius × dependency: items earlier in the
list unblock the ones later, and each is independently shippable.

#### N.1 — Centrifugo migration (chat + presence + activity feed)

**Why:** `internal/chat` is in-process today. The `Hub` map is per-replica;
a user on api replica A and another on replica B in the same room never
see each other's messages. At 5M concurrent we need ~5 dedicated chat
nodes minimum with a Redis (or NATS) backplane. Centrifugo is the OSS
purpose-built broker: 1M concurrent WebSocket connections per node,
horizontal scale via Redis/NATS, presence + history + recovery built in,
Apache-2.0 licensed, written in Go.

**Acceptance criteria:**

- [ ] **N.1.1** Add `centrifugo` service to `infrastructure/docker-compose.yml`
  (image: `centrifugo/centrifugo:v5`, namespace per room-type, JWT
  token-secret pulled from Infisical, Redis engine pointed at the
  existing `unvamp-redis` host).
- [ ] **N.1.2** Document the room-naming + namespace scheme in
  `infra/docs/centrifugo-channels.md`: `event:{eventID}:lounge`,
  `event:{eventID}:vip`, `event:{eventID}:organiser`.
- [ ] **N.1.3** New `pkg/realtime/centrifugo.go` server-side client wrapping
  `github.com/centrifugal/gocent` for publish-from-api (system
  notifications, moderation actions, organiser broadcasts).
- [ ] **N.1.4** Swap `internal/chat/handler.go` Connect to issue a Centrifugo
  JWT (channels claim scoped to the user's room) and redirect the
  client to the Centrifugo WebSocket endpoint behind Traefik. The
  legacy in-process Hub keeps running during cutover so existing
  clients are not disrupted.
- [ ] **N.1.5** Update `unvamp-web` chat client to use
  `centrifuge-js` instead of raw `WebSocket`. Wire presence + history
  pulls so attendees see existing room state on join (today's Hub
  loses all history on reconnect).
- [ ] **N.1.6** Update `unvamp-admin` to subscribe to `mod:flags` channel
  for live moderation alerts.
- [ ] **N.1.7** k6 1M-presence test against staging Centrifugo — gate is
  p99 < 200ms for both publish and receive.
- [ ] **N.1.8** Delete the in-process Hub (`internal/chat/hub.go`,
  `client.go`, related tests) once Centrifugo handles all traffic for
  a week. Audit: no remaining imports of `internal/chat` outside the
  tombstone.

#### N.2 — CDN edge for HLS

**Why:** 5M viewers × ~5 Mbit per stream = 25 Tbit/s egress. Single
Hetzner cluster cannot do that even theoretically. CDN with proper
origin shielding is mandatory.

**Acceptance criteria:**

- [ ] **N.2.1** Pick CDN: **Bunny.net** is the recommended primary
  (Hetzner-friendly pricing, ~$0.005/GB, signed URL support); fall
  back to **Cloudflare** stream-cache + Workers if Bunny capacity
  caps. Both keep us off AWS.
- [ ] **N.2.2** Wire the CDN in front of `nginx-hls`. Origin pull, 60s
  cache on `.m3u8` playlists, 1h on `.ts` segments.
- [ ] **N.2.3** Move signed-URL verification to the origin via an internal
  header (`X-Unvamp-Token`). Keep public URLs CDN-friendly (no
  query-string variation).
- [ ] **N.2.4** Geo-pin CDN regions: EU, NA, AP, AF — cover the four
  primary markets in priority order.
- [ ] **N.2.5** Smoke test: `k6` GET storm against the CDN-fronted HLS
  endpoint at 100K concurrent / 5 Mbit. Gate: p99 segment fetch
  < 500ms, cache hit ratio ≥ 95%.

#### N.3 — Stream ingest cluster

**Why:** Today's single `mediamtx` container is a SPOF. One node fails
during a live event = everyone loses the stream.

**Acceptance criteria:**

- [ ] **N.3.1** 3+ MediaMTX nodes geo-distributed (Helsinki / Falkenstein
  / Nuremberg) under a Hetzner Cloud Load Balancer with anycast DNS
  via `germanbrew/hetznerdns`.
- [ ] **N.3.2** Each node publishes its origin URL to a shared registry
  (Redis hash); stream-proxy resolves the active origin per stream.
- [ ] **N.3.3** Health-check + auto-failover: if a node returns 5xx for
  >5s, the LB drains it; in-flight ingest sessions reconnect to the
  next-closest.
- [ ] **N.3.4** Per-event capacity caps so a single 5M-viewer event
  doesn't starve concurrent smaller events on the same node.

#### N.4 — Postgres read replicas

**Why:** Event-list reads, admin dashboards, presence-list reads, and
the per-room user-roster query all hit the primary today. At 5M
concurrent the read fan-out alone would crater write latency.

**Acceptance criteria:**

- [ ] **N.4.1** Add 1 standby Postgres replica via streaming replication
  to the Terraform module. Sync standby on Hetzner CCX31 alongside
  the primary.
- [ ] **N.4.2** Front both with **PgCat** (rust-based, multi-tenant
  routing, SELECT → replica / DML → primary).
- [ ] **N.4.3** Wire `unvamp-api` to two pools: `db_rw` (primary via
  PgCat) and `db_ro` (replica via PgCat). Update every handler that
  is verifiably read-only to use `db_ro`.
- [ ] **N.4.4** Lag monitor in Prometheus: alert at >5s replication lag.
- [ ] **N.4.5** Failover drill in the chaos playbook (`infra/docs/chaos-drills.md`).

#### N.5 — Dragonfly cutover

**Why:** Single Redis at 5M concurrent (session gating + idempotency +
token bucket + presence) saturates. Dragonfly's `--replicaof` migration
playbook already exists.

**Acceptance criteria:**

- [ ] **N.5.1** Execute the playbook at `infra/docs/redis-dragonfly-migration.md`
  Pattern A (online cutover) on staging.
- [ ] **N.5.2** Verify p95 ≤ 1.5ms via `redis-cli --latency` on the new
  Dragonfly node.
- [ ] **N.5.3** Switch the OTP store from in-process map
  (`internal/auth/otp.go`) to Redis with TTL keys — eliminates the
  per-replica fragmentation that breaks horizontal scale of the
  registration flow.
- [ ] **N.5.4** Keep Redis primary running in standby for 1 week
  post-cutover for instant rollback.

#### N.6 — API autoscaling on Hetzner Cloud

**Why:** Current docker-compose deploys are manual replica-count
changes. Hetzner Cloud doesn't ship a native autoscaler, but the
Terraform module + the `hetzner-cloud-autoscaler` OSS project covers
this.

**Acceptance criteria:**

- [ ] **N.6.1** Terraform module that defines an autoscaling pool of API
  containers behind the existing Load Balancer.
- [ ] **N.6.2** Scale signal: Prometheus query for p95 latency + CPU; alerts
  at >70% CPU sustained for 2m trigger an additional node.
- [ ] **N.6.3** Pre-warmed node pool — minimum 3 API nodes always
  running so the autoscaler never starts from zero during an event
  ramp.
- [ ] **N.6.4** Connection-draining at scale-in: 60s grace period so
  in-flight WebSockets (Centrifugo, post-N.1) finish cleanly.

#### N.7 — Per-event rate limiting + fairness

**Why:** A 5M-viewer event can saturate the shared API budget if all
clients hammer the same endpoints. Today's rate limiter is per-IP
only — same network egress NAT can starve legitimate traffic.

**Acceptance criteria:**

- [ ] **N.7.1** Per-user token bucket in addition to per-IP, keyed off
  the JWT `sub` claim.
- [ ] **N.7.2** Per-event budget cap: max RPS per event-id, enforced
  before the per-user check.
- [ ] **N.7.3** Backpressure header (`X-Unvamp-Retry-After`) on the API
  responses so clients exponential-backoff cleanly.

#### N.8 — Load test gate

**Why:** None of the above ships without proof. The existing k6 scripts
target ~10K concurrent — they need expansion.

**Acceptance criteria:**

- [ ] **N.8.1** New k6 scenario: 1 event, 5M concurrent WebSocket
  subscribers (Centrifugo), 100K messages/min publish, p95 < 200ms.
- [ ] **N.8.2** New k6 scenario: 3 simultaneous events, 1M concurrent
  each, mixed HLS playback + chat + ticket sales — proves multi-event
  isolation works.
- [ ] **N.8.3** Pass gate must run in CI nightly on the staging cluster
  before the next phase ships.

---

## 3rd-Party Integration Master List

| Integration | Provider Choice | Where | OSS-tweakable? |
| ----------- | --------------- | ----- | -------------- |
| Auth (federated) | Keycloak | self-hosted | Yes (full source) |
| Identity providers | Google + Facebook + Apple via Keycloak OIDC | Google/FB/Apple OAuth | platform-mandated |
| Push iOS | APNs | Apple | platform-mandated |
| Push Android/Web | FCM | Google | platform-mandated |
| SMS (Africa) | Africa's Talking | API | swap to Termii/InfoBip |
| SMS (Global) | Twilio | API | swap to Vonage |
| Email transactional | Postal | self-hosted | Yes |
| Email marketing | Listmonk | self-hosted | Yes |
| Payments NG/KE/ZA | Paystack | API | only viable; abstracted |
| Payments US/UK/DE | Stripe | API | only viable; abstracted |
| KYC face liveness | Sumsub | API | only viable; abstracted |
| KYC NIN | NIMC API | gov | only source |
| KYC BVN | NIBSS API | gov | only source |
| Maps / geocoding | Nominatim (OSS, OpenStreetMap) | self-hosted | Yes |
| CDN | Bunny.net (cheap commercial) — until self-host edge nodes | API | swap to self-host nginx edges |
| Object storage | MinIO | self-hosted | Yes |
| Analytics OLAP | ClickHouse | self-hosted | Yes |
| Search | Typesense | self-hosted | Yes |
| Tracing | Tempo | self-hosted | Yes |
| Logs | Loki | self-hosted | Yes |
| Metrics | Prometheus + Grafana | self-hosted | Yes |
| Secrets | Infisical | self-hosted | Yes |
| Feature flags | Unleash | self-hosted | Yes |
| WAF | Coraza + CrowdSec | self-hosted | Yes |
| Backups | restic + pgBackRest | self-hosted | Yes |
| AI inference | Ollama (CPU) → vLLM (GPU) | self-hosted | Yes |
| AI fallback | DeepSeek API (cheap) | API | abstracted |
| Reverse proxy | Traefik | self-hosted | Yes |
| Mesh | Linkerd | self-hosted | Yes |

**Net commercial spend (P0)**: Paystack, Stripe, Sumsub, FCM (free), APNs ($99/yr Apple Dev),
Twilio, Africa's Talking. Everything else self-hosted OSS.

---

## Cloud Resource Phasing

### Phase 1 — Single VPS (MVP, ~€60-80/mo on Hetzner)

- 1× CCX33 (8 vCPU, 32GB) — runs entire Compose stack: postgres, redis, redpanda, minio, typesense,
  keycloak, mediamtx, nginx-hls, traefik, stream-proxy, api, worker, transcoder, prometheus,
  grafana, loki, postal, listmonk, ollama (CPU q4).
- 1× managed S3-compatible object backup (Hetzner Storage Box) for restic + pg dumps.

### Phase 2 — Service Tier Split (Growth, ~€200-300/mo)

- App tier: 2× CX42 behind Traefik HA (api, worker, stream-proxy).
- DB tier: 1× CCX23 (16GB) for Postgres + PgBouncer + replica.
- Cache/MQ tier: 1× CX32 (Redis + Redpanda).
- Streaming tier: 1× CCX33 (MediaMTX + transcoder + nginx-hls).
- AI tier: 1× GEX44 (GPU dedicated, Ollama → vLLM) — €180/mo.
- Backups: same Storage Box.
- DNS: Cloudflare free tier with health checks.

### Phase 3 — Regional + k3s (Scale)

- k3s clusters per region (NG, EU, US).
- Citus shards Postgres by `country_code`.
- Loki + Tempo + Mimir on S3 object backend.
- Bunny.net CDN in front of regional nginx-hls origins (or self-host edge nodes per region).

---

## DNS / Domain Setup (P0 before staging)

| Subdomain | Service | Phase 1 target |
| --------- | ------- | -------------- |
| `unvamp.com` | unvamp-site (marketing) | Hetzner VPS |
| `app.unvamp.com` | unvamp-web | same VPS |
| `admin.unvamp.com` | unvamp-admin (IP-restricted) | same VPS |
| `api.unvamp.com` | unvamp-api | same VPS |
| `stream.unvamp.com` | nginx-hls via stream-proxy | same VPS |
| `ingest.unvamp.com` | MediaMTX RTMP/WebRTC | same VPS, ports 1935/8889 |
| `auth.unvamp.com` | Keycloak | same VPS |
| `ws.unvamp.com` | api WebSocket | same VPS |
| `mx.unvamp.com`, `smtp.unvamp.com` | Postal | already in postal.yml |
| `cdn.unvamp.com` | future Bunny.net pull-through | Phase 2 |
| `grafana.unvamp.com` (IP-restricted) | Grafana | same VPS |

ACME/Let's Encrypt via Traefik handles all certs automatically.

---

## Verification Plan (per phase)

Each phase has a smoke + regression suite. Final acceptance:

1. **Compose stack boots clean** — `make up`, all services healthy in <2 min.
2. **Unit + integration tests** — `make test` green; 75%+ coverage.
3. **Playwright E2E suite** — every flow listed in Phase B/C/D/E/F passes against compose stack.
4. **k6 load tests** — Phase L scenarios meet target latency p95.
5. **OWASP ZAP scan** — zero high/critical.
6. **Lighthouse** — site + web hit 90+ Performance/Accessibility/SEO.
7. **Bytebase migration review** — green on PR.
8. **Sentry / GlitchTip (OSS)** — zero unhandled errors in prod for 7 days.

---

## Critical Path & Dependencies

```text
Phase A (foundations) ─┬─→ Phase B (streaming core) ─┬─→ Phase C (advanced)
                       ├─→ Phase D (payments) ───────┤
                       ├─→ Phase E (KYC + auth) ─────┤
                       └─→ Phase F (mkt+tour+ticket)─┴─→ Phase H (admin) ─┐
                                                                          │
                       Phase G (search/AI) ──────────────────────────────┤
                       Phase I (marketing site) — parallel any week      │
                       Phase J (observability) — parallel after Phase B  │
                       Phase K (CI/CD) — parallel from Phase A           │
                                                                          ▼
                                                                  Phase L (load+chaos)
                                                                          │
                                                                          ▼
                                                                       PROD GO-LIVE
```

**Critical path length**: ~10 weeks for one engineer focused; ~5-6 weeks with two parallelizing;
~3-4 weeks with three (one streaming, one payments+KYC, one dashboards/site).

**Hard blockers for prod launch**:

- Phase B (streaming) — without it, zero core value
- Phase D (payments) — without it, zero revenue
- Phase E (KYC + Keycloak) — without it, no organiser onboarding & no payouts
- Phase K (CI/CD) — without it, manual deploys are unsustainable

Phases C, F, G, H, I can ship incrementally post-MVP if needed.

---

## What "100%" Actually Means — Launch Readiness Definition

Honest answer to "after all of these are implemented are we 100% ready to launch?":

### YES — fully launchable for **web platform** (organisers + attendees on app.unvamp.com)

After Phases A → L are green, the following journeys are production-grade:

- Account: register, social login, OTP via SMS, 2FA, password reset, KYC up to Full Compliance per
  country
- Discover: explore, search, recommendations, bookmark, geo
- Organiser: create event, configure tickets, configure stream, multi-cam setup, go live, real-time
  chat/poll/Q&A, end stream, download analytics, request payout
- Attendee: buy ticket (Paystack/Stripe), watch live stream, screen-limit enforced, replay on
  demand, marketplace buy/sell/swap, rate event
- Check-in: organiser scans QR, marks attendance, prevents re-entry
- Wallet: top up, withdraw (KYC-gated), settle T+2/T+5, refunds on cancellation
- Admin: every dashboard wired, KYC review, content moderation, support tickets, settlements,
  payouts, audit log, feature flags
- Marketing: landing, pricing, blog, legal, contact

**Acceptance criteria for "100% web ready":**

- All Playwright E2E tests green in CI
- 75%+ unit coverage in all four repos
- k6 load tests meet target latency (p95 stream join <2s, ticket purchase <3s)
- OWASP ZAP zero high/critical
- Lighthouse 90+ across web/site
- One-command staging deploy round-trips green for 7 days
- Backups verified (restore test passes)
- All logs/metrics/traces flowing to Grafana

### NO — not yet covered by this roadmap

These items are explicitly **out of scope for the web 100%**, must be planned separately:

| Out-of-scope item | What's needed | When |
| ----------------- | ------------- | ---- |
| **Mobile apps (Android/iOS)** | Phase M kickoff — Kotlin + Swift apps, ExoPlayer/AVPlayer, FCM/APNs, FairPlay DRM on iOS | After web launch — separate 8-12 week roadmap |
| **Multi-region deploy** | k3s clusters per region, Citus DB sharding, geo-DNS routing | When traffic justifies it (post-launch growth) |
| **Compliance/legal pre-launch (operational, not code)** | Business entity registration, GDPR DPO, privacy policy lawyer review, terms of service legal review, content moderation legal review per country, music licensing if applicable, payment gateway business KYC | **Must be done in parallel with engineering** — gating for go-live |
| **Provider account onboarding (operational)** | Paystack business verification, Stripe Atlas / business profile, Sumsub tenant + KYC of platform itself, Twilio + Africa's Talking accounts, FCM + APNs accounts, Apple Developer ($99/yr), Google Play Developer ($25 one-time), Bunny.net account, domain registration + DNS for unvamp.com | **Must be done before staging** — gating |
| **Insurance + risk** | Cyber liability insurance, errors & omissions, business interruption | Pre-launch |
| **Customer support staffing** | At least 1 support agent per major timezone, rota, escalation paths, runbooks | Pre-launch |
| **Marketing launch plan** | Press kit, influencer partnerships, paid ads, App Store listings, organic content for blog | Pre-launch |
| **24/7 ops rotation** | Pager Duty (or OSS Grafana OnCall), runbooks, incident response process, SLA defined | Pre-launch |

### Pre-Launch Operations Checklist (must run alongside engineering)

| Stream | Tasks | Owner |
| ------ | ----- | ----- |
| **Legal** | Entity in Nigeria + Delaware C-Corp; ToS + Privacy + Refund + Cookie review by counsel; DMCA agent registration; Music licensing (PRS/PPL/MCSN if applicable) | Founders + lawyers |
| **Finance** | Open business bank accounts; Paystack business verification (BVN of directors, RC docs); Stripe Atlas (US LLC + EIN + bank); Sumsub tenant + business KYC; tax registration | Finance |
| **Compliance** | NIMC API access (commercial agreement); NIBSS API access; GDPR Data Processing Addenda with all sub-processors; data residency decisions per region | Compliance |
| **Infra** | Domain registration unvamp.com; Cloudflare account + DNS; Hetzner account + project; backup S3 bucket + encryption keys; SSL provisioned by Traefik ACME | Engineering |
| **Apps stores (when mobile starts)** | Apple Developer Program; Google Play Console; brand assets, screenshots, ASO copy | Marketing + Engineering |
| **Comms** | support@, security@, abuse@, dpo@ mailboxes (Postal); status page (statping/Cachet OSS); incident response runbook | Engineering + Support |

### TL;DR for the launch question

**After Phases A→L are done, web platform is functionally 100% and technically deployable.** Whether
you can publicly launch on day one depends on the operational checklist above (legal + financial +
provider accounts) which runs in **parallel** with engineering — not after it. Plan to execute both
tracks together; engineering finishes around week 11, ops/legal items typically take 4-8 weeks to
clear (Paystack verification, legal review) so start them in week 1.

Mobile apps are **phase M** and require a separate ~10-week roadmap after web is live and stable.

---

## PART 3 — Continuation backlog (added 2026-05-01)

Items still owed against the original plan plus follow-ups that surfaced during execution. Tracked
here so they don't get lost.

### Maps (new) — Status: DONE

**Goal**: every place the product needs a map uses the same OSS-friendly stack.

**Library**: <https://github.com/AnmolSaini16/mapcn> — shadcn-style React components on top of
MapLibre GL JS. No paid API key, no Mapbox / Google Maps tile commercial dependency.

**Where maps are needed**:

| Surface | Repo | Status | Purpose |
| ------- | ---- | ------ | ------- |
| Event detail page | unvamp-web | ✅ | Show venue location + nearby transport |
| Event create wizard (physical / hybrid step) | unvamp-web | ✅ | Address picker with reverse-geocode → `events.lat/lng` |
| Explore — geo-search results | unvamp-web | ✅ | Pin map alongside the list view |
| For-organisers landing | unvamp-site | ✅ | Marketing illustration of regional reach |
| Admin event detail | unvamp-admin | ✅ | Read-only map tile for verification |
| Check-in page | unvamp-web | ✅ | Optional venue floor / arrival map |

**Deliverables**:

- [x] Add `mapcn` (or its underlying `react-map-gl` + `maplibre-gl` deps if not yet on npm) to
  `unvamp-web` and `unvamp-admin`
- [x] Build a single `<VenueMap>` wrapper that reads `lat`, `lng`, `zoom` and emits an interaction
  event for the address picker (`src/components/ui/map.tsx`, vendored identical across all three
  Next.js apps)
- [x] Wire it into the six surfaces above
- [x] Tile source: OSM via the public MapLibre demo style for dev, swap to a self-hosted
  `tileserver-gl` for production
- [x] Reverse geocoding: Nominatim — run a `nominatim` container in compose for local dev, point
  production at `https://nominatim.openstreetmap.org/` until traffic justifies self-hosting.
  _(2026-05-17: `nominatim` service confirmed in `infrastructure/docker-compose.yml` —
  `mediagis/nominatim:4.4`, Nigeria PBF, host port 8585, healthcheck on `/status?format=json`.
  AddressPicker reads `NEXT_PUBLIC_NOMINATIM_URL` and falls back to the public OSM endpoint.
  `unvamp-web/.env.local.example` now seeds the dev value `http://localhost:8585` with an
  inline comment explaining the production fallback.)_

**Acceptance**: every surface above renders the same `<VenueMap>` component; address picker
round-trips lat/lng into the events table; works in light + dark theme with no commercial-tile API
key.

### Carry-overs from earlier phases

| Tag | Item | Status | Next action |
| --- | ---- | ------ | ----------- |
| I8 | Tempo (tracing) compose service | ✅ done | Tempo service up, Grafana datasource wired (2026-05-15) |
| J.1 | OpenTelemetry SDK in api / worker / stream-proxy | ✅ done | otelhttp.NewHandler in cmd/api + cmd/stream-proxy; otelpkg.Init in cmd/worker (2026-05-16) |
| J.5 | Prometheus alert rules | ✅ done | `infrastructure/prometheus/alerts.yml` with 10 rules (2026-05-16); compose mount fixed |
| J.6 | Coraza WAF + CrowdSec | ✅ done | Verified 2026-05-18: `infrastructure/traefik/traefik.yml` registers both plugins (`coraza-http-wasm-traefik` v0.4.1 + `crowdsec-bouncer-traefik-plugin` v1.4.4) under `experimental.plugins`; `dynamic.yml` defines `coraza-waf` middleware (OWASP CRS includes, request body access on, anomaly threshold 10, allowed-methods rule) and `crowdsec-bouncer` middleware (live mode, 60s update interval, LAPI key + host wired); both middlewares applied to public routers (api / auth / web / site / stream); traefik service mounts both configs and depends on healthy crowdsec. |
| J.7 | Infisical secrets manager | ✅ done | Compose service running; Go SDK consumer in api startup wired |
| J.8 | Unleash feature flags | ✅ done | Compose service + Go client; admin token + flag seed via `infra/scripts/seed-unleash-flags.sh` |
| B22 | Audit middleware on mutating routes | ✅ done | Applied to every `POST/PUT/PATCH/DELETE` under `/api/v1` |
| E.8 | Keycloak realm export | ✅ done | `realm-export.template.json` carries all 4 clients (`unvamp-web`, `unvamp-admin`, `unvamp-api`, `unvamp-stream-proxy`) and 3 IDPs (Google, Facebook, Apple). `infrastructure/scripts/render-keycloak-realm.sh` substitutes OAuth credentials via `jq`; bootstrap runs the renderer before Keycloak imports |
| K.5 | admin / site CI 75 % coverage gate | ✅ wired 2026-05-17 | Both `unvamp-admin/.github/workflows/ci.yml` and `unvamp-site/.github/workflows/ci.yml` now hardcode `MIN_PCT=75` (overridable per branch via env block). Mirrors the long-term target from `unvamp-web/.github/workflows/ci.yml`. **Truthful state:** admin coverage is currently 1.48% lines — CI will go red on the gate until tests are written. The vitest config keeps the per-PR ramp at 5% so individual PRs can still land while coverage climbs. Follow-up tracked as N.0 below: ramp admin + site coverage to 75% via incremental component tests. |

### Local-env stack ergonomics

Documented in `~/Unvamp/README.md` and the `make bootstrap` flow. Closing items:

- [x] Surface `bootstrap-local.sh` flags (`--rebuild` / `--reset` / `--core-only`) in the README
  quick-start. _(verified 2026-05-17: `unvamp-api/Makefile` exposes `make
  rebuild` / `make reset` / `make core` as wrappers, README "Make targets"
  table documents all three.)_
- [x] Add `make stop` / `make logs` shortcuts. _(verified 2026-05-17:
  both targets exist in `unvamp-api/Makefile` — `stop` runs `docker compose
  stop`, `logs` runs `docker compose logs -f --tail=100`; both documented
  in README.)_
- [x] A `pnpm dev:all` workspace script that fans web + admin + site dev servers in parallel.
  _(verified 2026-05-17: `package.json` at workspace root defines `dev:all`
  via `concurrently` with colour-coded prefixes; README "One-command
  bootstrap" section calls it out.)_
