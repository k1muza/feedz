/**
 * Invoices and proforma invoices for FeedSport admins, through the advisor MCP
 * endpoint. Invoices are validated, totalled and saved with the same code as
 * the admin web app (src/lib/invoices.ts), numbered by the database, and
 * rendered by the same PDF template.
 *
 * Only admin sign-ins get these tools, and their store runs as the signed-in
 * admin, so the invoices table's row-level security applies as it does on the
 * web. Through MCP an admin can create proformas and invoices, edit proformas,
 * and turn a proforma into an invoice; finalised invoices, payments, sending
 * and deleting stay in the web app.
 */
import { createHash, randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  INVOICE_CURRENCIES,
  INVOICE_DEFAULTS,
  InvoiceClientSchema,
  InvoiceSchema,
  invoiceRow,
  invoiceTotals,
  invoiceValidationError,
  money,
  rowToInvoice,
  type InvoiceRow,
} from "@/lib/invoices";
import { invoiceDocumentTitle, invoicePdfFilename, renderInvoicePdf } from "@/lib/invoice-pdf";
import { formatKg, packLabel } from "@/lib/product-units";
import type { ClientInfo, Invoice, InvoiceItem } from "@/types";

import { FeedSportInputError } from "./feedsport-service";

// ---------------------------------------------------------------------------
// Storage

export type InvoiceStatus = Invoice["status"];
export type InvoiceWrite = ReturnType<typeof invoiceRow>;

export interface StoredInvoice extends Invoice {
  /** Hash of the create_invoice request that made it; null for invoices made in the web app. */
  idempotencyHash?: string | null;
}

export interface InvoiceProduct {
  id: string;
  name: string;
  searchTerms: string[];
  /** Price of one pack of packSizeKg. */
  price: number;
  currency: string;
  packSizeKg: number;
}

export interface InvoiceClientRecord {
  client: ClientInfo;
  issueDate: string;
  createdAt: string;
}

export interface InvoiceStore {
  /** Newest first. */
  list(filter: { statuses?: InvoiceStatus[]; dateFrom?: string; dateTo?: string; limit: number }): Promise<StoredInvoice[]>;
  get(id: string): Promise<StoredInvoice | null>;
  getByNumber(invoiceNumber: string): Promise<StoredInvoice | null>;
  getByIdempotencyKey(key: string): Promise<StoredInvoice | null>;
  /** Inserts the invoice. When the key is already taken (a concurrent retry) it returns the invoice that holds it instead. */
  create(row: InvoiceWrite, idempotency: { key: string; hash: string }): Promise<{ invoice: StoredInvoice; created: boolean }>;
  /** Applies the change only while the invoice still has `expected.status` (and `expected.updatedAt`, when given); null otherwise. */
  update(id: string, row: Partial<InvoiceWrite>, expected: { status: InvoiceStatus; updatedAt?: string }): Promise<StoredInvoice | null>;
  /** The customer on every invoice. */
  listClients(): Promise<InvoiceClientRecord[]>;
  listProducts(): Promise<InvoiceProduct[]>;
}

export interface InvoiceAccess {
  store: InvoiceStore;
  /** The admin the store acts as; idempotency keys are scoped to them. */
  userId: string;
  /** A short-lived download URL for the invoice's PDF, or null when links are not configured. */
  pdfLink(invoiceId: string): { url: string; expiresAt: string } | null;
  /** Today's date (YYYY-MM-DD) in FeedSport's time zone. */
  today?: () => string;
}

type StoredRow = InvoiceRow & { idempotency_hash?: string | null };

