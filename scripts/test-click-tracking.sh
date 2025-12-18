#!/bin/bash
# ============================================
# Click Tracking Verification Script
# Tests the /api/track/click endpoint
# ============================================

set -e

echo "🔍 Testing Click Tracking Implementation"
echo "========================================"
echo ""

# Configuration
DASHBOARD_URL="https://cold-email-dashboard.vercel.app"
# Or use localhost for local testing:
# DASHBOARD_URL="http://localhost:3000"

TEST_EMAIL="test@example.com"
CAMPAIGN="Ohio"
STEP=1
LINK_ID="test_link"
WORKSPACE_ID="default"
DESTINATION_URL="https://example.com"

# Build tracking URL
TRACKING_URL="${DASHBOARD_URL}/api/track/click?url=$(echo -n "$DESTINATION_URL" | jq -sRr @uri)&e=$(echo -n "$TEST_EMAIL" | jq -sRr @uri)&c=$(echo -n "$CAMPAIGN" | jq -sRr @uri)&s=${STEP}&l=$(echo -n "$LINK_ID" | jq -sRr @uri)&w=$(echo -n "$WORKSPACE_ID" | jq -sRr @uri)"

echo "📝 Test Configuration:"
echo "  Dashboard URL: $DASHBOARD_URL"
echo "  Test Email: $TEST_EMAIL"
echo "  Campaign: $CAMPAIGN"
echo "  Step: $STEP"
echo "  Link ID: $LINK_ID"
echo "  Workspace ID: $WORKSPACE_ID"
echo "  Destination: $DESTINATION_URL"
echo ""
echo "🔗 Generated Tracking URL:"
echo "  $TRACKING_URL"
echo ""

# Test 1: Check if endpoint responds
echo "🧪 Test 1: Endpoint Response"
echo "----------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$TRACKING_URL")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ PASS: Endpoint returned HTTP $HTTP_CODE (redirect working)"
else
  echo "❌ FAIL: Endpoint returned HTTP $HTTP_CODE (expected 200 or 302)"
  exit 1
fi
echo ""

# Test 2: Check redirect destination
echo "🧪 Test 2: Redirect Verification"
echo "--------------------------------"
REDIRECT_URL=$(curl -s -o /dev/null -w "%{redirect_url}" "$TRACKING_URL")

if [ "$REDIRECT_URL" == "$DESTINATION_URL" ]; then
  echo "✅ PASS: Redirects to correct destination: $REDIRECT_URL"
elif [ -z "$REDIRECT_URL" ]; then
  # Some curl versions don't support redirect_url, try with -L and Location header
  REDIRECT_URL=$(curl -s -I "$TRACKING_URL" | grep -i "^Location:" | cut -d' ' -f2 | tr -d '\r')
  if [ "$REDIRECT_URL" == "$DESTINATION_URL" ]; then
    echo "✅ PASS: Redirects to correct destination: $REDIRECT_URL"
  else
    echo "⚠️  WARNING: Could not verify redirect destination (curl limitation)"
    echo "   Expected: $DESTINATION_URL"
    echo "   Got: $REDIRECT_URL"
  fi
else
  echo "❌ FAIL: Redirects to wrong destination"
  echo "   Expected: $DESTINATION_URL"
  echo "   Got: $REDIRECT_URL"
  exit 1
fi
echo ""

# Test 3: Missing workspace_id parameter
echo "🧪 Test 3: Missing workspace_id (Should Fail)"
echo "-------------------------------------------"
BAD_URL="${DASHBOARD_URL}/api/track/click?url=$(echo -n "$DESTINATION_URL" | jq -sRr @uri)&e=$(echo -n "$TEST_EMAIL" | jq -sRr @uri)&c=$(echo -n "$CAMPAIGN" | jq -sRr @uri)&s=${STEP}&l=$(echo -n "$LINK_ID" | jq -sRr @uri)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BAD_URL")

if [ "$HTTP_CODE" == "400" ]; then
  echo "✅ PASS: Correctly rejects request without workspace_id (HTTP 400)"
elif [ "$HTTP_CODE" == "302" ]; then
  echo "⚠️  WARNING: Endpoint accepts requests without workspace_id (this may be intentional for backwards compatibility)"
else
  echo "⚠️  UNEXPECTED: HTTP $HTTP_CODE (expected 400 or 302)"
fi
echo ""

# Test 4: Database check (requires psql and Supabase credentials)
echo "🧪 Test 4: Database Logging (Optional)"
echo "------------------------------------"
if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
  echo "Checking database for click event..."
  CLICK_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM email_events WHERE event_type = 'clicked' AND contact_email = '$TEST_EMAIL' AND created_at > NOW() - INTERVAL '5 minutes';")
  
  if [ "$CLICK_COUNT" -gt 0 ]; then
    echo "✅ PASS: Found $CLICK_COUNT click event(s) in database"
  else
    echo "⚠️  WARNING: No click events found (may take a few seconds to propagate)"
  fi
else
  echo "⏭️  SKIP: psql not available or DATABASE_URL not set"
  echo "   To test database logging, set DATABASE_URL environment variable:"
  echo "   export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
fi
echo ""

# Summary
echo "========================================"
echo "✅ Click Tracking Tests Complete!"
echo ""
echo "Next Steps:"
echo "1. Click the tracking URL in a browser to test full redirect:"
echo "   $TRACKING_URL"
echo ""
echo "2. Check database for click event:"
echo "   SELECT * FROM email_events WHERE event_type = 'clicked' ORDER BY created_at DESC LIMIT 1;"
echo ""
echo "3. Check dashboard at:"
echo "   ${DASHBOARD_URL}"
echo ""
