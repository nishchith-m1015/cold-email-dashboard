# Email 2 Tracking Fix - Inject Tracking Into RAW Field

## Problem

Your Email 2 workflow uses a different pattern than Email 1 and 3:
- **Email 1 & 3:** Use Gmail node directly (HTML body)
- **Email 2:** Uses HTTP Request node with `raw` field (base64-encoded RFC 2822 message)

The current tracking injector adds `tracked_body` field, but **doesn't update the `raw` field** that's actually sent.

## Solution

Replace your current "Inject Tracking" Code node in Email 2 with this updated version:

---

## 🔍 Updated Inject Tracking Code (for Email 2)

**Node Name:** `🔍 Inject Tracking (Email 2)`

**Placement:** 
- AFTER: `Code4` node (which generates the `raw` field)
- BEFORE: `HTTP Request4` node (which sends the email)

**JavaScript Code:**

```javascript
// ============================================
// EMAIL 2 TRACKING INJECTOR (RAW FIELD)
// Injects tracking pixel into base64 raw field
// ============================================

const DASHBOARD_URL = 'https://cold-email-dashboard.vercel.app';

// Get data from previous node (Code4)
const inputData = $json;
const raw = inputData.raw; // Base64-encoded email
const contactEmail = inputData.to || '';
const campaign = $('Google Sheets8').item.json.state || 'Ohio';
const step = 2; // Email 2 is always step 2

// Decode the base64 raw field to get the email content
const decodedEmail = Buffer.from(raw, 'base64').toString('utf-8');

// Generate unique token for deduplication
const token = `${contactEmail}-${step}-${Date.now()}`;
const encodedToken = encodeURIComponent(token);

// Build tracking pixel URL
const trackingPixelUrl = `${DASHBOARD_URL}/api/track/open?e=${encodeURIComponent(contactEmail)}&c=${encodeURIComponent(campaign)}&s=${step}&t=${encodedToken}`;

// Build tracking pixel HTML
const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />`;

// Extract the HTML body from the RFC 2822 message
// The email is structured as: Headers\n\nBody
const [headers, ...bodyParts] = decodedEmail.split('\n\n');
let htmlBody = bodyParts.join('\n\n'); // Rejoin in case body has \n\n

// Inject tracking pixel at the end of the HTML body
let trackedBody = htmlBody;

// Add tracking pixel before common HTML end tags or at the end
if (trackedBody.includes('</body>')) {
  trackedBody = trackedBody.replace('</body>', `${trackingPixel}</body>`);
} else if (trackedBody.includes('</html>')) {
  trackedBody = trackedBody.replace('</html>', `${trackingPixel}</html>`);
} else {
  // Plain text or simple HTML - append at end
  trackedBody = `${trackedBody}\n${trackingPixel}`;
}

// Rebuild the full email with headers + tracked body
const trackedEmail = `${headers}\n\n${trackedBody}`;

// Re-encode to base64url (same format as original)
const newRaw = Buffer.from(trackedEmail)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

