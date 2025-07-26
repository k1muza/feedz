import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

interface TopPagesResponse {
  success: boolean;
  data: Array<{
    page: string;
    views: number;
  }>;
}

const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: path.join(process.cwd(), 'google-credentials.json'),
  projectId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || '7daysAgo';
  const endDate = searchParams.get('endDate') || 'today';

  if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    return NextResponse.json({ error: 'Missing GOOGLE_ANALYTICS_PROPERTY_ID' }, { status: 500 });
  }
  
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'unifiedPagePathScreen' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ 
        metric: { metricName: 'screenPageViews' },
        desc: true 
      }],
      limit: 10,
    });

    const topPages = response.rows?.map(row => ({
      page: row.dimensionValues?.[0]?.value || 'Unknown',
      views: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    const apiResponse: TopPagesResponse = {
      success: true,
      data: topPages,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Top pages analytics failed:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