const fromRow = (row: StoredRow): StoredInvoice => ({ ...rowToInvoice(row), idempotencyHash: row.idempotency_hash ?? null });

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Reads and writes public.invoices as the signed-in user, so row-level security limits it to admins. */
export function createSupabaseInvoiceStore(supabase: SupabaseClient): InvoiceStore {
  const one = async (column: string, value: string) => {
    const row = check(await supabase.from("invoices").select("*").eq(column, value).maybeSingle()) as StoredRow | null;
    return row ? fromRow(row) : null;
  };
  return {
    async list({ statuses, dateFrom, dateTo, limit }) {
      let query = supabase.from("invoices").select("*");
      if (statuses?.length) query = query.in("status", statuses);
      if (dateFrom) query = query.gte("issue_date", dateFrom);
      if (dateTo) query = query.lte("issue_date", dateTo);
      const rows = check(await query.order("issue_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit)) as StoredRow[];
      return rows.map(fromRow);
    },
    get: (id) => one("id", id),
    getByNumber: (invoiceNumber) => one("invoice_number", invoiceNumber),
    getByIdempotencyKey: (key) => one("idempotency_key", key),
    async create(row, idempotency) {
      const result = await supabase
        .from("invoices")
        .insert({ ...row, idempotency_key: idempotency.key, idempotency_hash: idempotency.hash })
        .select("*")
        .single();
      const error = result.error as { code?: string; message: string; details?: string } | null;
      if (error?.code === "23505" && /idempotency/.test(`${error.message} ${error.details ?? ""}`)) {
        const existing = await one("idempotency_key", idempotency.key);
        if (existing) return { invoice: existing, created: false };
      }
      return { invoice: fromRow(check(result) as StoredRow), created: true };
    },
    async update(id, row, expected) {
      let query = supabase.from("invoices").update(row).eq("id", id).eq("status", expected.status);
      if (expected.updatedAt) query = query.eq("updated_at", expected.updatedAt);
      const updated = check(await query.select("*").maybeSingle()) as StoredRow | null;
      return updated ? fromRow(updated) : null;
    },
    async listClients() {
      const rows = check(await supabase.from("invoices").select("client, issue_date, created_at")) as { client: ClientInfo; issue_date: string; created_at: string }[];
      return rows.map((row) => ({ client: row.client, issueDate: row.issue_date, createdAt: row.created_at }));
    },
    async listProducts() {
      const rows = check(await supabase.from("products").select("id, name, search_terms, price, currency, pack_size_kg").order("name")) as {
        id: string;
        name: string;
        search_terms: string[] | null;
        price: number | string;
        currency: string;
        pack_size_kg: number | string;
      }[];
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        searchTerms: row.search_terms ?? [],
        price: Number(row.price),
        currency: row.currency,
        packSizeKg: Number(row.pack_size_kg),
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// Views

export const INVOICE_TYPES = ["proforma", "standard"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

/** A draft is issued as a proforma invoice; once sent it is a standard invoice. */
const typeOf = (status: InvoiceStatus): InvoiceType => (status === "draft" ? "proforma" : "standard");
const STATUS_FOR_TYPE: Record<InvoiceType, InvoiceStatus> = { proforma: "draft", standard: "sent" };
const STATUS_LABEL: Record<InvoiceStatus, string> = { draft: "Proforma", sent: "Awaiting payment", paid: "Paid", void: "Void" };

/** Stable id for a customer, from their name: "ABC Farms (Pvt) Ltd" → "abc-farms-pvt-ltd". */
export function customerId(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isoDate = (value: Invoice["date"]) =>
  typeof value === "string" ? value.slice(0, 10) : new Date(value.seconds * 1000).toISOString().slice(0, 10);

const lineItemView = (item: InvoiceItem, index: number) => ({
  line: index + 1,
  description: item.description,
  product_id: item.productId || null,
  quantity: item.quantity,
  unit_price: item.price,
  amount: money(item.quantity * item.price),
});

function totalsView(invoice: Pick<Invoice, "items" | "transport" | "taxRate">) {
  const totals = invoiceTotals({ items: invoice.items, transport: invoice.transport ?? 0, taxRate: invoice.taxRate });
  return {
    subtotal: totals.subtotal,
    transport: totals.transport,
    tax_rate_percent: Number((invoice.taxRate * 100).toFixed(4)),
    tax: totals.tax,
    total: totals.total,
  };
}

/** An invoice as MCP clients see it. Bank account details are never included. */
export function invoiceView(invoice: Invoice) {
  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    type: typeOf(invoice.status),
    document_title: invoiceDocumentTitle(invoice),
    status: invoice.status,
    status_label: STATUS_LABEL[invoice.status],
    editable: invoice.status === "draft",
    customer: { customer_id: customerId(invoice.client.name), ...invoice.client },
    currency: INVOICE_CURRENCIES[0],
    issue_date: isoDate(invoice.date),
    due_date: isoDate(invoice.dueDate),
    line_items: invoice.items.map(lineItemView),
    totals: totalsView(invoice),
    payment_terms: invoice.paymentTerms,
    notes: invoice.notes,
    payment_details_on_invoice: Object.values(invoice.bank ?? {}).some((value) => String(value ?? "").trim()),
    created_at: invoice.createdAt ?? null,
    updated_at: invoice.updatedAt ?? null,
  };
}

const summaryView = (invoice: Invoice) => ({
  invoice_id: invoice.id,
  invoice_number: invoice.invoiceNumber,
  type: typeOf(invoice.status),
  status: invoice.status,
  editable: invoice.status === "draft",
  customer_id: customerId(invoice.client.name),
  customer: invoice.client.name,
  issue_date: isoDate(invoice.date),
  due_date: isoDate(invoice.dueDate),
  total: totalsView(invoice).total,
  currency: INVOICE_CURRENCIES[0],
});

// ---------------------------------------------------------------------------
// Input handling

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const decimals = (value: number) => {
  const [, fraction = ""] = String(value).split("e")[0].split(".");
  return /e-/.test(String(value)) ? Infinity : fraction.length;
};
function requirePrecision(value: number, places: number, what: string) {
  if (decimals(value) > places) throw new FeedSportInputError(`${what} can have at most ${places} decimal places (got ${value}).`);
}

const DAY_MS = 86_400_000;
function validDate(value: string, what: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new FeedSportInputError(`${what} must be a real date in YYYY-MM-DD format (got "${value}").`);
  }
  return value;
}
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Today in Harare, where FeedSport issues invoices. */
export const harareToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(new Date());

/** JSON with sorted keys, so equal requests hash equally. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
const requestHash = (args: unknown) => createHash("sha256").update(canonical(args)).digest("hex");

export type CustomerInput = Partial<ClientInfo>;

export type LineItemInput = {
  description?: string;
  product?: string;
  quantity: number;
  unit?: "tonne" | "kg" | "bag" | "each";
  bag_size_kg?: number;
  unit_price?: number;
};

export type InvoiceFieldsInput = {
  customer_id?: string;
  customer?: CustomerInput;
  line_items?: LineItemInput[];
  transport?: number;
  tax_rate_percent?: number;
  currency?: (typeof INVOICE_CURRENCIES)[number];
  issue_date?: string;
  due_date?: string;
  payment_due_days?: number;
  payment_terms?: string;
  notes?: string;
};

export type CreateInvoiceInput = InvoiceFieldsInput & { type?: InvoiceType; idempotency_key: string; dry_run?: boolean };
export type UpdateInvoiceInput = InvoiceFieldsInput & { invoice: string; dry_run?: boolean };

type Customer = { customer_id: string; client: ClientInfo; invoice_count: number; last_invoice_date: string; emails: string[] };

async function customers(store: InvoiceStore): Promise<Customer[]> {
  const byId = new Map<string, { latest: InvoiceClientRecord; count: number; emails: Set<string> }>();
  for (const record of await store.listClients()) {
    const id = customerId(record.client?.name ?? "");
    if (!id) continue;
    const entry = byId.get(id);
    const email = record.client.email?.trim().toLowerCase();
    if (!entry) {
      byId.set(id, { latest: record, count: 1, emails: new Set(email ? [email] : []) });
      continue;
    }
    entry.count += 1;
    if (email) entry.emails.add(email);
    const newer = record.issueDate > entry.latest.issueDate || (record.issueDate === entry.latest.issueDate && record.createdAt > entry.latest.createdAt);
    if (newer) entry.latest = record;
  }
  return [...byId.entries()]
    .map(([id, { latest, count, emails }]) => ({ customer_id: id, client: latest.client, invoice_count: count, last_invoice_date: latest.issueDate, emails: [...emails] }))
    .sort((a, b) => a.client.name.localeCompare(b.client.name));
}

const definedFields = (customer: CustomerInput | undefined) =>
  Object.fromEntries(Object.entries(customer ?? {}).filter(([, value]) => value !== undefined)) as CustomerInput;

/** The billed customer: an existing one (with any corrected details), or a new one that does not duplicate an existing one. */
async function resolveCustomer(store: InvoiceStore, input: Pick<InvoiceFieldsInput, "customer_id" | "customer">, current?: ClientInfo): Promise<ClientInfo | undefined> {
  const details = definedFields(input.customer);
  if (input.customer_id) {
    const known = (await customers(store)).find((c) => c.customer_id === input.customer_id);
    if (!known) throw new FeedSportInputError(`No customer has id "${input.customer_id}". Use list_customers to find the customer_id.`);
    return { ...known.client, ...details };
  }
  if (!Object.keys(details).length) return current;

  const name = details.name ?? current?.name ?? "";
  const renamed = !current || customerId(name) !== customerId(current.name);
  const email = details.email?.trim().toLowerCase();
  if (renamed || (email && email !== current?.email.trim().toLowerCase())) {
    const matches = (await customers(store)).filter(
      (c) => (renamed && c.customer_id === customerId(name)) || (!!email && c.emails.includes(email) && (!current || c.customer_id !== customerId(current.name))),
    );
    if (matches.length) {
      const list = matches.map((c) => `"${c.client.name}" (customer_id "${c.customer_id}", ${c.client.email})`).join(", ");
      throw new FeedSportInputError(
        `This matches an existing customer: ${list}. Pass customer_id to bill them (with any corrected details in customer) instead of creating a duplicate customer.`,
      );
    }
  }

  const client = { ...current, ...details };
  const parsed = InvoiceClientSchema.safeParse(client);
  if (!parsed.success) {
    const missing = (["name", "email", "address", "city", "phone"] as const).filter((field) => !String(client[field] ?? "").trim());
    throw new FeedSportInputError(
      missing.length
        ? `A new customer needs ${missing.join(", ")}. Ask the user for ${missing.length === 1 ? "it" : "them"}, or pass customer_id for an existing customer.`
        : `Customer details are not valid: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}.`,
    );
  }
  return parsed.data;
}

function findProduct(products: InvoiceProduct[], reference: string) {
  const wanted = reference.trim().toLowerCase();
  const exact = products.filter(
    (p) => p.id.toLowerCase() === wanted || p.name.toLowerCase() === wanted || p.searchTerms.some((term) => term.toLowerCase() === wanted),
  );
  if (exact.length === 1) return exact[0];
  const candidates = exact.length ? exact : products.filter((p) => p.name.toLowerCase().includes(wanted) || p.id.includes(customerId(reference)));
  const hint = candidates.length
    ? ` Did you mean ${candidates.slice(0, 8).map((p) => `"${p.id}" (${p.name})`).join(", ")}?`
    : " Omit product and describe the item instead, or check the FeedSport product catalogue.";
  throw new FeedSportInputError(`${exact.length ? "More than one" : "No"} catalogue product matches "${reference}".${hint}`);
}

const UNIT_KG = { tonne: 1000, kg: 1 } as const;

function lineItem(input: LineItemInput, index: number, products: InvoiceProduct[], currency: string): InvoiceItem {
  const where = `Line ${index + 1}`;
  requirePrecision(input.quantity, 3, `${where} quantity`);
  if (input.unit_price !== undefined) requirePrecision(input.unit_price, 2, `${where} unit_price`);
  if (input.bag_size_kg !== undefined && input.unit !== "bag") throw new FeedSportInputError(`${where}: bag_size_kg only applies when unit is "bag".`);

  const product = input.product ? findProduct(products, input.product) : undefined;
  if (input.unit === "bag" && input.bag_size_kg === undefined && !(product && product.packSizeKg < 1000)) {
    throw new FeedSportInputError(`${where}: give bag_size_kg for unit "bag" (e.g. 50 for 50 kg bags).`);
  }
  // Quantities count units of this size; "each" and plain descriptions have none.
  const unitKg =
    input.unit === "bag" ? (input.bag_size_kg ?? product!.packSizeKg) : input.unit === "tonne" || input.unit === "kg" ? UNIT_KG[input.unit] : input.unit === "each" ? undefined : product?.packSizeKg;
  // Units are shown the way the admin form describes catalogue products: "Wheat bran (1 tonne)", "Soybean meal (50 kg)".
  const label = unitKg ? formatKg(unitKg) : undefined;
  const base = input.description?.trim() || product?.name;
  if (!base) throw new FeedSportInputError(`${where} needs a description or a catalogue product.`);
  const description = label && !base.includes(label) ? `${base} (${label})` : base;

  let price = input.unit_price;
  if (price === undefined) {
    if (!product) throw new FeedSportInputError(`${where} needs a unit_price.`);
    if (unitKg !== product.packSizeKg) {
      throw new FeedSportInputError(`${where} needs a unit_price: the catalogue price for ${product.name} is per ${packLabel(product.packSizeKg)}, not per ${label ?? "item"}.`);
    }
    if (product.currency !== currency) throw new FeedSportInputError(`${where} needs a unit_price: ${product.name} is priced in ${product.currency}, not ${currency}.`);
    price = product.price;
  }
  return { id: randomUUID(), ...(product ? { productId: product.id } : {}), description, quantity: input.quantity, price };
}

/** Builds and validates the invoice with the admin web app's schema; totals are always computed, never taken from the caller. */
async function buildInvoice(
  access: InvoiceAccess,
  input: InvoiceFieldsInput,
  status: InvoiceStatus,
  current?: StoredInvoice,
): Promise<{ write: InvoiceWrite; draft: Invoice }> {
  const currency = input.currency ?? INVOICE_CURRENCIES[0];
  if (input.transport !== undefined) requirePrecision(input.transport, 2, "transport");
  if (input.tax_rate_percent !== undefined) requirePrecision(input.tax_rate_percent, 4, "tax_rate_percent");
  if (input.due_date !== undefined && input.payment_due_days !== undefined) throw new FeedSportInputError("Give due_date or payment_due_days, not both.");

  const client = await resolveCustomer(access.store, input, current?.client);
  if (!client) throw new FeedSportInputError("Give customer_id for an existing customer (see list_customers) or the new customer's details in customer.");
  const products = input.line_items?.some((item) => item.product) ? await access.store.listProducts() : [];
  const items = input.line_items ? input.line_items.map((item, index) => lineItem(item, index, products, currency)) : current?.items;
  if (!items?.length) throw new FeedSportInputError("An invoice needs at least one line item.");

  const issueDate = validDate(input.issue_date ?? (current ? isoDate(current.date) : (access.today ?? harareToday)()), "issue_date");
  const days = input.payment_due_days;
  const dueDate = input.due_date
    ? validDate(input.due_date, "due_date")
    : days !== undefined || !current
      ? addDays(issueDate, days ?? INVOICE_DEFAULTS.paymentDueDays)
      : isoDate(current.dueDate);
  const paymentTerms =
    input.payment_terms ??
    (days !== undefined ? `Payment due within ${days} days.` : current ? current.paymentTerms : input.due_date ? "" : INVOICE_DEFAULTS.paymentTerms);

  const validation = InvoiceSchema.safeParse({
    date: issueDate,
    dueDate,
    client,
    items,
    taxRate: input.tax_rate_percent !== undefined ? Number((input.tax_rate_percent / 100).toFixed(6)) : (current?.taxRate ?? 0),
    transport: input.transport ?? current?.transport ?? 0,
    notes: input.notes ?? current?.notes ?? INVOICE_DEFAULTS.notes,
    paymentTerms,
    bank: current?.bank ?? { name: "", accountName: "", accountNumber: "", branch: "" },
    status,
  });
  if (!validation.success) throw new FeedSportInputError(invoiceValidationError(validation.error));
  const write = invoiceRow(validation.data);
  const draft: Invoice = {
    id: current?.id ?? "",
    invoiceNumber: current?.invoiceNumber ?? "",
    date: write.issue_date,
    dueDate: write.due_date,
    client: write.client,
    items: write.items,
    taxRate: write.tax_rate,
    transport: write.transport,
    notes: write.notes,
    paymentTerms: write.payment_terms,
    bank: write.bank,
    totalAmount: write.total_amount,
    status,
  };
  return { write, draft };
}

async function findInvoice(store: InvoiceStore, reference: string) {
  const ref = reference.trim();
  const invoice = UUID.test(ref) ? await store.get(ref) : await store.getByNumber(ref.toUpperCase());
  if (!invoice) throw new FeedSportInputError(`No invoice "${reference}". Use list_invoices to find the invoice_id or invoice_number.`);
  return invoice;
}

const notEditable = (invoice: Invoice) =>
  new FeedSportInputError(
    `${invoice.invoiceNumber} is ${STATUS_LABEL[invoice.status].toLowerCase()} (status "${invoice.status}"), so it cannot be changed here. Only proforma invoices can be edited through FeedSport MCP; finalised invoices are changed in FeedSport admin.`,
  );

const withPdf = (access: InvoiceAccess, invoice: Invoice) => ({
  ...invoiceView(invoice),
  pdf: access.pdfLink(invoice.id) ?? { tool: "generate_invoice_pdf" },
});

// ---------------------------------------------------------------------------
// Tools

export async function listInvoicesTool(
  args: { customer?: string; status?: InvoiceStatus; type?: InvoiceType; date_from?: string; date_to?: string; limit: number },
  access: InvoiceAccess,
) {
  const dateFrom = args.date_from ? validDate(args.date_from, "date_from") : undefined;
  const dateTo = args.date_to ? validDate(args.date_to, "date_to") : undefined;
  let statuses: InvoiceStatus[] | undefined = args.type === "proforma" ? ["draft"] : args.type === "standard" ? ["sent", "paid", "void"] : undefined;
  if (args.status) statuses = statuses && !statuses.includes(args.status) ? [] : [args.status];
  if (statuses && !statuses.length) return { count: 0, invoices: [] };

  const wanted = args.customer?.trim().toLowerCase();
  const invoices = (await access.store.list({ statuses, dateFrom, dateTo, limit: wanted ? 1000 : args.limit }))
    .filter((invoice) => !wanted || customerId(invoice.client.name) === wanted || invoice.client.name.toLowerCase().includes(wanted))
    .slice(0, args.limit)
    .map(summaryView);
  return { count: invoices.length, invoices };
}

export async function getInvoiceTool(args: { invoice: string }, access: InvoiceAccess) {
  return withPdf(access, await findInvoice(access.store, args.invoice));
}

export async function listCustomersTool(args: { query?: string; limit: number }, access: InvoiceAccess) {
  const wanted = args.query?.trim().toLowerCase();
  const found = (await customers(access.store))
    .filter((c) => !wanted || c.customer_id.includes(customerId(wanted)) || [c.client.name, ...c.emails, c.client.city].some((v) => v.toLowerCase().includes(wanted)))
    .slice(0, args.limit)
    .map((c) => ({ customer_id: c.customer_id, ...c.client, invoice_count: c.invoice_count, last_invoice_date: c.last_invoice_date }));
  return { count: found.length, customers: found };
}

export async function createInvoiceTool(args: CreateInvoiceInput, access: InvoiceAccess) {
  const { dry_run: dryRun, idempotency_key: key, ...request } = args;
  const type = request.type ?? "proforma";
  const scopedKey = `${access.userId}:${key}`;
  const hash = requestHash(request);

  if (!dryRun) {
    const existing = await access.store.getByIdempotencyKey(scopedKey);
    if (existing) return replay(access, existing, hash);
  }
  const { write, draft } = await buildInvoice(access, request, STATUS_FOR_TYPE[type]);
  if (dryRun) {
    return {
      status: "preview",
      saved: false,
      message: "Nothing was saved. The invoice number is assigned when it is created.",
      invoice: { ...invoiceView(draft), invoice_id: null, invoice_number: null },
    };
  }
  const { invoice, created } = await access.store.create(write, { key: scopedKey, hash });
  if (!created) return replay(access, invoice, hash);
  return { status: "created", saved: true, invoice: withPdf(access, invoice) };
}

function replay(access: InvoiceAccess, invoice: StoredInvoice, hash: string) {
  if (invoice.idempotencyHash !== hash) {
    throw new FeedSportInputError(
      `idempotency_key was already used to create ${invoice.invoiceNumber} with different details. Use a new idempotency_key for a new invoice, or update_invoice to change ${invoice.invoiceNumber}.`,
    );
  }
  return {
    status: "already_created",
    saved: true,
    message: `This request already created ${invoice.invoiceNumber}; no duplicate was made.`,
    invoice: withPdf(access, invoice),
  };
}

export async function updateInvoiceTool(args: UpdateInvoiceInput, access: InvoiceAccess) {
  const { invoice: reference, dry_run: dryRun, ...changes } = args;
  if (!Object.values(changes).some((value) => value !== undefined)) throw new FeedSportInputError("Nothing to change: give at least one field to update.");
  const current = await findInvoice(access.store, reference);
  if (current.status !== "draft") throw notEditable(current);

  const { write, draft } = await buildInvoice(access, changes, current.status, current);
  const dateChanged = write.issue_date !== isoDate(current.date);
  if (dryRun) {
    return {
      status: "preview",
      saved: false,
      message: dateChanged ? "Nothing was saved. Moving the issue date gives the invoice a new number for that date when saved." : "Nothing was saved.",
      invoice: invoiceView(draft),
    };
  }
  const { status: _status, ...fields } = write;
  const updated = await access.store.update(current.id, fields, { status: "draft", updatedAt: current.updatedAt });
  if (!updated) {
    throw new FeedSportInputError(`${current.invoiceNumber} changed while it was being updated (it may have been edited or finalised in FeedSport admin). Fetch it again with get_invoice and retry.`);
  }
  return {
    status: "updated",
    saved: true,
    ...(updated.invoiceNumber !== current.invoiceNumber
      ? { message: `The issue date moved, so the invoice was renumbered from ${current.invoiceNumber} to ${updated.invoiceNumber}.` }
      : {}),
    invoice: withPdf(access, updated),
  };
}

export async function convertProformaTool(args: { invoice: string; dry_run?: boolean }, access: InvoiceAccess) {
  const current = await findInvoice(access.store, args.invoice);
  if (current.status === "sent" || current.status === "paid") {
    return { status: "already_invoice", saved: false, message: `${current.invoiceNumber} is already an invoice.`, invoice: withPdf(access, current) };
  }
  if (current.status !== "draft") throw notEditable(current);
  if (args.dry_run) {
    return {
      status: "preview",
      saved: false,
      message: `Converting keeps ${current.invoiceNumber}, its dates and amounts, and issues it as an invoice awaiting payment. It can then no longer be edited here.`,
      invoice: invoiceView({ ...current, status: "sent" }),
    };
  }
  const updated = await access.store.update(current.id, { status: "sent" }, { status: "draft" });
  if (!updated) throw new FeedSportInputError(`${current.invoiceNumber} changed while it was being converted. Fetch it again with get_invoice.`);
  return { status: "converted", saved: true, invoice: withPdf(access, updated) };
}

/** The PDF the web app serves for this invoice, from the same template, with a download link. */
export async function generateInvoicePdfTool(args: { invoice: string }, access: InvoiceAccess) {
  const invoice = await findInvoice(access.store, args.invoice);
  const bytes = await renderInvoicePdf(invoice);
  const link = access.pdfLink(invoice.id);
  return {
    bytes,
    result: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      document_title: invoiceDocumentTitle(invoice),
      status: invoice.status,
      total: totalsView(invoice).total,
      currency: INVOICE_CURRENCIES[0],
      pdf: {
        filename: invoicePdfFilename(invoice),
        mime_type: "application/pdf",
        size_bytes: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        url: link?.url ?? null,
        expires_at: link?.expiresAt ?? null,
      },
      ...(link ? {} : { message: "Download links are not configured on this server; the PDF is attached to this result instead." }),
    },
  };
}
