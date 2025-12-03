# API Pricing Configuration

**Last Updated:** November 29, 2025  
**Purpose:** Reference for cost tracking in n8n workflows

---

## LLM Models Used in Workflows

### OpenAI

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Cached Input | Used In |
|-------|----------------------|------------------------|--------------|---------|
| **o3-mini** | $1.10 | $4.40 | $0.55 | Email Preparation (2x), Research Report (1x) |
| **chatgpt-4o-latest** | $5.00 | $15.00 | $2.50 | Research Report (3x) |

**Source:** [OpenAI Pricing](https://platform.openai.com/docs/pricing/)

### Anthropic

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Used In |
|-------|----------------------|------------------------|---------|
| **claude-sonnet-4-5-20250929** (Claude Sonnet 4.5) | $3.00 | $15.00 | Email Preparation (1x) |

**Note:** Claude Sonnet 4.5 pricing is based on Claude Sonnet 4 rates. Verify with Anthropic if different.

**Source:** [Anthropic Pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)

---

## Other Paid Services

### Google Custom Search Engine (CSE)

| Service | Pricing | Notes |
|---------|---------|-------|
| **Custom Search JSON API** | $5.00 per 1,000 queries | 100 free queries/day |

**Cost per query:** $0.005 (after free tier)

**Source:** [Google CSE Pricing](https://developers.google.com/custom-search/v1/overview)

### Apify

Apify uses **Pay-Per-Event (PPE)** pricing for most actors. Costs are based on specific events like runs, places scraped, or reviews fetched.

#### Actors Used in Your Workflows:

| Actor | Pricing Model | Cost | Notes |
|-------|---------------|------|-------|
| **compass~google-maps-reviews-scraper** | Pay-per-result | ~$0.005 per review | Free tier: $0.005/review, Paid: $0.0025/review |
| **drobnikj~crawler-google-places** | Pay-per-event | $0.007 per run + $0.004 per place | Additional charges for filters, details, reviews |

#### Google Maps Scraper Detailed Pricing:
- **Base cost:** $4.00 per 1,000 places scraped
- **Per run:** $0.007
- **Per place:** $0.004
- **Extra features:** Additional charges for filters, contact info, reviews, images

#### Google Maps Reviews Scraper Pricing:
- **Free tier:** $0.005 per review
- **Paid plans:** $0.0025 per review
- **~1,000 reviews:** Approximately $0.47-$2.50 depending on tier

#### Platform Subscription (included credits):
| Plan | Monthly Cost | Included Credits |
|------|--------------|------------------|
| Free | $0 | $5 |
| Starter | $39 | $39 |
| Scale | $199 | $199 |
| Business | $999 | $999 |

**Source:** [Apify Pricing](https://apify.com/pricing), [Apify Help - Pay Per Event](https://help.apify.com/en/articles/10700066-what-is-pay-per-event)

### Relevance AI

| Plan | Pricing | Notes |
|------|---------|-------|
| **Pro Plan** | Credit-based | ~$0.10 per API call (estimate) |

**Services Used:**
- LinkedIn Profile Scraper
- Posts Scraper

**Note:** Check your Relevance AI dashboard for exact credit consumption per call.

**Source:** [Relevance AI Pricing](https://relevanceai.com/pricing)

---

## Cost Calculation Formulas

### OpenAI / Anthropic (Token-based)

```javascript
const cost = (tokens_in * price_per_1M_in / 1000000) + (tokens_out * price_per_1M_out / 1000000);
```

### Google CSE (Query-based)

```javascript
const cost = 0.005; // $0.005 per query (after free tier)
```

### Apify Google Maps Reviews (Per-review)

```javascript
const reviewCount = $json.length || 1;
const cost = reviewCount * 0.005; // $0.005 per review (free tier)
// For paid plans: reviewCount * 0.0025
```

### Apify Google Places (Per-place + per-run)

```javascript
const placeCount = $json.length || 1;
const cost = 0.007 + (placeCount * 0.004); // $0.007 per run + $0.004 per place
```

### Relevance AI (Per-call estimate)

```javascript
const cost = 0.10; // $0.10 per API call (estimate)
```

---

## Pricing Summary Table (Quick Reference)

| Provider | Model/Service | Input Cost | Output Cost | Unit |
|----------|---------------|------------|-------------|------|
| OpenAI | o3-mini | $1.10 | $4.40 | per 1M tokens |
| OpenAI | chatgpt-4o-latest | $5.00 | $15.00 | per 1M tokens |
| Anthropic | claude-sonnet-4.5 | $3.00 | $15.00 | per 1M tokens |
| Google | CSE | $0.005 | - | per query |
| Apify | Google Maps Reviews | $0.005 | - | per review |
| Apify | Google Places | $0.004 | - | per place |
| Relevance AI | API Call | $0.10 | - | per call (est.) |

---

## How to Update This File

1. Check the official pricing pages (links above)
2. Update the tables with new prices
3. Update the "Last Updated" date at the top
4. Re-import workflows if pricing changed significantly

---

## Workflow Cost Tracking Nodes

When implementing cost tracking, use these values in the Code nodes:

### OpenAI o3-mini
```javascript
const PRICING = { in: 1.10, out: 4.40 }; // per 1M tokens
```

### OpenAI chatgpt-4o-latest
```javascript
const PRICING = { in: 5.00, out: 15.00 }; // per 1M tokens
```

### Anthropic Claude Sonnet 4.5
```javascript
const PRICING = { in: 3.00, out: 15.00 }; // per 1M tokens
```

### Google CSE
```javascript
const cost = 0.005; // per query
```

### Apify Google Maps Reviews
```javascript
const reviewCount = $json.length || 1;
const cost = reviewCount * 0.005; // $0.005 per review
```

### Apify Google Places
```javascript
const placeCount = $json.length || 1;
const cost = 0.007 + (placeCount * 0.004); // per run + per place
```

### Relevance AI
```javascript
const cost = 0.10; // per API call (estimate)
```

---

## Notes

- **Token Estimation:** 1 token ≈ 4 characters or ~0.75 words in English
- **Cached Inputs:** OpenAI offers 50% discount on cached/repeated inputs
- **Batch Processing:** Both OpenAI and Anthropic offer discounts for batch API usage
- **Free Tiers:** Google CSE has 100 free queries/day before charges apply

---

## Contact for Pricing Updates

- **OpenAI:** https://platform.openai.com/docs/pricing/
- **Anthropic:** https://docs.anthropic.com/en/docs/about-claude/pricing
- **Google:** https://developers.google.com/custom-search/v1/overview
- **Apify:** https://apify.com/pricing
- **Relevance AI:** https://relevanceai.com/pricing

