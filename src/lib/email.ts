import 'server-only';

// Transactional email via Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
// Without RESEND_API_KEY, sending is skipped: enquiries are still saved and visible in /admin/inquiries.

const resendApiKey = process.env.RESEND_API_KEY;
const notifyTo = process.env.CONTACT_NOTIFY_TO || 'sales@feedsport.co.zw';
// Must be an address on a domain verified in Resend.
const notifyFrom = process.env.CONTACT_NOTIFY_FROM || 'FeedSport website <website@feedsport.co.zw>';

type Inquiry = { name: string; email: string; phone?: string | null; message: string };

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function sendInquiryNotification(inquiry: Inquiry) {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not set; skipping enquiry notification email.');
    return;
  }

  const rows: Array<[string, string]> = [
    ['Name', inquiry.name],
    ['Email', inquiry.email],
    ...(inquiry.phone ? [['Phone', inquiry.phone] as [string, string]] : []),
  ];

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    inquiry.message,
    '',
    'Reply to this email to answer the customer directly.',
  ].join('\n');

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#191b18">
  <p style="margin:0 0 12px">New enquiry from the FeedSport website.</p>
  <table style="border-collapse:collapse;margin:0 0 16px">${rows
    .map(([label, value]) => `<tr><td style="padding:4px 16px 4px 0;color:#4f524b">${label}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(value)}</td></tr>`)
    .join('')}</table>
  <div style="white-space:pre-wrap;padding:12px 14px;background:#f3f0e8;border-radius:4px">${escapeHtml(inquiry.message)}</div>
  <p style="margin:16px 0 0;color:#4f524b;font-size:13px">Reply to this email to answer the customer directly.</p>
</div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: notifyFrom,
        to: notifyTo.split(',').map((address) => address.trim()).filter(Boolean),
        reply_to: inquiry.email,
        subject: `Website enquiry from ${inquiry.name.replace(/\s+/g, ' ')}`.slice(0, 200),
        text,
        html,
      }),
    });
    if (!response.ok) {
      console.error(`Resend rejected the enquiry notification (${response.status}):`, await response.text());
    }
  } catch (error) {
    console.error('Failed to send enquiry notification:', error);
  }
}
