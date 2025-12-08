# 🔐 Environment Variables Reference

Complete guide to all environment variables used in the Cold Email Dashboard.

---

## 📋 Quick Reference

| Variable | Required | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase admin key | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | Clerk frontend key | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | ✅ Yes | Clerk backend key | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ Yes | Sign-in route | Usually `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ Yes | Sign-up route | Usually `/sign-up` |
| `DASH_WEBHOOK_TOKEN` | ✅ Yes | n8n webhook auth | Generate with `openssl rand -hex 32` |
| `MATERIALIZED_VIEWS_REFRESH_TOKEN` | ✅ Production | Cron job security | Generate with `openssl rand -hex 32` |
| `PLAYWRIGHT_TEST` | ⚠️ Testing | E2E test mode | Set to `true` for tests |
| `BASE_URL` | ⚠️ Testing | Playwright base URL | Usually `http://localhost:3000` |
| `NODE_ENV` | ℹ️ Auto | Environment mode | Auto-detected by Next.js |
| `CI` | ℹ️ Auto | CI/CD detection | Auto-set in CI environments |

---

## 🔑 Detailed Configuration

### 1. Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type**: Public (client-side accessible)
- **Format**: `https://your-project-id.supabase.co`
- **Purpose**: Connects frontend to Supabase database
- **How to Get**:
  1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
  2. Select your project
  3. Navigate to **Settings → API**
  4. Copy **Project URL**

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type**: Secret (server-side only)
- **Format**: Long alphanumeric string starting with `eyJ...`
- **Purpose**: Admin access to Supabase (bypasses Row Level Security)
- **Security**: ⚠️ **NEVER expose this in frontend code or commit to git**
- **How to Get**:
  1. Same location as URL above
  2. Copy **service_role** key (not anon key!)
- **Usage**: API routes, server-side queries, materialized view refresh

---

### 2. Clerk Authentication

#### `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Type**: Public (client-side accessible)
- **Format**: `pk_test_xxxxx` (test) or `pk_live_xxxxx` (production)
- **Purpose**: Initialize Clerk SDK in frontend
- **How to Get**:
  1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
  2. Select your application
  3. Navigate to **API Keys**
  4. Copy **Publishable Key**

#### `CLERK_SECRET_KEY`
- **Type**: Secret (server-side only)
- **Format**: `sk_test_xxxxx` (test) or `sk_live_xxxxx` (production)
- **Purpose**: Verify user sessions on backend
- **Security**: ⚠️ **NEVER expose in frontend**
- **How to Get**:
  1. Same location as publishable key
  2. Copy **Secret Key**
  3. Use test keys for development, live keys for production

#### `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- **Type**: Public
- **Format**: `/sign-in` (route path)
- **Purpose**: Clerk redirect route for sign-in
- **Default**: `/sign-in`
- **Customization**: Can change to `/login` or custom route

#### `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- **Type**: Public
- **Format**: `/sign-up` (route path)
- **Purpose**: Clerk redirect route for sign-up
- **Default**: `/sign-up`
- **Customization**: Can change to `/register` or custom route

---

### 3. Webhook Security

#### `DASH_WEBHOOK_TOKEN`
- **Type**: Secret (server-side only)
- **Format**: 64-character hex string
- **Purpose**: Authenticate incoming webhooks from n8n workflows
- **How to Generate**:
  ```bash
  openssl rand -hex 32
  ```
- **Security**:
  - ⚠️ Keep this secret and secure
  - Use the **SAME TOKEN** in:
    1. Your `.env.local` file
    2. Your n8n workflow HTTP Request headers
    3. Your Vercel environment variables
- **Example n8n Configuration**:
  ```
  Headers:
    X-Webhook-Token: {{ $env.DASH_WEBHOOK_TOKEN }}
  ```

---

### 4. Materialized Views Refresh

#### `MATERIALIZED_VIEWS_REFRESH_TOKEN`
- **Type**: Secret (server-side only)
- **Format**: 64-character hex string
- **Purpose**: Secure the cron job that refreshes database aggregations
- **How to Generate**:
  ```bash
  openssl rand -hex 32
  ```
- **When Needed**: Required in production for daily data refresh
- **Cron Configuration**: Vercel cron job calls:
  ```
  GET /api/admin/refresh-views
  Headers:
    Authorization: Bearer your-refresh-token-here
  ```
- **Frequency**: Daily at midnight (configured in `vercel.json`)

---

### 5. Development & Testing

#### `PLAYWRIGHT_TEST`
- **Type**: Development/Testing only
- **Format**: `true` or `false`
- **Purpose**: Bypass Clerk authentication in E2E tests
- **Default**: `false`
- **When to Use**: Set to `true` when running Playwright tests
- **Security**: Only works on `localhost` (enforced by middleware)
- **Usage**:
  ```bash
  # Terminal 1: Start dev server with E2E mode
  PLAYWRIGHT_TEST=true npm run dev
  
  # Terminal 2: Run tests
  npm run test:e2e
  ```

