import { analyticsDataClient } from '@/lib/google-analytics';
import { NextRequest, NextResponse } from 'next/server';

interface OSData {
  name: string;
  value: number;
  color: string;
}

interface OSResponse {
  success: boolean;
  data: OSData[];
}

const colorMap: { [key: string]: string } = {
  'windows': '#0088fe',
  'macintosh': '#8884d8',
  'linux': '#ffbb28',
  'android': '#00c49f',
  'ios': '#ff8042',
  'other': '#cccccc',
};

const getSimpleOSName = (os: string): string => {
    const lowerOs = os.toLowerCase();
    if (lowerOs.includes('windows')) return 'windows';
    if (lowerOs.includes('mac')) return 'macintosh';
    if (lowerOs.includes('linux')) return 'linux';
    if (lowerOs.includes('android')) return 'android';
    if (lowerOs.includes('ios')) return 'ios';
    return 'other';
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
      dimensions: [{ name: 'operatingSystem' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 6,
    });

    const osData: OSData[] = response.rows?.map(row => {
      const osName = (row.dimensionValues?.[0]?.value || 'Unknown');
      const simpleName = getSimpleOSName(osName);
      const views = parseInt(row.metricValues?.[0]?.value || '0');
      return {
        name: osName,
        value: views,
        color: colorMap[simpleName] || colorMap.other,
      };
    }) || [];

    const apiResponse: OSResponse = {
      success: true,
      data: osData,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('OS analytics failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
