import { google, sheets_v4 } from 'googleapis';
import { cacheManager, CACHE_TTL } from './cache';

// Google Sheets configuration
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1AGG05kKt9b-OAN3YGsZ-ZVDFv9fWxEjgWHDDBE2g_C8';

// Service account credentials from environment
const getCredentials = () => {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentials) {
    /* eslint-disable-next-line no-console */
    console.warn('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    return null;
  }
  try {
    return JSON.parse(credentials);
  } catch (e) {
    /* eslint-disable-next-line no-console */
    console.error('Failed to parse Google service account credentials:', e);
    return null;
  }
};

// Create authenticated Google Sheets client
export async function getGoogleSheetsClient(): Promise<sheets_v4.Sheets | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Failed to create Google Sheets client:', error);
    return null;
  }
}

// Types for sheet data
export interface SheetContact {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  linkedinUrl: string;
  title: string;
  phone: string;
  website: string;
  location: string;
}

export interface SheetEmailEvent {
  contactEmail: string;
  campaignName: string;
  step: number;
  eventType: 'sent' | 'replied' | 'opt_out';
  eventTs: Date;
}

export interface SheetRow {
  // Basic contact info (Columns A-I based on your sheet)
  firstName: string;        // A
  lastName: string;         // B  
  email: string;            // C
  company: string;          // D
  linkedinUrl: string;      // E
  title: string;            // F
  phone: string;            // G
  website: string;          // H
  location: string;         // I
  
  // Email tracking (need to identify exact columns)
  email1Sent: boolean;
  email2Sent: boolean;
  email3Sent: boolean;
  replied: boolean;
  optedOut: boolean;
  
  // Raw row data
  rawRow: string[];
}

// Column mapping - based on actual Ohio sheet structure
// These are the column indices (0-based)
const COLUMN_MAP = {
  firstName: 0,      // first_name
  lastName: 1,       // last_name
  email: 2,          // email_address
  company: 15,       // organization_name
  linkedinUrl: 3,    // linkedin_url
  title: 6,          // position
  phone: -1,         // not present
  website: 19,       // organization_website
  location: 7,       // city
  // Email tracking columns - will be identified from header row
  email1Sent: 29,    // email_1_sent
  email2Sent: 30,    // email_2_sent
  email3Sent: 31,    // email_3_sent
  replied: 32,       // replied
  optedOut: 34,      // opted_out
};

// Find column index by header name (case-insensitive, partial match)
function findColumnIndex(headers: string[], searchTerms: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = (headers[i] || '').toLowerCase().trim();
    for (const term of searchTerms) {
      if (header.includes(term.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

// Parse a row into structured data
function parseRow(row: string[], columnMap: typeof COLUMN_MAP): SheetRow {
  const getValue = (index: number): string => {
    if (index < 0 || index >= row.length) return '';
    return (row[index] || '').trim();
  };

  const isYes = (index: number): boolean => {
    const val = getValue(index).toLowerCase();
    return val === 'yes' || val === 'true' || val === '1';
  };

  return {
    firstName: getValue(columnMap.firstName),
    lastName: getValue(columnMap.lastName),
    email: getValue(columnMap.email),
    company: getValue(columnMap.company),
    linkedinUrl: getValue(columnMap.linkedinUrl),
    title: getValue(columnMap.title),
    phone: getValue(columnMap.phone),
    website: getValue(columnMap.website),
    location: getValue(columnMap.location),
    email1Sent: isYes(columnMap.email1Sent),
    email2Sent: isYes(columnMap.email2Sent),
    email3Sent: isYes(columnMap.email3Sent),
    replied: isYes(columnMap.replied),
    optedOut: isYes(columnMap.optedOut),
    rawRow: row,
  };
}

// Type for sheet data result
export type SheetDataResult = {
  rows: SheetRow[];
  campaignName: string;
  headers: string[];
} | null;

// Fetch all data from the Ohio sheet (with caching)
export async function fetchSheetData(sheetName: string = 'Ohio'): Promise<SheetDataResult> {
  // Check cache first - this is the performance optimization!
  const cacheKey = `sheets_data_${sheetName}`;
  const cachedData = cacheManager.get<SheetDataResult>(cacheKey);
  
  if (cachedData) {
    /* eslint-disable-next-line no-console */
    console.log(`[CACHE HIT] Loaded ${sheetName} sheet from cache`);
    return cachedData;
  }

  /* eslint-disable-next-line no-console */
  console.log(`[CACHE MISS] Fetching ${sheetName} sheet from Google Sheets API...`);
  const startTime = Date.now();

  const sheets = await getGoogleSheetsClient();
  if (!sheets) {
    console.warn('Google Sheets client not available');
    return null;
  }

  try {
    // Fetch the entire sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:AZ`, // Get all columns up to AZ
    });

    const values = response.data.values;
    if (!values || values.length < 2) {
      console.warn('No data found in sheet');
      return null;
    }

    // First row is headers
    const headers = values[0] as string[];
    
    // Build column map from headers
    const columnMap = { ...COLUMN_MAP };
    
    // Find email tracking columns by header names
    columnMap.email1Sent = findColumnIndex(headers, ['email_1_sent', 'email 1 sent', 'email1sent', 'first email sent']);
    columnMap.email2Sent = findColumnIndex(headers, ['email_2_sent', 'email 2 sent', 'email2sent', 'second email sent']);
    columnMap.email3Sent = findColumnIndex(headers, ['email_3_sent', 'email 3 sent', 'email3sent', 'third email sent']);
    columnMap.replied = findColumnIndex(headers, ['replied', 'reply', 'response']);
    columnMap.optedOut = findColumnIndex(headers, ['opted_out', 'opted out', 'optedout', 'opt out', 'unsubscribe', 'unsubscribed']);

    // Also try to find contact columns if they have different names
    const emailColIndex = findColumnIndex(headers, ['email_address', 'email', 'email address', 'e-mail']);
    if (emailColIndex >= 0) columnMap.email = emailColIndex;
    
    const firstNameIndex = findColumnIndex(headers, ['first name', 'firstname', 'first']);
    if (firstNameIndex >= 0) columnMap.firstName = firstNameIndex;
    
    const lastNameIndex = findColumnIndex(headers, ['last name', 'lastname', 'last']);
    if (lastNameIndex >= 0) columnMap.lastName = lastNameIndex;
    
    const companyIndex = findColumnIndex(headers, ['company', 'organization', 'org']);
    if (companyIndex >= 0) columnMap.company = companyIndex;
    
    const linkedinIndex = findColumnIndex(headers, ['linkedin', 'linkedin url', 'linkedinurl']);
    if (linkedinIndex >= 0) columnMap.linkedinUrl = linkedinIndex;

    /* eslint-disable-next-line no-console */
    console.log('Column mapping:', {
      email: columnMap.email,
      firstName: columnMap.firstName,
      lastName: columnMap.lastName,
      email1Sent: columnMap.email1Sent,
      email2Sent: columnMap.email2Sent,
      email3Sent: columnMap.email3Sent,
      replied: columnMap.replied,
      optedOut: columnMap.optedOut,
    });

    // Parse data rows (skip header)
    const rows: SheetRow[] = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i] as string[];
      const parsed = parseRow(row, columnMap);
      
      // Only include rows with valid email
      if (parsed.email && parsed.email.includes('@')) {
        rows.push(parsed);
      }
    }

    const result: SheetDataResult = {
      rows,
      campaignName: sheetName,
      headers,
    };

    // Cache the result for 5 minutes
    cacheManager.set(cacheKey, result, CACHE_TTL.MEDIUM);
    
    const duration = Date.now() - startTime;
    /* eslint-disable-next-line no-console */
    console.log(`[CACHE SET] Cached ${sheetName} sheet (${rows.length} rows) for 5 minutes. Fetch took ${duration}ms`);

    return result;
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('Failed to fetch sheet data:', error);
    return null;
  }
}