// Return the updated item with new raw field
return [
  {
    json: {
      ...inputData,
      raw: newRaw, // ✅ Updated with tracking pixel
      // Debug/logging fields (optional)
      original_raw: raw,
      tracking_pixel_url: trackingPixelUrl,
      tracking_injected: true,
      tracking_token: encodedToken
    }
  }
];
```

---

## 📋 How to Apply This Fix

### Step 1: Open Email 2 Workflow in n8n

1. Go to n8n dashboard
2. Click on **"Email 2"** workflow
3. Find the flow: `Code4` → (inject tracking here) → `HTTP Request4`

### Step 2: Check if Inject Tracking Node Exists

**If you already have an "Inject Tracking" node:**
1. Click on it
2. Replace the JavaScript code with the code above
3. Save the node

**If you DON'T have an "Inject Tracking" node:**
1. Click the `+` button between `Code4` and `HTTP Request4`
2. Add a **Code** node
3. Name it: `🔍 Inject Tracking (Email 2)`
4. Paste the JavaScript code above
5. Save the node

### Step 3: Update Node Connections

Make sure the flow is:
```
Code4 → 🔍 Inject Tracking (Email 2) → HTTP Request4 → Track Email 2 Sent
```

The connections should be:
1. `Code4` output → `🔍 Inject Tracking (Email 2)` input
2. `🔍 Inject Tracking (Email 2)` output → `HTTP Request4` input
3. `HTTP Request4` output → `Track Email 2 Sent` input

### Step 4: Verify HTTP Request4 Node

The `HTTP Request4` node should use `{{ $json.raw }}` (which is now updated):

```json
{
  "raw": "={{ $json.raw }}",
  "threadId": "={{ $('Limit').item.json['message_id'] }}"
}
```

**This should NOT change** - it already uses `$json.raw`, which is now the tracked version!

### Step 5: Update Track Email 2 Sent Node

Now you can update the tracking node. The current jsonBody is:

```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets8').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 2,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"Re: {{ $('Google Sheets8').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Code4').item.json.raw }}\"\n}"
```

**Replace with (adds idempotency fields):**

```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets8').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 2,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"Re: {{ $('Google Sheets8').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Code4').item.json.raw }}\",\n  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets8').item.json.email_address }}_step2\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
```

---

## ✅ Testing the Fix

### Test 1: Manual Workflow Execution

1. Trigger the Email 2 workflow manually
2. Check the **🔍 Inject Tracking (Email 2)** node output
3. You should see:
   ```json
   {
     "raw": "U3ViamVjdDog...", // Different from original (tracking injected)
     "original_raw": "U3ViamVjdDog...", // Original without tracking
     "tracking_pixel_url": "https://cold-email-dashboard.vercel.app/api/track/open?...",
     "tracking_injected": true
   }
   ```

### Test 2: Decode and Verify

To verify the tracking pixel was injected:

1. Copy the **new `raw`** field value
2. In your terminal, run:
   ```bash
   echo "U3ViamVjdDog..." | base64 -d
   ```
   (Replace `U3ViamVjdDog...` with your actual raw value)

3. You should see the email content with the tracking pixel at the end:
   ```html
   Subject: Re: ...
   From: ...
   To: ...
   
   Hey Jack,<br><br>Just pushing this back up your inbox...<br><br><a href="...">Unsubscribe</a><img src="https://cold-email-dashboard.vercel.app/api/track/open?e=..." width="1" height="1" style="display:none;..." alt="" />
   ```

**✅ Success:** If you see `<img src="https://cold-email-dashboard.vercel.app/api/track/open?...` at the end!

### Test 3: Send Test Email

1. Send a test email using the workflow
2. Open the email in Gmail (or your email client)
3. Check the dashboard's email events
4. You should see an **"opened"** event when you view the email

---

## 🐛 Troubleshooting

### "raw field is empty after inject tracking"

**Cause:** Base64 encoding failed
**Fix:** Check that `inputData.raw` exists. Add debug line:
```javascript
if (!raw) throw new Error('No raw field found in input');
```

### "Tracking pixel not appearing in email"

**Cause:** HTML structure different than expected
**Fix:** Change the injection logic to always append:
```javascript
// Always append at the end (safer)
trackedBody = `${htmlBody}\n${trackingPixel}`;
```

### "Email sends but tracking doesn't work"

**Cause:** Tracking pixel URL is malformed
**Fix:** Check the output of inject tracking node - `tracking_pixel_url` should be a valid URL

### "Still seeing old output with separate fields"

**Cause:** Old inject tracking code is still there
**Fix:** Make sure you replaced the entire code in the node, not just added to it

---

## 📊 Expected Data Flow

### Before Fix:
```
Code4 → [Old Inject Tracking] → HTTP Request4
Output: { 
  raw: "..." (unchanged),
  email_2_body: "<img...>", 
  tracked_body: "<img...>" 
}
```
**Problem:** `raw` field not updated, email sent without tracking

### After Fix:
```
Code4 → [New Inject Tracking] → HTTP Request4
Output: { 
  raw: "..." (updated with tracking!),
  tracking_injected: true
}
```
**Success:** `raw` field contains tracking pixel, email tracking works!

---

## 🎯 Summary

**What Changed:**
1. New inject tracking code decodes the `raw` field
2. Injects tracking pixel into the HTML body
3. Re-encodes back to base64
4. Updates the `raw` field (not separate fields)
5. HTTP Request4 node sends the updated `raw` (no changes needed)

**Result:** Email 2 now has tracking pixels and click tracking just like Email 1 and 3!
