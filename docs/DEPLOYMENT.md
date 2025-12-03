# 🚀 Production Deployment Guide

Deploy your Cold Email Dashboard to Vercel for a permanent, reliable URL.

---

## 📋 Prerequisites

1. **GitHub account** (to push your code)
2. **Vercel account** (free at [vercel.com](https://vercel.com))
3. Your existing environment variables from `.env.local`

---

## 🔐 Environment Variables Needed

You'll need these environment variables in Vercel:

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | Supabase Dashboard → Settings → API |
| `GOOGLE_SHEET_ID` | Google Sheet ID | From sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account credentials | Google Cloud Console |
| `DASH_WEBHOOK_TOKEN` | Webhook security token | Generate with `openssl rand -hex 32` |

---

## 🛠️ Deployment Steps

### Option A: Deploy via Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy

```bash
cd cold-email-dashboard-starter
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (for first time)
- Project name: `cold-email-dashboard` (or your choice)
- Directory: `.` (current)
- Override settings? **N**

#### Step 4: Add Environment Variables

```bash
# Add each env var (you'll be prompted for the value)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_SHEET_ID
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
vercel env add DASH_WEBHOOK_TOKEN
```

**Note:** For `GOOGLE_SERVICE_ACCOUNT_JSON`, paste the entire JSON on one line.

#### Step 5: Redeploy with Env Vars

```bash
vercel --prod
```

---

### Option B: Deploy via GitHub + Vercel Dashboard

#### Step 1: Push to GitHub

```bash
# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Cold Email Dashboard"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/cold-email-dashboard.git

# Push
git push -u origin main
```

#### Step 2: Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your repository
4. Configure project:
   - Framework: **Next.js** (auto-detected)
   - Root Directory: `.`

#### Step 3: Add Environment Variables

In the Vercel dashboard, before deploying:
1. Expand **Environment Variables**
2. Add each variable:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
GOOGLE_SHEET_ID = your-sheet-id
GOOGLE_SERVICE_ACCOUNT_JSON = {"type":"service_account",...}
DASH_WEBHOOK_TOKEN = your-webhook-token
```

#### Step 4: Deploy

Click **Deploy** and wait for the build to complete.

---

## 🔗 After Deployment

### 1. Get Your Production URL

Your dashboard will be available at:
- `https://your-project-name.vercel.app`

You can also add a custom domain in Vercel Dashboard → Settings → Domains.

### 2. Update n8n Workflows

**Update the webhook URL in your n8n workflows:**

Replace:
```
https://tracee-tabernacular-brandee.ngrok-free.dev/api/cost-events
```

With:
```
https://your-project-name.vercel.app/api/cost-events
```

**Files to update:**
- `cold-email-system/Email Preparation.json`
- `cold-email-system/Research Report.json`

Look for the `📊 Send Cost Events to Dashboard` node and update the URL.

### 3. Test the Connection

```bash
# Test the API endpoint
curl -X GET https://your-project-name.vercel.app/api/cost-events

# Should return: {"events":[],"count":0}
```

### 4. Test Cost Tracking

Run a workflow in n8n and check if costs appear in your dashboard.

---

## 🔒 Security Considerations

### Webhook Token

Your `DASH_WEBHOOK_TOKEN` protects the ingestion APIs. Make sure:
1. It's set in Vercel environment variables
2. The same token is used in n8n's HTTP headers: `x-webhook-token: YOUR_TOKEN`

### Service Account Security

The `GOOGLE_SERVICE_ACCOUNT_JSON` contains sensitive credentials:
- Never commit it to git (it's in `.gitignore`)
- Only share the Google Sheet with the service account email
- Limit service account permissions to read-only if possible

---

## 🐛 Troubleshooting

### Build Failed

Check the Vercel build logs for errors. Common issues:
- Missing environment variables
- TypeScript errors (run `npm run build` locally first)

### API Returns 401 Unauthorized

- Check `DASH_WEBHOOK_TOKEN` is set correctly in Vercel
- Verify the token matches in your n8n workflows

### No Data Showing

1. Check Supabase connection: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Check Google Sheets connection: `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON`
3. Clear cache: Settings → Clear cache & refresh

### Google Sheets Error

- Ensure the service account email has access to the sheet
- Check `GOOGLE_SERVICE_ACCOUNT_JSON` is valid JSON (no newlines)

---

## 📊 Monitoring

### Vercel Analytics (Free)

Enable in Vercel Dashboard → Analytics to track:
- Page views
- API response times
- Error rates

### Logs

View real-time logs in Vercel Dashboard → Deployments → [Latest] → Functions

---

## 🔄 Updating

To deploy updates:

```bash
# If using CLI
vercel --prod

# If using GitHub
git add .
git commit -m "Your update message"
git push
```

Vercel auto-deploys on push to main branch.

---

## 💡 Tips

1. **Preview Deployments**: Every PR gets a preview URL for testing
2. **Rollback**: Easily rollback to previous deployments in Vercel Dashboard
3. **Custom Domain**: Add your own domain in Settings → Domains
4. **Edge Functions**: Your API routes run on Vercel Edge for low latency

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub (or deployed via CLI)
- [ ] All environment variables added in Vercel
- [ ] Build successful (no errors)
- [ ] Dashboard loads at Vercel URL
- [ ] n8n workflow URLs updated
- [ ] Test cost tracking works end-to-end
- [ ] (Optional) Custom domain configured

---

**Your dashboard is now production-ready!** 🎉

No more ngrok tunnels. Your URL is permanent and reliable.

