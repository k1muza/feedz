import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

interface TrafficSourcesResponse {
  success: boolean;
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: path.join(process.cwd(), 'google-credentials.json'),
  projectId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

const colorMap: { [key: string]: string } = {
  'direct': '#8884d8',
  'organic': '#82ca9d',
  'referral': '#ffc658',
  'social': '#ff8042',
  'email': '#0088fe',
  'paid': '#00c49f',
  'other': '#ffbb28',
};

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
      dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ 
        metric: { metricName: 'sessions' },
        desc: true 
      }],
    });

    const trafficSources = response.rows?.map((row, index) => {
      const channelName = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0');
      
      // Map channel names to simpler names
      let simpleName = channelName.toLowerCase();
      if (channelName.includes('Organic')) simpleName = 'organic';
      else if (channelName.includes('Direct')) simpleName = 'direct';
      else if (channelName.includes('Referral')) simpleName = 'referral';
      else if (channelName.includes('Social')) simpleName = 'social';
      else if (channelName.includes('Email')) simpleName = 'email';
      else if (channelName.includes('Paid')) simpleName = 'paid';
      else simpleName = 'other';

      return {
        name: channelName,
        value: sessions,
        color: colorMap[simpleName] || colorMap.other,
      };
    }) || [];

    const apiResponse: TrafficSourcesResponse = {
      success: true,
      data: trafficSources,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Traffic sources analytics failed:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