// Transform sheet data into email events for the dashboard
export function transformToEmailEvents(data: { rows: SheetRow[]; campaignName: string }): SheetEmailEvent[] {
  const events: SheetEmailEvent[] = [];
  const now = new Date();

  for (const row of data.rows) {
    if (!row.email) continue;

    // Email 1 sent
    if (row.email1Sent) {
      events.push({
        contactEmail: row.email,
        campaignName: data.campaignName,
        step: 1,
        eventType: 'sent',
        eventTs: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago placeholder
      });
    }

    // Email 2 sent
    if (row.email2Sent) {
      events.push({
        contactEmail: row.email,
        campaignName: data.campaignName,
        step: 2,
        eventType: 'sent',
        eventTs: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago placeholder
      });
    }

    // Email 3 sent
    if (row.email3Sent) {
      events.push({
        contactEmail: row.email,
        campaignName: data.campaignName,
        step: 3,
        eventType: 'sent',
        eventTs: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago placeholder
      });
    }

    // Replied
    if (row.replied) {
      events.push({
        contactEmail: row.email,
        campaignName: data.campaignName,
        step: 1,
        eventType: 'replied',
        eventTs: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago placeholder
      });
    }

    // Opted out
    if (row.optedOut) {
      events.push({
        contactEmail: row.email,
        campaignName: data.campaignName,
        step: 1,
        eventType: 'opt_out',
        eventTs: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago placeholder
      });
    }
  }

  return events;
}

// Transform sheet data into contacts for the dashboard
export function transformToContacts(data: { rows: SheetRow[]; campaignName: string }): SheetContact[] {
  return data.rows
    .filter(row => row.email && row.email.includes('@'))
    .map(row => ({
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      linkedinUrl: row.linkedinUrl,
      title: row.title,
      phone: row.phone,
      website: row.website,
      location: row.location,
    }));
}

// Calculate summary stats from sheet data
export function calculateSheetStats(data: { rows: SheetRow[]; campaignName: string }) {
  const rows = data.rows;
  
  // Count events
  let email1Sends = 0;
  let email2Sends = 0;
  let email3Sends = 0;
  let replies = 0;
  let optOuts = 0;

  for (const row of rows) {
    if (row.email1Sent) email1Sends++;
    if (row.email2Sent) email2Sends++;
    if (row.email3Sent) email3Sends++;
    if (row.replied) replies++;
    if (row.optedOut) optOuts++;
  }

  const totalSends = email1Sends + email2Sends + email3Sends;
  const uniqueContactsSent = rows.filter(r => r.email1Sent || r.email2Sent || r.email3Sent).length;

  return {
    totalContacts: rows.length,
    email1Sends,
    email2Sends,
    email3Sends,
    totalSends,
    uniqueContactsSent,
    replies,
    optOuts,
    replyRate: uniqueContactsSent > 0 ? (replies / uniqueContactsSent) * 100 : 0,
    optOutRate: uniqueContactsSent > 0 ? (optOuts / uniqueContactsSent) * 100 : 0,
    campaignName: data.campaignName,
  };
}

