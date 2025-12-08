# Email 2 Tracking Fix - Documentation

## Problem Summary

The Email 2 workflow uses an **HTTP Request node** to send emails via Gmail API, which requires a base64-encoded RFC 2822 email format in the `raw` field. The original tracking injector was designed for regular Gmail nodes with plain HTML bodies, so it wasn't properly injecting tracking pixels into the `raw` field.

### What Was Happening Before:

1. **Code4 node** generates the base64 `raw` email
2. **Inject Tracking node** (old version) would output `tracked_body` but NOT update the `raw` field
3. **HTTP Request4** would send the email using the OLD `raw` field WITHOUT tracking
4. Result: **No tracking pixels in sent emails** ❌

## Solution Implemented

Created a **specialized tracking injector** specifically for Email 2's raw format:

### New Flow:
```
Code4 → 🔍 Inject Tracking → HTTP Request4 → Track Email 2 Sent → Google Sheets10
```

### What the New "🔍 Inject Tracking" Node Does:

1. **Takes the base64 `raw` field** from Code4
2. **Decodes it** from base64url to UTF-8 text
3. **Splits headers and body** (RFC 2822 format)
4. **Generates tracking pixel**:
   ```html
   <img src="https://cold-email-dashboard.vercel.app/api/track/open?e=email&c=Ohio&s=2&t=token" width="1" height="1" style="display:none;" />
   ```
5. **Injects pixel** into the HTML body (before `</body>`, `</html>`, or at the end)
6. **Reconstructs the email** with headers + tracked body
7. **Re-encodes to base64url**
8. **Outputs updated `raw` field** ✅

### Key Changes Made:

#### 1. Added New Tracking Injector Node
- **Node Name**: `🔍 Inject Tracking`
- **Node ID**: `inject-tracking-email-2`
- **Position**: Between Code4 and HTTP Request4
- **Functionality**: Decodes → Injects → Re-encodes the raw email

#### 2. Updated Code4 Node
Added `email_2_body` to output for reference:
```javascript
json: {
  raw,
  ...(threadId ? { threadId } : {}),
  to: recipientEmail,
  subject: subj2,
  email_2_body: body2,  // ← NEW: For reference
}
```

#### 3. Updated Connections
```json
Code4 → 🔍 Inject Tracking → HTTP Request4
```

#### 4. Updated "Track Email 2 Sent" Node
Changed the body field to use the tracked body:
```javascript
// OLD:
"body": "{{ $('Code4').item.json.raw }}"

// NEW:
"body": "{{ $('🔍 Inject Tracking').item.json.tracked_body }}"
```

## Tracking Pixel Details

### Tracking Pixel URL Format:
```
https://cold-email-dashboard.vercel.app/api/track/open
  ?e={contact_email}
  &c=Ohio
  &s=2
  &t={contact_email}-2-{timestamp}
```

### Parameters:
- `e` = Contact email address
- `c` = Campaign name ("Ohio")
- `s` = Step number (2 for Email 2)
- `t` = Unique token for deduplication

### Tracking Pixel HTML:
```html
<img src="{tracking_url}" 
     width="1" 
     height="1" 
     style="display:none;width:1px;height:1px;border:0;" 
     alt="" />
```

## Output Data Structure

The new tracking injector outputs:

```json
{
  "raw": "U3ViamVjdDogUmU6...",           // ✅ UPDATED with tracking
  "to": "contact@example.com",
  "subject": "Re: Subject",
  "email_2_body": "Original body...",
  "original_raw": "U3ViamVjdDogUmU6...", // Original without tracking
  "tracked_body": "Body with <img...",   // Decoded tracked body
  "tracking_pixel_url": "https://...",   // Pixel URL
  "tracking_token": "encoded-token"      // Unique token
}
```

## Testing the Fix

### To verify tracking is working:

1. **Check the workflow execution** in n8n
2. **Inspect the output** of "🔍 Inject Tracking" node
3. **Verify** that:
   - `raw` field is different from `original_raw`
   - `tracked_body` contains the `<img>` tracking pixel
   - `tracking_pixel_url` is properly formatted

4. **Send a test email** and:
   - Open it in your email client
   - Check network requests (browser dev tools)
   - Verify a request to `/api/track/open` was made
   - Check the dashboard to see if the open event was recorded

### Expected Behavior:
- ✅ Emails should have tracking pixel in HTML
- ✅ Opening the email triggers `/api/track/open` API call
- ✅ Dashboard shows "opened" event for the contact
- ✅ Tracking is properly deduped using the unique token

## Important Notes

1. **Do NOT modify Code4** further - it generates the base email correctly
2. **The tracking injector MUST remain** between Code4 and HTTP Request4
3. **The `raw` field is critical** - HTTP Request4 uses it to send the email
4. **Tracking is automatic** - no manual steps needed once workflow is active
5. **Deduplication** - Each email gets a unique token to prevent duplicate tracking

## Future Improvements

If you need to add **click tracking** to Email 2:

1. Modify the "🔍 Inject Tracking" node
2. Add link wrapping logic (similar to the tracking injector template)
3. Use `/api/track/click` endpoint

## Related Files

- `cold-email-system/Email 2.json` - The updated workflow
- `app/api/track/open/route.ts` - Open tracking API endpoint
- `app/api/track/click/route.ts` - Click tracking API endpoint
- `cold-email-system/Email Tracking Injector.json` - Original template

---

## Summary

✅ **Fixed**: Tracking pixel now properly injected into Email 2's base64 raw format  
✅ **How**: New specialized tracking injector decodes, injects, and re-encodes the raw email  
✅ **Result**: Email 2 tracking now works exactly like Email 1 and Email 3  

The workflow is now **production-ready** and tracking should work seamlessly! 🎉

