import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMcpHandler } from "@modelcontextprotocol/server";

import { mergeIngredientPrices } from "@/lib/feed-ingredient-prices";
import { INVOICE_LINK_TTL_S, signInvoicePdfToken, signedInvoicePdfUrl, verifyInvoicePdfToken } from "@/lib/invoice-links";
import { invoicePdfFilename } from "@/lib/invoice-pdf";

import {
  convertProformaTool,
  createInvoiceTool,
  customerId,
  type InvoiceAccess,
  type InvoiceProduct,
  type InvoiceStore,
  type StoredInvoice,
} from "./feedsport-invoices";
import { createFeedSportMcpServer } from "./feedsport-mcp-server";

// An in-memory invoices table with the database's guarantees: numbers
// INV-YYYYMMDD-NN per issue date (renumbered when the date moves), a unique
// idempotency key, and updates conditional on status and updated_at. The
// numbering trigger and constraints themselves are tested against Postgres in
// src/lib/invoices.db.test.ts.

const PRODUCTS: InvoiceProduct[] = [
  { id: "wheat-bran", name: "Wheat bran", searchTerms: ["bran"], price: 9.6, currency: "USD", packSizeKg: 40 },
  { id: "soybean-meal", name: "Soybean meal", searchTerms: ["soya"], price: 580, currency: "USD", packSizeKg: 1000 },
];

const tick = () => new Promise((resolve) => setImmediate(resolve));

