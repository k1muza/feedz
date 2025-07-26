import { analyticsDataClient } from '@/lib/google-analytics';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Set up Server-Sent Events headers
  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  };

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Real-time analytics stream connected' 
      })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Function to fetch and send analytics data
      const sendAnalyticsData = async () => {
        try {
          if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
            return;
          }

          const [activeUsersResponse] = await analyticsDataClient.runRealtimeReport({
            property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
            metrics: [{ name: 'activeUsers' }],
          });

          const activeUsers = parseInt(activeUsersResponse.rows?.[0]?.metricValues?.[0]?.value || '0');

          // Try to get page-level data
          let topPages: Array<{ page: string; users: number }> = [];
          try {
            const [pageResponse] = await analyticsDataClient.runRealtimeReport({
              property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
              dimensions: [{ name: 'unifiedPagePathScreen' }],
              metrics: [{ name: 'activeUsers' }],
              orderBys: [{ 
                metric: { metricName: 'activeUsers' },
                desc: true 
              }],
              limit: 6,
            });

            topPages = pageResponse.rows?.map(row => ({
              page: row.dimensionValues?.[0]?.value || 'Unknown',
              users: parseInt(row.metricValues?.[0]?.value || '0'),
            })) || [];
          } catch (pageError) {
            // Use empty array if page data fails
            topPages = [];
          }

          const data = {
            type: 'analytics-update',
            timestamp: new Date().toISOString(),
            data: {
              activeUsers,
              topPages,
            }
          };

          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));

        } catch (error) {
          console.error('Error fetching analytics data:', error);
          const errorMessage = `data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Failed to fetch analytics data' 
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        }
      };

      // Send initial data immediately
      sendAnalyticsData();

      // Set up interval to send updates every 15 seconds
      intervalId = setInterval(sendAnalyticsData, 15000);
    },

    cancel() {
      // Clean up interval when client disconnects
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  });

  return new Response(stream, { headers: responseHeaders });
}
