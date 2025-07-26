
import { analyticsDataClient } from '@/lib/google-analytics';
import { NextRequest, NextResponse } from 'next/server';

interface BrowserData {
  name: string;
  value: number;
  color: string;
}

interface BrowserResponse {
  success: boolean;
  data: BrowserData[];
}

const colorMap: { [key: string]: string } = {
  'chrome': '#4285F4',
  'safari': '#5E5CE6',
  'firefox': '#FF7139',
  'edge': '#0078D7',
  'samsung internet': '#7E57C2',
  'opera': '#FF1B2D',
  'other': '#cccccc',
};

const getSimpleBrowserName = (browser: string): string => {
    const lowerBrowser = browser.toLowerCase();
    if (lowerBrowser.includes('chrome')) return 'chrome';
    if (lowerBrowser.includes('safari')) return 'safari';
    if (lowerBrowser.includes('firefox')) return 'firefox';
    if (lowerBrowser.includes('edge')) return 'edge';
    if (lowerBrowser.includes('samsung')) return 'samsung internet';
    if (lowerBrowser.includes('opera')) return 'opera';
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
      dimensions: [{ name: 'browser' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 6,
    });

    const browserData: BrowserData[] = response.rows?.map(row => {
      const browserName = (row.dimensionValues?.[0]?.value || 'Unknown');
      const simpleName = getSimpleBrowserName(browserName);
      const views = parseInt(row.metricValues?.[0]?.value || '0');
      return {
        name: browserName,
        value: views,
        color: colorMap[simpleName] || colorMap.other,
      };
    }) || [];

    const apiResponse: BrowserResponse = {
      success: true,
      data: browserData,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Browser analytics failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
