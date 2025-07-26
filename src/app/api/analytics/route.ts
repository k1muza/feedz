import { analyticsDataClient } from '@/lib/google-analytics';
import { NextRequest, NextResponse } from 'next/server';

interface AnalyticsResponse {
  success: boolean;
  data: {
    totalUsers: number;
    sessions: number;
    pageViews: number;
    bounceRate: number;
    dailyData: Array<{
      date: string;
      users: number;
      sessions: number;
      pageViews: number;
    }>;
  };
}

interface ErrorResponse {
  error: string;
}

export async function GET(request: NextRequest) {
  // Get date range from query params (default to last 30 days)
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || '30daysAgo';
  const endDate = searchParams.get('endDate') || 'today';

  console.log('Fetching analytics data for:', startDate, 'to', endDate);
  
  if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    return NextResponse.json({ error: 'Missing GOOGLE_ANALYTICS_PROPERTY_ID' }, { status: 500 });
  }
  
  try {
    // Get overview metrics
    const [overviewResponse] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' }
      ],
    });

    // Get daily breakdown
    const [dailyResponse] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    // Parse overview data
    const overviewRow = overviewResponse.rows?.[0];
    const totalUsers = parseInt(overviewRow?.metricValues?.[0]?.value || '0');
    const sessions = parseInt(overviewRow?.metricValues?.[1]?.value || '0');
    const pageViews = parseInt(overviewRow?.metricValues?.[2]?.value || '0');
    const bounceRate = parseFloat(overviewRow?.metricValues?.[3]?.value || '0');

    // Parse daily data
    const dailyData = dailyResponse.rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
    })) || [];

    const analyticsResponse: AnalyticsResponse = {
      success: true,
      data: {
        totalUsers,
        sessions,
        pageViews,
        bounceRate,
        dailyData
      }
    };

    return NextResponse.json(analyticsResponse);
  } catch (error) {
    console.error('Analytics API failed:', error);
    
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
