# 🚀 START HERE - n8n Setup Guide

## ⚡ TL;DR (2 minutes)

You asked: **"How do I add variables to n8n since it's only available on Enterprise plans?"**

**Answer:** We created **5 comprehensive guides** showing you how to set up n8n without Enterprise. Pick your favorite approach!

---

## 📊 Your Connection Details

Save these somewhere safe:

```
Dashboard URL:  http://localhost:3000
Webhook Token:  6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
API Endpoint:   POST /api/cost-events
```

---

## 🎯 Choose Your Path

### Path A: Fastest Setup (5 minutes) ⚡
**Best for:** Testing, learning, getting it working NOW

1. Open: **`N8N_SETUP_CHEATSHEET.md`** (in root folder)
2. It's ONE PAGE with copy-paste values
3. Follow the "Hardcoded" method
4. Done!

### Path B: Production Ready (15 minutes) 🏢
**Best for:** Real workflows, easier updates, cleaner code

1. Open: **`N8N_SETUP_CHEATSHEET.md`** 
2. Follow the "Credentials" method (Method B)
3. Create n8n Credentials once
4. All workflows use them
5. Done!

### Path C: All Options Explained (30 minutes) 📚
**Best for:** Understanding everything, making informed choices

1. Open: **`docs/N8N_SETUP_WITHOUT_ENTERPRISE.md`**
2. Read 4 different setup options
3. Pick the one you like
4. Understand why you picked it
5. Done!

---

## 📚 Documentation Created

### Quick Reference
- **`N8N_SETUP_CHEATSHEET.md`** ⭐
  - One page, print-ready
  - Copy-paste values
  - Two methods explained
  - Test commands
  - Troubleshooting

### Step-by-Step Guides
- **`docs/N8N_QUICK_SETUP.md`**
  - Detailed steps with visuals
  - Method A: Hardcoded
  - Method B: Credentials
  - Full troubleshooting

- **`docs/N8N_SETUP_WITHOUT_ENTERPRISE.md`**
  - Why env variables aren't available
  - Option 1: Hardcoded values
  - Option 2: Credentials
  - Option 3: Workflow variables
  - Option 4: Central config
  - Comparison & migration path

### References & Details
- **`docs/N8N_INTEGRATION.md`**
  - Complete API reference
  - Supported providers
  - Pricing information
  - Batch sending
  - Testing guide

- **`docs/README.md`**
  - Documentation hub
  - Navigation guide
  - Common questions

### Workflow Documentation
- **`n8n-workflows/README.md`**
  - How to import workflows
  - 5 workflows explained
  - Integration patterns
  - Supported models & pricing

---

## 🎬 Workflows Ready to Import

Location: `n8n-workflows/`

```
✅ complete-cost-tracking-example.json
   → All providers, everything explained
   → START WITH THIS ONE

✅ openai-with-cost-tracking.json
   → Just OpenAI integration

✅ anthropic-with-cost-tracking.json
   → Just Anthropic/Claude integration

✅ email-prep-with-cost-tracking.json
   → Full email preparation pipeline (for production)

✅ cost-tracking-subworkflow.json
   → Reusable component for advanced setups
```

---

## 🚀 Quickest Start (5 Steps)

### Step 1: Get Your Details
```
URL:   http://localhost:3000
Token: 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
```

### Step 2: Open n8n
Go to your n8n instance

### Step 3: Import Workflow
- Click "Add workflow" → "Import from file"
- Choose: `n8n-workflows/complete-cost-tracking-example.json`

### Step 4: Update Values
Find these in the workflow:
```
{{ $env.DASHBOARD_URL }}      → http://localhost:3000
{{ $env.DASH_WEBHOOK_TOKEN }} → 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
```

### Step 5: Test
- Click "Execute Workflow"
- Should see: `{ "success": true, "inserted": 1 }`
- Check: `http://localhost:3000/analytics` for costs

---

## ❓ FAQ

**Q: Why can't I use Environment Variables?**
A: They're Enterprise-only in n8n. But hardcoded values work great for testing!

**Q: Which method should I use?**
A: 
- Development/Testing → Hardcoded (Method A)
- Production → Credentials (Method B)
- See `N8N_SETUP_CHEATSHEET.md` for both

**Q: Can I update all workflows at once?**
A: Yes! Use Method B (Credentials) - update the credential once, applies everywhere

**Q: What if I get an error?**
A: Check `N8N_SETUP_CHEATSHEET.md` → Troubleshooting section

**Q: Where can I see the costs?**
A: `http://localhost:3000/analytics` after sending data

---

## 🎬 Visual Summary

```
Your n8n Workflow
       ↓
  Calls API
       ↓
POST http://localhost:3000/api/cost-events
       ↓
Dashboard receives & logs costs
       ↓
View at: http://localhost:3000/analytics
```

---

## 📋 Checklist

- [ ] Copy your URL and Token from this file
- [ ] Read `N8N_SETUP_CHEATSHEET.md`
- [ ] Pick Method A or Method B
- [ ] Import a workflow
- [ ] Update values
- [ ] Test it
- [ ] See costs in dashboard

---

## 🎯 What You Get

After setup, your dashboard will track:
- ✅ Total sends (from Google Sheets)
- ✅ Reply rate
- ✅ Opt-out rate
- ✅ **LLM costs** (from n8n)
- ✅ Cost per reply
- ✅ Cost breakdown by provider
- ✅ Cost breakdown by model

---

## 🔗 File Map

```
Root Level:
  START_HERE.md ← YOU ARE HERE
  N8N_SETUP_CHEATSHEET.md ← GO HERE NEXT
  SETUP_COMPLETE.md
  FILES_CREATED.md

Detailed Guides:
  docs/N8N_QUICK_SETUP.md
  docs/N8N_SETUP_WITHOUT_ENTERPRISE.md
  docs/N8N_INTEGRATION.md
  docs/README.md

Workflows:
  n8n-workflows/complete-cost-tracking-example.json
  n8n-workflows/openai-with-cost-tracking.json
  n8n-workflows/anthropic-with-cost-tracking.json
  n8n-workflows/email-prep-with-cost-tracking.json
  n8n-workflows/cost-tracking-subworkflow.json
```

---

## 🏃 Next Step

**👉 Open: `N8N_SETUP_CHEATSHEET.md`**

That's all you need to get started!

---

## 💡 Pro Tips

1. **Print** `N8N_SETUP_CHEATSHEET.md` - you'll reference it a lot
2. **Copy/paste** values from the cheatsheet - avoid typos
3. **Test first** with `complete-cost-tracking-example.json` - it shows all providers
4. **Use credentials** for production - easier to update later
5. **Reference** `docs/N8N_INTEGRATION.md` for API details

---

## ✨ What's Also Ready

Your dashboard already has:
- ✅ Google Sheets integration (showing 306 sends)
- ✅ Beautiful UI (light/dark mode)
- ✅ Calendar with solid backgrounds
- ✅ High-contrast light mode
- ✅ Cost tracking API (waiting for n8n)
- ✅ 5 ready-to-use workflows

---

## 🎓 Learning Resources in This Project

| Need | Read This |
|------|-----------|
| Quick setup | N8N_SETUP_CHEATSHEET.md |
| Detailed steps | docs/N8N_QUICK_SETUP.md |
| All options | docs/N8N_SETUP_WITHOUT_ENTERPRISE.md |
| API reference | docs/N8N_INTEGRATION.md |
| Workflow help | n8n-workflows/README.md |
| Overview | SETUP_COMPLETE.md |

---

**Ready? Open `N8N_SETUP_CHEATSHEET.md` now! 🚀**

