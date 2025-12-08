# Email 2 Workflow - Quick Fix Diagram

## 🎯 The Problem (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│ Code4 Node                                                  │
│ Generates base64 raw email                                  │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   "raw": "U3ViamVjdDog...ABC123",  ← Email without tracking│
│   "to": "test@example.com",                                │
│   "subject": "Re: Follow up"                               │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [OLD] Inject Tracking Node (BROKEN)                        │
│ Only adds separate fields, doesn't update 'raw'            │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   "raw": "U3ViamVjdDog...ABC123",  ← SAME! Not updated!   │
│   "to": "test@example.com",                                │
│   "subject": "Re: Follow up",                              │
│   "email_2_body": "<img src='tracking pixel' />",  ← NEW  │
│   "tracked_body": "<img src='tracking pixel' />",  ← NEW  │
│   "links_tracked": 0                               ← NEW  │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ HTTP Request4 Node                                          │
│ Sends email using 'raw' field                              │
│                                                             │
│ Body: { "raw": "{{ $json.raw }}" }                         │
│       Uses the OLD raw without tracking! ❌                │
└─────────────────────────────────────────────────────────────┘
                           ↓
                     Gmail sends email
              WITHOUT tracking pixel ❌
```

---

## ✅ The Solution (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│ Code4 Node                                                  │
│ Generates base64 raw email                                  │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   "raw": "U3ViamVjdDog...ABC123",  ← Email without tracking│
│   "to": "test@example.com",                                │
│   "subject": "Re: Follow up"                               │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [NEW] Inject Tracking (Email 2) Node                       │
│ 1. Decodes base64 raw → HTML                               │
│ 2. Injects tracking pixel into HTML                        │
│ 3. Re-encodes HTML → base64                                │
│ 4. Updates 'raw' field                                     │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   "raw": "U3ViamVjdDog...XYZ789",  ← NEW! With tracking ✅ │
│   "original_raw": "U3ViamVjdDog...ABC123",                 │
│   "to": "test@example.com",                                │
│   "subject": "Re: Follow up",                              │
│   "tracking_pixel_url": "https://cold-email-dashboard....", │
│   "tracking_injected": true                                │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ HTTP Request4 Node                                          │
│ Sends email using UPDATED 'raw' field                      │
│                                                             │
│ Body: { "raw": "{{ $json.raw }}" }                         │
│       Uses the NEW raw WITH tracking! ✅                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
                     Gmail sends email
               WITH tracking pixel ✅
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Track Email 2 Sent Node (HTTP Request)                     │
│ Logs event to dashboard                                    │
│                                                             │
│ Body:                                                       │
│ {                                                           │
│   "contact_email": "test@example.com",                     │
│   "campaign": "Ohio",                                      │
│   "step": 2,                                               │
│   "event_type": "sent",                                    │
│   "idempotency_key": "email_12345_test@..._step2", ← NEW  │
│   "n8n_execution_id": "12345"                      ← NEW  │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 What the Code Does (Step by Step)

### Input (from Code4):
```javascript
{
  "raw": "U3ViamVjdDogUmU6IEFyZSBhZnRlciBob3VycyBpbnF1aXJpZXMg..."
  // This is base64 encoding of:
  // "Subject: Re: Are after hours inquiries slipping through at Elber Supply?
  //  From: nishchith.m@smartieagents.online
  //  To: joshualakes@gmail.com
  //  
  //  Hey Jack,<br><br>Just pushing this back up your inbox..."
}
```

### Step 1: Decode Base64
```javascript
const raw = $json.raw;
const decodedEmail = Buffer.from(raw, 'base64').toString('utf-8');
// Result: Full RFC 2822 email as plain text
```

### Step 2: Split Headers and Body
```javascript
const [headers, ...bodyParts] = decodedEmail.split('\n\n');
let htmlBody = bodyParts.join('\n\n');

// headers = "Subject: Re: ...\nFrom: ...\nTo: ..."
// htmlBody = "Hey Jack,<br><br>Just pushing this back up..."
```

### Step 3: Inject Tracking Pixel
```javascript
const trackingPixel = `<img src="https://cold-email-dashboard.vercel.app/api/track/open?e=joshualakes@gmail.com&c=Ohio&s=2&t=..." width="1" height="1" style="display:none;" alt="" />`;

let trackedBody = htmlBody + '\n' + trackingPixel;
// Result: "Hey Jack,<br><br>Just pushing...<img src='...' />"
```

### Step 4: Rebuild Email
```javascript
const trackedEmail = `${headers}\n\n${trackedBody}`;
// Result: Full email WITH tracking pixel
```

### Step 5: Re-encode to Base64
```javascript
const newRaw = Buffer.from(trackedEmail)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

// Result: "U3ViamVjdDogUmU6IEFyZSBhZnRlciBob3Vycywg..." (different from original!)
```

### Output:
```javascript
{
  "raw": "U3ViamVjdDogUmU6IEFyZSBhZnRlciBob3Vycywg...", // UPDATED!
  "original_raw": "U3ViamVjdDogUmU6IEFyZSBhZnRlciBob3VycyBpbnF1aXJpZXMg...",
  "tracking_pixel_url": "https://cold-email-dashboard.vercel.app/api/track/open?...",
  "tracking_injected": true
}
```

---

## 📋 Copy-Paste Checklist

### ✅ Step 1: Create/Update Inject Tracking Node

1. Open **Email 2** workflow in n8n
2. Find the **Code4** node
3. Add a **Code** node after it (or update existing inject tracking node)
4. Name it: `🔍 Inject Tracking (Email 2)`
5. Copy the JavaScript code from `EMAIL_2_TRACKING_FIX.md`
6. Paste into the code editor
7. Save the node

### ✅ Step 2: Update Connections

Make sure the flow is:
```
Code4 → 🔍 Inject Tracking (Email 2) → HTTP Request4 → Track Email 2 Sent
```

### ✅ Step 3: Update Track Email 2 Sent Node

Add idempotency fields to the jsonBody:

**Find this line in the jsonBody:**
```json
  \"body\": \"{{ $('Code4').item.json.raw }}\"\n}
```

**Replace with:**
```json
  \"body\": \"{{ $('Code4').item.json.raw }}\",\n  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets8').item.json.email_address }}_step2\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

### ✅ Step 4: Test

1. Trigger the workflow manually
2. Check the inject tracking node output
3. Verify `raw` field is different from `original_raw`
4. Check email in Gmail - should have tracking pixel
5. Check dashboard - should see "opened" event

---

## 🆘 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| "raw field is empty" | Add debug: `if (!raw) throw new Error('No raw field');` |
| "Tracking pixel not in email" | Check decoded email has `<img src="https://cold-email-dashboard...` |
| "Email doesn't send" | Check HTTP Request4 node uses `{{ $json.raw }}` |
| "No tracking events" | Check tracking pixel URL is valid (should start with https://) |

---

## 🎉 Expected Result

**Before Fix:**
- Email 2 sends ✅
- Tracking pixel missing ❌
- No "opened" events ❌

**After Fix:**
- Email 2 sends ✅
- Tracking pixel injected ✅
- "Opened" events tracked ✅
- Click tracking works ✅

---

**Next:** After fixing this, update the `Track Email 2 Sent` node with idempotency fields (see `N8N_EXACT_UPDATES.md` for the exact JSON expression).
