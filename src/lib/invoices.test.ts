import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InvoiceSchema, invoiceRow, invoiceTotals, rowToInvoice, type InvoiceRow } from './invoices';

// The admin web app saves invoices through these helpers (src/app/actions.ts);
// the advisor MCP endpoint reuses them. These pin the rows the web form's
// payloads produce, so sharing them cannot change how web invoices are saved.

/** What InvoiceForm submits: tax as a fraction, ISO timestamps, its own (ignored) total. */
const webPayload = {
  date: '2026-10-16T09:30:00.000Z',
  dueDate: '2026-11-15T09:30:00.000Z',
  client: { name: ' ABC Farms ', email: 'orders@abcfarms.co.zw', address: '12 Mutare Road', city: 'Harare', phone: '+263 77 000 0000' },
  items: [
    { id: 'a', productId: 'wheat-bran', description: 'Wheat bran (40 kg)', quantity: 25, price: 9.6 },
    { id: 'b', productId: '', description: 'Maize (50 kg)', quantity: '3', price: '17.555' },
  ],
  taxRate: 0.15,
  transport: 80,
  notes: 'Thank you for your business!',
  paymentTerms: 'Payment due within 30 days.',
  bank: { name: 'CBZ', accountName: 'FeedSport Enterprises', accountNumber: '0123', branch: 'Kwame Nkrumah' },
  status: 'draft',
  totalAmount: 999999,
};

describe('web invoice saving', () => {
  it('saves the web form payload as before', () => {
    const parsed = InvoiceSchema.parse(webPayload);
    assert.deepEqual(invoiceRow(parsed), {
      issue_date: '2026-10-16',
      due_date: '2026-11-15',
      client: { name: 'ABC Farms', email: 'orders@abcfarms.co.zw', address: '12 Mutare Road', city: 'Harare', phone: '+263 77 000 0000' },
      items: [
        { id: 'a', productId: 'wheat-bran', description: 'Wheat bran (40 kg)', quantity: 25, price: 9.6 },
        { id: 'b', productId: '', description: 'Maize (50 kg)', quantity: 3, price: 17.555 },
      ],
      tax_rate: 0.15,
      // 240 + 52.665 = 292.665 → 292.67; (292.67 + 80) × 1.15 = 428.5705 → 428.57
      subtotal: 292.67,
      transport: 80,
      total_amount: 428.57,
      notes: 'Thank you for your business!',
      payment_terms: 'Payment due within 30 days.',
      bank: { name: 'CBZ', accountName: 'FeedSport Enterprises', accountNumber: '0123', branch: 'Kwame Nkrumah' },
      status: 'draft',
    });
  });

  it('ignores the total the client sends', () => {
    assert.equal(invoiceRow(InvoiceSchema.parse(webPayload)).total_amount, 428.57);
  });

  it('defaults a missing transport charge to zero, as invoices made before transport existed', () => {
    const { transport: _transport, ...withoutTransport } = webPayload;
    const row = invoiceRow(InvoiceSchema.parse({ ...withoutTransport, taxRate: 0 }));
    assert.equal(row.transport, 0);
    assert.equal(row.total_amount, 292.67);
  });

  it('keeps the existing validation messages', () => {
    const result = InvoiceSchema.safeParse({ ...webPayload, dueDate: '2026-10-01', items: [{ ...webPayload.items[0], quantity: 0 }] });
    assert.equal(result.success, false);
    const messages = result.error!.issues.map((issue) => issue.message);
    assert.ok(messages.includes('Line item quantities must be greater than zero.'));
    const backwards = InvoiceSchema.safeParse({ ...webPayload, dueDate: '2026-10-01' });
    assert.deepEqual(backwards.error?.issues.map((issue) => issue.message), ['Due date cannot be before the issue date.']);
  });

  it('reports totals that add up to the saved total', () => {
    const totals = invoiceTotals(InvoiceSchema.parse(webPayload));
    assert.deepEqual(totals, { subtotal: 292.67, transport: 80, tax: 55.9, total: 428.57 });
    assert.equal(Math.round((totals.subtotal + totals.transport + totals.tax) * 100), Math.round(totals.total * 100));
  });

  it('reads rows back as before', () => {
    const row: InvoiceRow = {
      id: 'x',
      invoice_number: 'INV-20261016-01',
      issue_date: '2026-10-16',
      due_date: '2026-11-15',
      client: webPayload.client,
      items: [],
      tax_rate: '0.150000',
      transport: '80.00',
      total_amount: '428.57',
      notes: '',
      payment_terms: '',
      bank: webPayload.bank,
      status: 'sent',
      created_at: 'c',
      updated_at: 'u',
    };
    const invoice = rowToInvoice(row);
    assert.equal(invoice.taxRate, 0.15);
    assert.equal(invoice.transport, 80);
    assert.equal(invoice.totalAmount, 428.57);
    assert.equal(invoice.invoiceNumber, 'INV-20261016-01');
  });
});