#### `BASE_URL`
- **Type**: Testing only
- **Format**: `http://localhost:3000` or custom URL
- **Purpose**: Base URL for Playwright E2E tests
- **Default**: `http://localhost:3000`
- **When to Override**: Testing against staging or different port

#### `NODE_ENV`
- **Type**: Auto-detected
- **Format**: `development`, `production`, or `test`
- **Purpose**: Determines build optimizations and logging
- **Auto-Set by**: Next.js based on command (`dev` vs `build`)
- **Manual Override**: Usually not needed

#### `CI`
- **Type**: Auto-detected
- **Format**: `true` or `false`
- **Purpose**: Detect CI/CD environments
- **Auto-Set by**: GitHub Actions, Vercel, etc.
- **Impact**: Affects Playwright retry count and parallelization

---

## 🛠️ Setup Guide

### First-Time Setup

1. **Copy the example file**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Set up Supabase**:
   - Create account at [supabase.com](https://supabase.com)
   - Create new project
   - Run `supabase/schema.sql` in SQL Editor
   - Copy URL and service key to `.env.local`

3. **Set up Clerk**:
   - Create account at [clerk.com](https://clerk.com)
   - Create new application
   - Copy publishable and secret keys to `.env.local`

4. **Generate webhook tokens**:
   ```bash
   # Generate DASH_WEBHOOK_TOKEN
   openssl rand -hex 32
   
   # Generate MATERIALIZED_VIEWS_REFRESH_TOKEN
   openssl rand -hex 32
   ```
   
5. **Update n8n workflows**:
   - Add `DASH_WEBHOOK_TOKEN` to n8n environment variables
   - Update HTTP Request nodes to use token

### Production Deployment (Vercel)

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add all required variables**:
   - Copy from your local `.env.local`
   - ⚠️ Never commit `.env.local` to git!

3. **Verify variable scope**:
   - Development: Used in `vercel dev`
   - Preview: Used in preview deployments
   - Production: Used in production deployment

4. **Redeploy** if variables were added after initial deployment

---

## 🔒 Security Best Practices

### DO ✅
- ✅ Generate strong random tokens (min 32 bytes)
- ✅ Use different tokens for dev/staging/production
- ✅ Rotate tokens if compromised
- ✅ Store in Vercel environment variables for production
- ✅ Use test Clerk keys in development
- ✅ Keep `.env.local` in `.gitignore`

### DON'T ❌
- ❌ Commit `.env.local` to version control
- ❌ Expose secret keys in frontend code
- ❌ Share tokens in Slack/email (use password manager)
- ❌ Use production keys in development
- ❌ Hardcode tokens in source code
- ❌ Reuse the same token across environments

---

## 🧪 Testing Configuration

For E2E testing with Playwright:

```bash
# .env.local (for testing)
PLAYWRIGHT_TEST=true
BASE_URL=http://localhost:3000

# All other variables same as development
```

Run tests:
```bash
# Terminal 1
PLAYWRIGHT_TEST=true npm run dev

# Terminal 2
npm run test:e2e
```

---

## ❓ Troubleshooting

### "Supabase client not initialized"
- ✅ Check `NEXT_PUBLIC_SUPABASE_URL` is set
- ✅ Check `SUPABASE_SERVICE_ROLE_KEY` is set
- ✅ Restart dev server after adding variables

### "Clerk auth error"
- ✅ Verify publishable key starts with `pk_test_` or `pk_live_`
- ✅ Verify secret key starts with `sk_test_` or `sk_live_`
- ✅ Check keys are from the same Clerk application
- ✅ Ensure sign-in/sign-up URLs match your routes

### "Webhook authentication failed"
- ✅ Token in n8n matches token in `.env.local`
- ✅ Header name is `X-Webhook-Token` (case-sensitive)
- ✅ Token has no extra spaces or line breaks
- ✅ Token is 64 characters (32 bytes in hex)

### "Materialized views not refreshing"
- ✅ Check `MATERIALIZED_VIEWS_REFRESH_TOKEN` is set in Vercel
- ✅ Verify cron job is configured in Vercel dashboard
- ✅ Check cron job logs for errors
- ✅ Manually trigger: `curl -H "Authorization: Bearer YOUR_TOKEN" https://your-app.vercel.app/api/admin/refresh-views`

---

## 📚 Related Documentation

- [Main README](../README.md) - Setup guide
- [API Reference](API_REFERENCE.md) - API endpoints
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Clerk Integration](CLERK_INTEGRATION.md) - Authentication details

---

*Last Updated: December 8, 2025*
