# Self-hosting TimeSpan

TimeSpan's application layer (Next.js) is fully self-hostable via Docker. Its
database, auth, and row-level security all run on Supabase — you can point
the app at Supabase's managed cloud, or at a self-hosted Supabase instance
(Supabase itself is open source and ships its own Docker Compose setup),
depending on how much of the stack you want to run yourself.

## Prerequisites

- A Supabase project — either [cloud-hosted](https://supabase.com) or
  [self-hosted](https://supabase.com/docs/guides/self-hosting/docker) — with
  the TimeSpan schema applied (see `docs/schema` migrations, or run the
  project's Supabase migrations against a fresh project).
- Docker (or any container runtime that can build from a standard
  Dockerfile).

## 1. Configure environment variables

Copy the example file and fill in your Supabase project's URL and anon key
(found under Project Settings → API):

```bash
cp .env.example .env.production
```

## 2. Build the image

The Supabase URL and anon key must be supplied as build args, since Next.js
inlines `NEXT_PUBLIC_*` variables into the client bundle at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key \
  -t timespan .
```

## 3. Run it

```bash
docker run -p 3000:3000 --env-file .env.production timespan
```

The app is now available at `http://localhost:3000`. Put it behind your own
reverse proxy / TLS termination (nginx, Caddy, Traefik, your cloud load
balancer) for production use — the container itself just serves plain HTTP.

## What's NOT included in self-hosting

- **Vercel-specific features**: this Dockerfile does not use Vercel's edge
  network, image optimization CDN, or ISR-on-the-edge caching. The app still
  runs and serves the same pages, just without Vercel's global CDN layer —
  put your own CDN in front if that matters for your traffic pattern.
- **Google OAuth**: works the same way as cloud-hosted, but you'll need to
  add your self-hosted domain's callback URL to your Google Cloud OAuth
  client and to Supabase's Auth provider settings.
- **A bundled database**: TimeSpan does not ship its own Postgres — you
  always need a Supabase project (cloud or self-hosted) to hold data and
  enforce row-level security.
