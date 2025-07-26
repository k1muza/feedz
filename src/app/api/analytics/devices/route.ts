import { analyticsDataClient } from '@/lib/google-analytics';
import { NextRequest, NextResponse } from 'next/server';

interface DeviceData {
  name: string;
  value: number;
  color: string;
}

interface DevicesResponse {
  success: boolean;
  data: DeviceData[];
}

const colorMap: { [key: string]: string } = {
  'desktop': '#8884d8',
  'mobile': '#82ca9d',
  'tablet': '#ffc658',
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
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    });

    const devicesData: DeviceData[] = response.rows?.map(row => {
      const deviceName = (row.dimensionValues?.[0]?.value || 'Unknown').toLowerCase();
      const views = parseInt(row.metricValues?.[0]?.value || '0');
      return {
        name: deviceName.charAt(0).toUpperCase() + deviceName.slice(1),
        value: views,
        color: colorMap[deviceName] || '#cccccc',
      };
    }) || [];

    const apiResponse: DevicesResponse = {
      success: true,
      data: devicesData,
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Device analytics failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
