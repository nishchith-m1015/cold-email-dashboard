# Documentation

This folder contains guides for setting up and integrating your Cold Email Analytics Dashboard with n8n.

## 📚 Quick Navigation

### For Getting Started Immediately
- **[N8N_QUICK_SETUP.md](./N8N_QUICK_SETUP.md)** ⚡ **START HERE**
  - Fast 5-minute setup
  - Copy-paste ready values
  - Hardcoded values method (easiest)
  - Credentials method (recommended for production)

### For Detailed Integration
- **[N8N_INTEGRATION.md](./N8N_INTEGRATION.md)**
  - Complete API reference
  - Cost event schema
  - Supported providers & pricing
  - Testing guide

### For Alternative Setup Methods
- **[N8N_SETUP_WITHOUT_ENTERPRISE.md](./N8N_SETUP_WITHOUT_ENTERPRISE.md)**
  - Why Environment Variables aren't available
  - 4 different setup options
  - Migration path from free to enterprise
  - Detailed comparison

### Architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**
  - System overview
  - Data flow diagram

---

## 🎯 Your Dashboard Connection Info

```
🔗 Dashboard URL: http://localhost:3000
🔐 Webhook Token: 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
```

**For Production:** Replace `localhost:3000` with your deployed URL

---

## 🚀 Quick Start (Choose One Path)

### Path 1: Local Testing (Start Here!)
1. Read: [`N8N_QUICK_SETUP.md`](./N8N_QUICK_SETUP.md)
2. Import a workflow from `n8n-workflows/`
3. Replace `{{ $env.DASHBOARD_URL }}` with `http://localhost:3000`
4. Replace `{{ $env.DASH_WEBHOOK_TOKEN }}` with your token above
5. Test and see costs in your dashboard

### Path 2: Production Ready
1. Read: [`N8N_QUICK_SETUP.md`](./N8N_QUICK_SETUP.md) (Method B)
2. Create n8n Credentials for your dashboard
3. Update workflows to use credentials
4. Deploy to production

---

## 📁 File Structure

```
docs/
├── README.md (this file)
├── N8N_QUICK_SETUP.md        ← START HERE for fast setup
├── N8N_INTEGRATION.md        ← Complete reference
├── N8N_SETUP_WITHOUT_ENTERPRISE.md  ← Setup alternatives
└── ARCHITECTURE.md           ← System design
```

```
n8n-workflows/
├── README.md                 ← Workflow documentation
├── complete-cost-tracking-example.json
├── openai-with-cost-tracking.json
├── anthropic-with-cost-tracking.json
├── email-prep-with-cost-tracking.json
└── cost-tracking-subworkflow.json
```

---

## 🔗 n8n Workflow Import

1. Go to your n8n instance
2. Click **Add workflow** → **Import from file**
3. Select a JSON from `n8n-workflows/`
4. Follow [`N8N_QUICK_SETUP.md`](./N8N_QUICK_SETUP.md)

Recommended workflow to start with:
- **`complete-cost-tracking-example.json`** - Shows all provider types

---

## ❓ Common Questions

**Q: Why can't I use Environment Variables?**
A: They're only on n8n Enterprise plan. Use the alternatives in [`N8N_QUICK_SETUP.md`](./N8N_QUICK_SETUP.md)

**Q: Which setup method should I use?**
A: 
- Development: Hardcoded values (Method A)
- Production: Credentials (Method B)
- See [`N8N_SETUP_WITHOUT_ENTERPRISE.md`](./N8N_SETUP_WITHOUT_ENTERPRISE.md) for all options

**Q: How do I test the integration?**
A: Follow the testing section in [`N8N_QUICK_SETUP.md`](./N8N_QUICK_SETUP.md)

**Q: Where do I see the costs in the dashboard?**
A: Go to `http://localhost:3000/analytics` after sending cost events

---

## 🔑 Key Information

| Item | Value |
|------|-------|
| Dashboard URL | `http://localhost:3000` |
| API Endpoint | `/api/cost-events` |
| Webhook Token | `6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61` |
| Token Header | `X-Webhook-Token` |
| Method | `POST` |
| Content-Type | `application/json` |

---

## 📞 Support

If you get stuck:
1. Check the specific guide for your setup method
2. Test with the curl example in [`N8N_QUICK_SETUP.md`](./N8N_QUICK_SETUP.md)
3. Verify your dashboard is running: `npm run dev`
4. Check browser console for errors

---

## 🎓 Learning Path

1. **Day 1**: Read `N8N_QUICK_SETUP.md` + set up one workflow
2. **Day 2**: Test with the example workflows
3. **Day 3**: Integrate into your actual n8n workflows
4. **Week 2**: Switch to production setup with credentials
5. **Month 2**: Consider n8n Professional/Enterprise for advanced features

