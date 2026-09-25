# docker-patterns: Docker Compose for Local Development

> Covers **Docker Compose for Local Development** for the `docker-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Docker Compose for Local Development

### Standard Web App Stack

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: dev                     # Use dev stage of multi-stage Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - .:/app                        # Bind mount for hot reload
      - /app/node_modules             # Anonymous volume -- preserves container deps
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379/0
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  mailpit:                            # Local email testing
    image: axllent/mailpit
    ports:
      - "8025:8025"                   # Web UI
      - "1025:1025"                   # SMTP

volumes:
  pgdata:
  redisdata:
```

### Development vs Production Dockerfile

```dockerfile
# Stage: dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage: dev (hot reload, debug tools)
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage: build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# Stage: production (minimal image)
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Override Files

```yaml
# docker-compose.override.yml (auto-loaded, dev-only settings)
services:
  app:
    environment:
      - DEBUG=app:*
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"                   # Node.js debugger

# docker-compose.prod.yml (explicit for production)
services:
  app:
    build:
      target: production
    restart: always
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

```bash
# Development (auto-loads override)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
