import { BetaAnalyticsDataClient } from '@google-analytics/data';

if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    console.warn("GOOGLE_ANALYTICS_PROPERTY_ID is not set. Analytics features will be disabled.");
}

if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn("GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY is not set. Analytics features will be disabled.");
}

// The private key from the JSON file has newline characters (\n).
// When storing it in an environment variable, these can be lost or encoded.
// The common practice is to replace them with a literal `\\n` in your .env file
// and then replace them back to `\n` in the code.
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
    },
});
