import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchSheetData, 
  calculateSheetStats, 
  transformToEmailEvents,
  transformToContacts 
} from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

// GET /api/sheets - Fetch data from Google Sheets
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sheetName = searchParams.get('sheet') || 'Ohio';
  const format = searchParams.get('format') || 'stats'; // stats, events, contacts, raw

  try {
    const data = await fetchSheetData(sheetName);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch sheet data. Check Google Sheets credentials.' },
        { status: 500 }
      );
    }

    switch (format) {
      case 'stats':
        return NextResponse.json({
          success: true,
          stats: calculateSheetStats(data),
          headers: data.headers,
        });

      case 'events':
        return NextResponse.json({
          success: true,
          events: transformToEmailEvents(data),
          count: transformToEmailEvents(data).length,
        });

      case 'contacts':
        return NextResponse.json({
          success: true,
          contacts: transformToContacts(data),
          count: transformToContacts(data).length,
        });

      case 'raw':
        return NextResponse.json({
          success: true,
          rows: data.rows.slice(0, 100), // Limit to first 100 for raw view
          totalRows: data.rows.length,
          headers: data.headers,
        });

      default:
        return NextResponse.json({
          success: true,
          stats: calculateSheetStats(data),
        });
    }
  } catch (error) {
    console.error('Sheets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

