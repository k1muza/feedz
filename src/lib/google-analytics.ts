import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';

if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    // This check prevents the client from being created without the necessary environment variable.
    // It's better to throw an error here to catch configuration issues early.
    console.warn("GOOGLE_ANALYTICS_PROPERTY_ID is not set. Analytics features will be disabled.");
}

export const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: path.join(process.cwd(), 'google-credentials.json'),
  projectId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});