function memoryStore() {
  const rows = new Map<string, StoredInvoice & { idempotencyKey?: string }>();
  let clock = 0;
  const stamp = () => new Date(Date.UTC(2026, 9, 16, 8, 0, clock++)).toISOString();
  const nextNumber = (issueDate: string, exceptId?: string) => {
    const prefix = `INV-${issueDate.replaceAll("-", "")}-`;
    const used = [...rows.values()].filter((r) => r.id !== exceptId && r.invoiceNumber.startsWith(prefix)).map((r) => Number(r.invoiceNumber.slice(prefix.length)));
    return prefix + String(Math.max(0, ...used) + 1).padStart(2, "0");
  };
  const copy = <T>(value: T): T => structuredClone(value);
  let seq = 0;
  const store: InvoiceStore = {
    async list({ statuses, dateFrom, dateTo, limit }) {
      return [...rows.values()]
        .filter((r) => (!statuses || statuses.includes(r.status)) && (!dateFrom || String(r.date) >= dateFrom) && (!dateTo || String(r.date) <= dateTo))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.createdAt!.localeCompare(a.createdAt!))
        .slice(0, limit)
        .map(copy);
    },
    get: async (id) => copy(rows.get(id) ?? null),
    getByNumber: async (number) => copy([...rows.values()].find((r) => r.invoiceNumber === number) ?? null),
    getByIdempotencyKey: async (key) => copy([...rows.values()].find((r) => r.idempotencyKey === key) ?? null),
    async create(row, { key, hash }) {
      await tick();
      const holder = [...rows.values()].find((r) => r.idempotencyKey === key);
      if (holder) return { invoice: copy(holder), created: false };
      const id = `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
      const at = stamp();
      const invoice = {
        id,
        invoiceNumber: nextNumber(row.issue_date),
        date: row.issue_date,
        dueDate: row.due_date,
        client: row.client,
        items: row.items,
        taxRate: row.tax_rate,
        transport: row.transport,
        notes: row.notes,
        paymentTerms: row.payment_terms,
        bank: row.bank,
        totalAmount: row.total_amount,
        status: row.status,
        createdAt: at,
        updatedAt: at,
        idempotencyKey: key,
        idempotencyHash: hash,
      };
      rows.set(id, invoice);
      return { invoice: copy(invoice), created: true };
    },
    async update(id, row, expected) {
      await tick();
      const current = rows.get(id);
      if (!current || current.status !== expected.status || (expected.updatedAt && current.updatedAt !== expected.updatedAt)) return null;
      const next = { ...current, updatedAt: stamp() };
      if (row.issue_date && row.issue_date !== current.date) {
        next.date = row.issue_date;
        next.invoiceNumber = nextNumber(row.issue_date, id);
      }
      if (row.due_date) next.dueDate = row.due_date;
      if (row.client) next.client = row.client;
      if (row.items) next.items = row.items;
      if (row.tax_rate !== undefined) next.taxRate = row.tax_rate;
      if (row.transport !== undefined) next.transport = row.transport;
      if (row.total_amount !== undefined) next.totalAmount = row.total_amount;
      if (row.notes !== undefined) next.notes = row.notes;
      if (row.payment_terms !== undefined) next.paymentTerms = row.payment_terms;
      if (row.status) next.status = row.status;
      rows.set(id, next);
      return copy(next);
    },
    listClients: async () => [...rows.values()].map((r) => ({ client: r.client, issueDate: String(r.date), createdAt: r.createdAt! })),
    listProducts: async () => PRODUCTS,
  };
  /** Simulates an edit made in FeedSport admin. */
  const adminEdit = (id: string, change: Partial<StoredInvoice>) => rows.set(id, { ...rows.get(id)!, ...change, updatedAt: stamp() });
  return { rows, store, adminEdit };
}

const SECRET = Buffer.alloc(32, 7);

function setup(today = "2026-10-16") {
  const memory = memoryStore();
  const access: InvoiceAccess = {
    store: memory.store,
    userId: "u-admin",
    today: () => today,
    pdfLink: (id) => signedInvoicePdfUrl("https://feedsport.test", SECRET, id),
  };
  const handler = createMcpHandler(() =>
    createFeedSportMcpServer(async () => mergeIngredientPrices([]), { formulations: null, featured: null, invoices: access }),
  );
  return { ...memory, access, handler };
}

type ToolResult = {
  result?: { isError?: boolean; structuredContent?: any; content?: any[] };
  error?: { message: string };
};

async function rpc(handler: ReturnType<typeof createMcpHandler>, method: string, params: unknown): Promise<ToolResult> {
  const response = await handler.fetch(
    new Request("http://test/api/mcp/advisor", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  const line = (await response.text()).split("\n").find((l) => l.startsWith("data:"));
  return JSON.parse(line!.slice(5));
}
const call = (handler: ReturnType<typeof createMcpHandler>, name: string, args: unknown) => rpc(handler, "tools/call", { name, arguments: args });

/** The tool's structured result, failing the test on any error. */
async function ok(handler: ReturnType<typeof createMcpHandler>, name: string, args: unknown) {
  const res = await call(handler, name, args);
  assert.equal(res.error, undefined, `${name} returned a protocol error: ${JSON.stringify(res.error)}`);
  assert.ok(!res.result?.isError, `${name} failed: ${JSON.stringify(res.result?.structuredContent)}`);
  return res.result!.structuredContent;
}
/** The tool's error message, failing the test unless it was refused. */
async function refused(handler: ReturnType<typeof createMcpHandler>, name: string, args: unknown) {
  const res = await call(handler, name, args);
  if (res.error) return res.error.message;
  assert.ok(res.result?.isError, `${name} should have been refused: ${JSON.stringify(res.result?.structuredContent)}`);
  return String(res.result?.structuredContent?.message ?? res.result?.content?.[0]?.text);
}

const ABC = { name: "ABC Farms", email: "orders@abcfarms.co.zw", address: "12 Mutare Road", city: "Harare", phone: "+263 77 000 0000" };

/** "Create a proforma invoice for ABC Farms for 5 tonnes of wheat bran at $250 per tonne, plus $80 delivery." */
const exampleRequest = {
  customer: ABC,
  line_items: [{ description: "Wheat bran", quantity: 5, unit: "tonne", unit_price: 250 }],
  transport: 80,
  idempotency_key: "req-abc-farms-0001",
};

const INVOICE_TOOLS = ["list_customers", "list_invoices", "get_invoice", "create_invoice", "update_invoice", "convert_proforma_to_invoice", "generate_invoice_pdf"];

describe("invoice tool discovery and access", () => {
  it("advertises the invoice tools to admin sign-ins through tools/list", async () => {
    const { handler } = setup();
    const tools = ((await rpc(handler, "tools/list", {})).result as any).tools as { name: string; inputSchema: any; annotations?: any }[];
    for (const name of INVOICE_TOOLS) assert.ok(tools.some((t) => t.name === name), `missing ${name}`);
    const create = tools.find((t) => t.name === "create_invoice")!;
    assert.equal(create.inputSchema.additionalProperties, false, "create_invoice input is strict");
    assert.ok(create.inputSchema.required.includes("idempotency_key"));
    assert.equal(create.annotations.readOnlyHint, false);
    assert.equal(tools.find((t) => t.name === "get_invoice")!.annotations.readOnlyHint, true);
    const init = (await rpc(handler, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } })).result as any;
    assert.match(init.instructions, /Never add tax or VAT unless the user explicitly asks/);
  });

  it("does not expose invoice tools to advisors or the public endpoint", async () => {
    const advisor = createMcpHandler(() => createFeedSportMcpServer(async () => mergeIngredientPrices([]), { formulations: null, featured: null, invoices: null }));
    const publicServer = createMcpHandler(() => createFeedSportMcpServer(async () => mergeIngredientPrices([])));
    for (const handler of [advisor, publicServer]) {
      const tools = ((await rpc(handler, "tools/list", {})).result as any).tools as { name: string }[];
      assert.deepEqual(tools.filter((t) => INVOICE_TOOLS.includes(t.name)), []);
      const res = await call(handler, "create_invoice", exampleRequest);
      assert.ok(res.error || res.result?.isError, "an unregistered tool cannot be called");
      const init = (await rpc(handler, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } })).result as any;
      assert.doesNotMatch(init.instructions, /Invoices \(FeedSport admin/);
    }
  });

  it("surfaces a store's permission failure as an error without leaking details", async () => {
    const { handler, access } = setup();
    const denied = new Error('new row violates row-level security policy for table "invoices"');
    access.store.list = async () => { throw denied; };
    access.store.listClients = async () => { throw denied; };
    const original = console.error;
    console.error = () => {};
    try {
      assert.equal(await refused(handler, "list_invoices", {}), "FeedSport could not complete this request.");
      assert.equal(await refused(handler, "create_invoice", exampleRequest), "FeedSport could not complete this request.");
    } finally {
      console.error = original;
    }
  });
});

describe("create_invoice", () => {
  it("creates the example proforma with server-side totals, an assigned number and a PDF link", async () => {
    const { handler, rows } = setup();
    const out = await ok(handler, "create_invoice", exampleRequest);
    assert.equal(out.status, "created");
    const invoice = out.invoice;
    assert.equal(invoice.invoice_number, "INV-20261016-01");
    assert.equal(invoice.type, "proforma");
    assert.equal(invoice.status, "draft");
    assert.equal(invoice.document_title, "Proforma invoice");
    assert.equal(invoice.editable, true);
    assert.equal(invoice.currency, "USD");
    assert.equal(invoice.customer.customer_id, "abc-farms");
    assert.deepEqual(invoice.line_items, [{ line: 1, description: "Wheat bran (1 tonne)", product_id: null, quantity: 5, unit_price: 250, amount: 1250 }]);
    assert.deepEqual(invoice.totals, { subtotal: 1250, transport: 80, tax_rate_percent: 0, tax: 0, total: 1330 });
    assert.equal(invoice.issue_date, "2026-10-16");
    assert.equal(invoice.due_date, "2026-11-15");
    assert.equal(invoice.payment_terms, "Payment due within 30 days.");
    assert.match(invoice.pdf.url, /^https:\/\/feedsport\.test\/api\/invoices\/[0-9a-f-]{36}\/pdf\?token=/);
    assert.equal("bank" in invoice, false, "bank details are never returned");
    assert.equal(rows.size, 1);
    const saved = [...rows.values()][0];
    assert.equal(saved.totalAmount, 1330, "the saved total is the server-computed one");
    assert.equal(saved.taxRate, 0, "no VAT is assumed");
  });

  it("creates a proforma with several line items, catalogue products, bags and kg", async () => {
    const { handler } = setup();
    const out = await ok(handler, "create_invoice", {
      customer: ABC,
      line_items: [
        { product: "wheat-bran", quantity: 25 },
        { product: "Soybean meal", quantity: 2.5, unit: "tonne" },
        { description: "Maize", quantity: 40, unit: "bag", bag_size_kg: 50, unit_price: 17.5 },
        { description: "Premix delivery pallet", quantity: 1, unit: "each", unit_price: 12 },
        { description: "Limestone", quantity: 333, unit: "kg", unit_price: 0.14 },
      ],
      idempotency_key: "multi-line-0001",
    });
    const lines = out.invoice.line_items;
    assert.deepEqual(lines.map((l: any) => l.description), ["Wheat bran (40 kg)", "Soybean meal (1 tonne)", "Maize (50 kg)", "Premix delivery pallet", "Limestone (1 kg)"]);
    assert.deepEqual(lines.map((l: any) => l.product_id), ["wheat-bran", "soybean-meal", null, null, null]);
    assert.deepEqual(lines.map((l: any) => l.unit_price), [9.6, 580, 17.5, 12, 0.14], "catalogue pack prices apply when no price is given");
    assert.deepEqual(lines.map((l: any) => l.amount), [240, 1450, 700, 12, 46.62]);
    assert.equal(out.invoice.totals.subtotal, 2448.62);
    assert.equal(out.invoice.totals.total, 2448.62);
  });

  it("applies tax only when a rate is given, and rounds to cents once", async () => {
    const { handler } = setup();
    const out = await ok(handler, "create_invoice", {
      ...exampleRequest,
      line_items: [{ description: "Sunflower meal", quantity: 0.333, unit: "tonne", unit_price: 10.01 }],
      transport: 0.5,
      tax_rate_percent: 15,
      idempotency_key: "taxed-0001",
    });
    // 0.333 × 10.01 = 3.33333 → 3.33; (3.33 + 0.50) × 1.15 = 4.4045 → 4.40
    assert.deepEqual(out.invoice.totals, { subtotal: 3.33, transport: 0.5, tax_rate_percent: 15, tax: 0.57, total: 4.4 });
  });

  it("bills an existing customer by customer_id using their latest details", async () => {
    const { handler, rows } = setup();
    await ok(handler, "create_invoice", exampleRequest);
    const moved = { ...exampleRequest, customer_id: "abc-farms", customer: { address: "4 Enterprise Road" }, idempotency_key: "abc-second-0001" };
    const second = await ok(handler, "create_invoice", moved);
    assert.equal(second.invoice.customer.address, "4 Enterprise Road");
    assert.equal(second.invoice.customer.email, ABC.email);
    assert.equal(second.invoice.invoice_number, "INV-20261016-02");

    const customers = await ok(handler, "list_customers", { query: "abc" });
    assert.equal(customers.count, 1, "one customer, not two");
    assert.equal(customers.customers[0].invoice_count, 2);
    assert.equal(rows.size, 2);
  });

  it("refuses to create a duplicate customer from new details", async () => {
    const { handler, rows } = setup();
    await ok(handler, "create_invoice", exampleRequest);
    const sameName = await refused(handler, "create_invoice", { ...exampleRequest, customer: { ...ABC, name: "abc  farms", email: "new@abc.example" }, idempotency_key: "dup-name-0001" });
    assert.match(sameName, /matches an existing customer.*customer_id "abc-farms"/);
    const sameEmail = await refused(handler, "create_invoice", { ...exampleRequest, customer: { ...ABC, name: "ABC Holdings" }, idempotency_key: "dup-mail-0001" });
    assert.match(sameEmail, /matches an existing customer/);
    assert.equal(rows.size, 1);
  });

  it("asks for missing customer details and unknown customer ids", async () => {
    const { handler } = setup();
    assert.match(await refused(handler, "create_invoice", { ...exampleRequest, customer: { name: "New Farm" } }), /needs email, address, city, phone/);
    assert.match(await refused(handler, "create_invoice", { ...exampleRequest, customer: undefined, customer_id: "nobody" }), /list_customers/);
  });

  it("never accepts caller-supplied totals, discounts or other currencies", async () => {
    const { handler, rows } = setup();
    await refused(handler, "create_invoice", { ...exampleRequest, total: 1 });
    await refused(handler, "create_invoice", { ...exampleRequest, line_items: [{ ...exampleRequest.line_items[0], amount: 1 }] });
    await refused(handler, "create_invoice", { ...exampleRequest, discount: 10 });
    await refused(handler, "create_invoice", { ...exampleRequest, currency: "ZWG" });
    assert.match(await refused(handler, "create_invoice", { ...exampleRequest, line_items: [{ description: "Bran", quantity: 1, unit_price: 1.005 }] }), /at most 2 decimal places/);
    assert.match(await refused(handler, "create_invoice", { ...exampleRequest, line_items: [{ description: "Bran", quantity: 1, unit_price: -1 }] }), /./);
    assert.match(await refused(handler, "create_invoice", { ...exampleRequest, line_items: [{ product: "soybean-meal", quantity: 1, unit: "kg" }] }), /needs a unit_price.*per tonne/);
    assert.equal(rows.size, 0);
  });

  it("previews with dry_run without saving or numbering", async () => {
    const { handler, rows } = setup();
    const out = await ok(handler, "create_invoice", { ...exampleRequest, dry_run: true });
    assert.equal(out.saved, false);
    assert.equal(out.invoice.invoice_number, null);
    assert.equal(out.invoice.totals.total, 1330);
    assert.equal(rows.size, 0);
  });
});

describe("idempotent creation and numbering", () => {
  it("returns the same invoice when a client retries", async () => {
    const { handler, rows } = setup();
    const first = await ok(handler, "create_invoice", exampleRequest);
    const retry = await ok(handler, "create_invoice", exampleRequest);
    assert.equal(retry.status, "already_created");
    assert.equal(retry.invoice.invoice_id, first.invoice.invoice_id);
    assert.equal(retry.invoice.invoice_number, first.invoice.invoice_number);
    assert.equal(rows.size, 1);
  });

  it("creates one invoice when retries race each other", async () => {
    const { access, rows } = setup();
    const results = await Promise.all(Array.from({ length: 5 }, () => createInvoiceTool(exampleRequest as any, access)));
    assert.equal(rows.size, 1);
    assert.equal(new Set(results.map((r) => r.invoice.invoice_id)).size, 1);
    assert.equal(results.filter((r) => r.status === "created").length, 1);
  });

  it("refuses an idempotency key reused for a different invoice", async () => {
    const { handler, rows } = setup();
    await ok(handler, "create_invoice", exampleRequest);
    const message = await refused(handler, "create_invoice", { ...exampleRequest, transport: 90 });
    assert.match(message, /already used to create INV-20261016-01 with different details/);
    assert.equal(rows.size, 1);
  });

  it("scopes idempotency keys to the admin", async () => {
    const { access, rows } = setup();
    await createInvoiceTool(exampleRequest as any, access);
    await createInvoiceTool({ ...exampleRequest, customer: undefined, customer_id: "abc-farms" } as any, { ...access, userId: "u-other-admin" });
    assert.equal(rows.size, 2);
  });

  it("numbers concurrent invoices uniquely per issue date", async () => {
    const { access } = setup();
    const created = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        createInvoiceTool({ ...exampleRequest, customer: { ...ABC, name: `Farm ${i}`, email: `f${i}@example.com` }, idempotency_key: `concurrent-${i}-0001` } as any, access),
      ),
    );
    const numbers = created.map((r) => r.invoice.invoice_number).sort();
    assert.deepEqual(numbers, Array.from({ length: 8 }, (_, i) => `INV-20261016-0${i + 1}`));
    const nextDay = await createInvoiceTool({ ...exampleRequest, customer_id: "farm-0", customer: undefined, issue_date: "2026-10-17", idempotency_key: "next-day-0001" } as any, access);
    assert.equal(nextDay.invoice.invoice_number, "INV-20261017-01");
  });
});

describe("list_invoices and get_invoice", () => {
  async function seeded() {
    const s = setup();
    await ok(s.handler, "create_invoice", exampleRequest);
    await ok(s.handler, "create_invoice", { ...exampleRequest, customer: { ...ABC, name: "Kumbira Poultry", email: "k@example.com" }, type: "standard", issue_date: "2026-10-01", idempotency_key: "kumbira-0001" });
    await ok(s.handler, "create_invoice", { ...exampleRequest, customer_id: "abc-farms", customer: undefined, issue_date: "2026-09-20", idempotency_key: "abc-sept-0001" });
    return s;
  }

  it("lists newest first with type, status, customer and date filters", async () => {
    const { handler } = await seeded();
    const all = await ok(handler, "list_invoices", {});
    assert.deepEqual(all.invoices.map((i: any) => i.invoice_number), ["INV-20261016-01", "INV-20261001-01", "INV-20260920-01"]);
    assert.deepEqual((await ok(handler, "list_invoices", { type: "standard" })).invoices.map((i: any) => i.customer), ["Kumbira Poultry"]);
    assert.equal((await ok(handler, "list_invoices", { type: "proforma" })).count, 2);
    assert.equal((await ok(handler, "list_invoices", { status: "sent" })).count, 1);
    assert.equal((await ok(handler, "list_invoices", { type: "proforma", status: "sent" })).count, 0);
    assert.equal((await ok(handler, "list_invoices", { customer: "abc-farms" })).count, 2);
    assert.equal((await ok(handler, "list_invoices", { customer: "kumbira" })).count, 1);
    assert.equal((await ok(handler, "list_invoices", { date_from: "2026-10-01", date_to: "2026-10-01" })).count, 1);
    assert.equal((await ok(handler, "list_invoices", { limit: 1 })).count, 1);
  });

  it("gets an invoice by id or number with line items, totals and customer", async () => {
    const { handler } = await seeded();
    const byNumber = await ok(handler, "get_invoice", { invoice: "inv-20261001-01" });
    assert.equal(byNumber.type, "standard");
    assert.equal(byNumber.status, "sent");
    assert.equal(byNumber.document_title, "Invoice");
    assert.equal(byNumber.editable, false);
    assert.equal(byNumber.customer.name, "Kumbira Poultry");
    assert.equal(byNumber.totals.total, 1330);
    const byId = await ok(handler, "get_invoice", { invoice: byNumber.invoice_id });
    assert.equal(byId.invoice_number, "INV-20261001-01");
    assert.match(await refused(handler, "get_invoice", { invoice: "INV-19990101-01" }), /No invoice/);
  });
});

describe("update_invoice and convert_proforma_to_invoice", () => {
  it("updates only the given fields of a proforma and recomputes totals", async () => {
    const { handler } = setup();
    const { invoice } = await ok(handler, "create_invoice", exampleRequest);
    const out = await ok(handler, "update_invoice", { invoice: invoice.invoice_number, transport: 100, notes: "Deliver to the Ruwa farm." });
    assert.equal(out.status, "updated");
    assert.deepEqual(out.invoice.totals, { subtotal: 1250, transport: 100, tax_rate_percent: 0, tax: 0, total: 1350 });
    assert.equal(out.invoice.notes, "Deliver to the Ruwa farm.");
    assert.deepEqual(out.invoice.line_items, invoice.line_items, "line items are kept");
    assert.equal(out.invoice.invoice_number, invoice.invoice_number);

    const relined = await ok(handler, "update_invoice", { invoice: invoice.invoice_id, line_items: [{ description: "Wheat bran", quantity: 6, unit: "tonne", unit_price: 245 }] });
    assert.equal(relined.invoice.totals.total, 1570);
  });

  it("renumbers an invoice whose issue date moves, as the web app does", async () => {
    const { handler } = setup();
    const { invoice } = await ok(handler, "create_invoice", exampleRequest);
    const out = await ok(handler, "update_invoice", { invoice: invoice.invoice_id, issue_date: "2026-10-18", payment_due_days: 14 });
    assert.equal(out.invoice.invoice_number, "INV-20261018-01");
    assert.equal(out.invoice.due_date, "2026-11-01");
    assert.equal(out.invoice.payment_terms, "Payment due within 14 days.");
    assert.match(out.message, /renumbered from INV-20261016-01 to INV-20261018-01/);
  });

  it("refuses changes to issued invoices", async () => {
    const { handler, rows } = setup();
    const { invoice } = await ok(handler, "create_invoice", { ...exampleRequest, type: "standard" });
    assert.match(await refused(handler, "update_invoice", { invoice: invoice.invoice_id, transport: 0 }), /cannot be changed here/);
    assert.equal(rows.get(invoice.invoice_id)!.transport, 80);
  });

  it("refuses an update that races an edit in FeedSport admin", async () => {
    const { access, adminEdit, rows } = setup();
    const { invoice } = await createInvoiceTool(exampleRequest as any, access);
    const read = access.store.get.bind(access.store);
    access.store.get = async (id) => {
      const current = await read(id);
      adminEdit(id, { status: "sent" }); // finalised in the web app after MCP read it
      return current;
    };
    const { updateInvoiceTool } = await import("./feedsport-invoices");
    await assert.rejects(updateInvoiceTool({ invoice: invoice.invoice_id!, transport: 0 }, access), /changed while it was being updated/);
    assert.equal(rows.get(invoice.invoice_id!)!.transport, 80);
  });

  it("previews an update with dry_run without saving", async () => {
    const { handler, rows } = setup();
    const { invoice } = await ok(handler, "create_invoice", exampleRequest);
    const out = await ok(handler, "update_invoice", { invoice: invoice.invoice_id, transport: 0, dry_run: true });
    assert.equal(out.invoice.totals.total, 1250);
    assert.equal(rows.get(invoice.invoice_id)!.transport, 80);
  });

  it("converts a proforma into an invoice once, keeping its number and amounts", async () => {
    const { handler, access, adminEdit } = setup();
    const { invoice } = await ok(handler, "create_invoice", exampleRequest);
    const preview = await ok(handler, "convert_proforma_to_invoice", { invoice: invoice.invoice_id, dry_run: true });
    assert.equal(preview.saved, false);
    const out = await ok(handler, "convert_proforma_to_invoice", { invoice: invoice.invoice_id });
    assert.equal(out.status, "converted");
    assert.equal(out.invoice.type, "standard");
    assert.equal(out.invoice.status, "sent");
    assert.equal(out.invoice.document_title, "Invoice");
    assert.equal(out.invoice.invoice_number, invoice.invoice_number);
    assert.deepEqual(out.invoice.totals, invoice.totals);
    assert.equal((await ok(handler, "convert_proforma_to_invoice", { invoice: invoice.invoice_id })).status, "already_invoice");

    const other = await createInvoiceTool({ ...exampleRequest, customer_id: "abc-farms", customer: undefined, idempotency_key: "to-void-0001" } as any, access);
    adminEdit(other.invoice.invoice_id!, { status: "void" });
    await assert.rejects(convertProformaTool({ invoice: other.invoice.invoice_id! }, access), /cannot be changed here/);
  });
});

describe("generate_invoice_pdf", () => {
  it("renders the web app's PDF and returns a signed link and resource", async () => {
    const { handler } = setup();
    const { invoice } = await ok(handler, "create_invoice", exampleRequest);
    const res = await call(handler, "generate_invoice_pdf", { invoice: invoice.invoice_number, embed_pdf: true });
    assert.ok(!res.result?.isError);
    const out = res.result!.structuredContent;
    assert.equal(out.pdf.filename, invoicePdfFilename({ status: "draft", invoiceNumber: "INV-20261016-01" }));
    assert.equal(out.pdf.filename, "feedsport-proforma-invoice-INV-20261016-01.pdf");
    assert.ok(out.pdf.size_bytes > 5000);
    assert.match(out.pdf.url, /\/api\/invoices\/.+\/pdf\?token=/);

    const content = res.result!.content!;
    const link = content.find((c) => c.type === "resource_link");
    assert.equal(link.uri, out.pdf.url);
    assert.equal(link.mimeType, "application/pdf");
    const embedded = content.find((c) => c.type === "resource");
    const bytes = Buffer.from(embedded.resource.blob, "base64");
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(bytes.byteLength, out.pdf.size_bytes);
    assert.equal(JSON.stringify(out).includes("blob"), false, "structured content carries no file data");
  });

  it("attaches the PDF when download links are not configured", async () => {
    const { handler, access } = setup();
    access.pdfLink = () => null;
    const { invoice } = await ok(handler, "create_invoice", exampleRequest);
    assert.deepEqual(invoice.pdf, { tool: "generate_invoice_pdf" });
    const res = await call(handler, "generate_invoice_pdf", { invoice: invoice.invoice_id });
    assert.equal(res.result!.structuredContent.pdf.url, null);
    assert.ok(res.result!.content!.some((c) => c.type === "resource" && c.resource.mimeType === "application/pdf"));
  });
});

describe("signed invoice PDF links", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const now = 1_800_000_000;

  it("accept the invoice they were signed for until they expire", () => {
    const token = signInvoicePdfToken(SECRET, id, now + 60);
    assert.equal(verifyInvoicePdfToken(SECRET, id, token, now), true);
    assert.equal(verifyInvoicePdfToken(SECRET, id, token, now + 60), false, "expired");
  });

  it("reject other invoices, other keys, tampering and far-future expiries", () => {
    const token = signInvoicePdfToken(SECRET, id, now + 60);
    assert.equal(verifyInvoicePdfToken(SECRET, "22222222-2222-4222-8222-222222222222", token, now), false);
    assert.equal(verifyInvoicePdfToken(Buffer.alloc(32, 8), id, token, now), false);
    assert.equal(verifyInvoicePdfToken(SECRET, id, token.replace(/^\d+/, String(now + 120)), now), false);
    assert.equal(verifyInvoicePdfToken(SECRET, id, signInvoicePdfToken(SECRET, id, now + INVOICE_LINK_TTL_S + 60), now), false);
    assert.equal(verifyInvoicePdfToken(SECRET, id, "garbage", now), false);
  });

  it("customer ids are stable slugs of the name", () => {
    assert.equal(customerId("ABC Farms (Pvt) Ltd"), "abc-farms-pvt-ltd");
    assert.equal(customerId("  Ñyasha  Poultry "), "nyasha-poultry");
  });
});
