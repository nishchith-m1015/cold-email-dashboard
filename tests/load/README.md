# ⚡ Load Testing

This directory contains load testing configurations and scripts.

## 📁 Contents

- **`load-test.yml`** - Load test configuration for webhook endpoints

## 🚀 Usage

### Prerequisites

Install a load testing tool that supports YAML configs (e.g., Artillery, k6, or similar):

```bash
# Install Artillery (recommended)
npm install -g artillery

# Or use k6
brew install k6
```

### Running Load Tests

```bash
# Using Artillery
artillery run tests/load/load-test.yml

# View report
artillery run --output report.json tests/load/load-test.yml
artillery report report.json
```

## 📊 What Gets Tested

The load test configuration typically tests:
- **Webhook endpoints** (`/api/events`, `/api/cost-events`)
- **Metrics endpoints** (`/api/metrics/summary`, `/api/metrics/timeseries`)
- **Concurrent request handling**
- **Database performance under load**
- **Queue processing capacity**

## 📈 Key Metrics

Monitor these metrics during load tests:
- **Response time** (p50, p95, p99)
- **Request rate** (requests/second)
- **Error rate** (4xx, 5xx responses)
- **Database connections**
- **Queue depth**

## 🎯 Performance Targets

Based on current architecture:
- **API response time**: <100ms (p95)
- **Webhook ingestion**: 100+ requests/second
- **Queue processing**: <1 second latency
- **Error rate**: <0.1%

## 📝 Notes

- Run load tests against **staging environment** first
- Monitor database CPU and memory during tests
- Check materialized view refresh performance
- Verify queue doesn't back up

## 🔗 Related

- API endpoints: `docs/API_REFERENCE.md`
- Performance optimization: `docs/PHASED_OPTIMIZATION_ROADMAP.md`
- Webhook queue: `supabase/migrations/20251207_webhook_queue_idempotency.sql`
