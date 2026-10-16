import { z } from 'zod';

import type { Invoice } from '@/types';

// Invoice validation, totals and row mapping shared by the admin web app
// (src/app/actions.ts) and the advisor MCP endpoint, so both save invoices the
// same way. Invoice numbers are assigned by the database (assign_invoice_number).

/** The only currency invoices are issued in; the PDF prints amounts in USD. */
export const INVOICE_CURRENCIES = ['USD'] as const;

/** Defaults the admin invoice form opens with. */
export const INVOICE_DEFAULTS = {
  paymentDueDays: 30,
  paymentTerms: 'Payment due within 30 days.',
  notes: 'Thank you for your business!',
} as const;

export const InvoiceItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  productId: z.string().trim().max(100).optional(),
  description: z.string().trim().min(1, 'Every line item needs a description.').max(300),
  quantity: z.coerce.number().positive('Line item quantities must be greater than zero.'),
  price: z.coerce.number().min(0, 'Line item prices cannot be negative.'),
});

export const InvoiceClientSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(60),
});

export const InvoiceSchema = z.object({
  date: z.coerce.date(),
  dueDate: z.coerce.date(),
  client: InvoiceClientSchema,
  items: z.array(InvoiceItemSchema).min(1).max(100),
  taxRate: z.coerce.number().min(0).max(1),
  transport: z.coerce.number().min(0, 'Transport cannot be negative.').default(0),
  notes: z.string().trim().max(5000).default(''),
  paymentTerms: z.string().trim().max(2000).default(''),
  bank: z.object({
    name: z.string().trim().max(160),
    accountName: z.string().trim().max(160),
    accountNumber: z.string().trim().max(100),
    branch: z.string().trim().max(160),
  }),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
}).refine((invoice) => invoice.dueDate >= invoice.date, {
  message: 'Due date cannot be before the issue date.',
  path: ['dueDate'],
});

export type ValidInvoice = z.infer<typeof InvoiceSchema>;

export type InvoiceInput = Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'totalAmount' | 'transport'> & {
  totalAmount?: number;
  transport?: number;
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  client: Invoice['client'];
  items: Invoice['items'];
  tax_rate: number | string;
  transport: number | string;
  total_amount: number | string;
  notes: string;
  payment_terms: string;
  bank: Invoice['bank'];
  status: Invoice['status'];
  created_at: string;
  updated_at: string;
};

/** Rounds to whole cents. */
export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Subtotal, transport, tax and total in cents, computed the way invoices are saved. */
export function invoiceTotals(invoice: Pick<ValidInvoice, 'items' | 'transport' | 'taxRate'>) {
  const subtotal = money(invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0));
  const transport = money(invoice.transport);
  const total = money((subtotal + transport) * (1 + invoice.taxRate));
  return { subtotal, transport, tax: money(total - subtotal - transport), total };
}

export function invoiceRow(validation: ValidInvoice) {
  const { subtotal, transport, total } = invoiceTotals(validation);
  return {
    issue_date: validation.date.toISOString().slice(0, 10),
    due_date: validation.dueDate.toISOString().slice(0, 10),
    client: validation.client,
    items: validation.items,
    tax_rate: validation.taxRate,
    subtotal,
    transport,
    total_amount: total,
    notes: validation.notes,
    payment_terms: validation.paymentTerms,
    bank: validation.bank,
    status: validation.status,
  };
}

export function rowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.issue_date,
    dueDate: row.due_date,
    client: row.client,
    items: row.items,
    taxRate: Number(row.tax_rate),
    transport: Number(row.transport),
    notes: row.notes,
    paymentTerms: row.payment_terms,
    bank: row.bank,
    totalAmount: Number(row.total_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function invoiceValidationError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(' ');
}
