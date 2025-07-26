import { analyticsDataClient } from '@/lib/google-analytics';
import { NextRequest, NextResponse } from 'next/server';

interface CountriesResponse {
  success: boolean;
  data: Array<{
    country: string;
    users: number;
  }>;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || '30daysAgo';
  const endDate = searchParams.get('endDate') || 'today';

  if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    return NextResponse.json({ error: 'Missing GOOGLE_ANALYTICS_PROPERTY_ID' }, { status: 500 });
  }
  
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ 
        metric: { metricName: 'totalUsers' },
        desc: true 
      }],
      limit: 10,
    });

    const countries = response.rows?.map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    const apiResponse: CountriesResponse = {
      success: true,
      data: countries,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Countries analytics failed:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
