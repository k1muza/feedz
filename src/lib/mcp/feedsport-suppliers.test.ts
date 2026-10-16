import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMcpHandler } from "@modelcontextprotocol/server";

import { mergeIngredientPrices } from "@/lib/feed-ingredient-prices";
import { SupplierConflictError, quotePerTonne, type CatalogueProduct, type SupplierStore } from "@/lib/suppliers";
import type { Supplier, SupplierContact, SupplierNote, SupplierPrice, SupplierProduct } from "@/types";

import { createFeedSportMcpServer } from "./feedsport-mcp-server";
import type { SupplierAccess } from "./feedsport-suppliers";

// An in-memory supplier directory with the database's rules: unique company
// names, one primary contact per supplier, one link per supplier and product,
// and price_per_tonne computed from the quote.

const PRODUCTS: CatalogueProduct[] = [
  { id: "soybean-meal", name: "Soybean meal", searchTerms: ["soya"], price: 640, currency: "USD", packSizeKg: 1000, active: true },
  { id: "wheat-bran", name: "Wheat bran", searchTerms: ["bran"], price: 15, currency: "USD", packSizeKg: 50, active: true },
  { id: "sunflower-meal", name: "Sunflower meal", searchTerms: [], price: 22.5, currency: "USD", packSizeKg: 50, active: true },
];

function memoryStore(): SupplierStore {
  const suppliers = new Map<string, Supplier>();
  let seq = 0;
  let clock = 0;
  const id = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
  const stamp = () => new Date(Date.UTC(2026, 9, 16, 8, 0, clock++)).toISOString();
  const copy = <T>(value: T): T => structuredClone(value);
  const ownerOf = <T extends { id: string }>(pick: (s: Supplier) => T[], itemId: string) => [...suppliers.values()].find((s) => pick(s).some((i) => i.id === itemId));
  const assertUnique = (company: string, exceptId?: string) => {
    if ([...suppliers.values()].some((s) => s.id !== exceptId && s.company.toLowerCase() === company.toLowerCase())) {
      throw new SupplierConflictError(`A supplier named "${company}" already exists.`);
    }
  };
  return {
    list: async () => copy([...suppliers.values()].sort((a, b) => a.company.localeCompare(b.company))),
    get: async (supplierId) => copy(suppliers.get(supplierId) ?? null),
    async create(row) {
      assertUnique(row.company);
      const at = stamp();
      const supplier: Supplier = {
        id: id(),
        company: row.company,
        phone: row.phone,
        phone2: row.phone_2,
        phone3: row.phone_3,
        email: row.email,
        location: row.location,
        verification: row.verification,
        source: row.source,
        active: row.active,
        createdAt: at,
        updatedAt: at,
        contacts: [],
        notes: [],
        products: [],
      };
      suppliers.set(supplier.id, supplier);
      return copy(supplier);
    },
    async update(supplierId, row) {
      const s = suppliers.get(supplierId);
      if (!s) return null;
      if (row.company) assertUnique(row.company, supplierId);
      Object.assign(s, {
        ...(row.company !== undefined && { company: row.company }),
        ...(row.phone !== undefined && { phone: row.phone }),
        ...(row.phone_2 !== undefined && { phone2: row.phone_2 }),
        ...(row.phone_3 !== undefined && { phone3: row.phone_3 }),
        ...(row.email !== undefined && { email: row.email }),
        ...(row.location !== undefined && { location: row.location }),
        ...(row.verification !== undefined && { verification: row.verification }),
        ...(row.source !== undefined && { source: row.source }),
        ...(row.active !== undefined && { active: row.active }),
        updatedAt: stamp(),
      });
      return copy(s);
    },
    async addContact(supplierId, row) {
      const s = suppliers.get(supplierId)!;
      if (row.is_primary) s.contacts.forEach((c) => (c.isPrimary = false));
      const at = stamp();
      const contact: SupplierContact = { id: id(), name: row.name, role: row.role, phone: row.phone, email: row.email, isPrimary: row.is_primary, createdAt: at, updatedAt: at };
      s.contacts.push(contact);
      return copy(contact);
    },
    async updateContact(contactId, row) {
      const s = ownerOf((x) => x.contacts, contactId);
      const contact = s?.contacts.find((c) => c.id === contactId);
      if (!s || !contact) return null;
      if (row.is_primary) s.contacts.forEach((c) => (c.isPrimary = false));
      Object.assign(contact, {
        ...(row.name !== undefined && { name: row.name }),
        ...(row.role !== undefined && { role: row.role }),
        ...(row.phone !== undefined && { phone: row.phone }),
        ...(row.email !== undefined && { email: row.email }),
        ...(row.is_primary !== undefined && { isPrimary: row.is_primary }),
      });
      return copy(contact);
    },
    async deleteContact(contactId) {
      const s = ownerOf((x) => x.contacts, contactId);
      if (!s) return false;
      s.contacts = s.contacts.filter((c) => c.id !== contactId);
      return true;
    },
    async addNote(supplierId, body) {
      const note: SupplierNote = { id: id(), body, authorEmail: "admin@feedsport.test", createdAt: stamp() };
      suppliers.get(supplierId)!.notes.unshift(note);
      return copy(note);
    },
    async deleteNote(noteId) {
      const s = ownerOf((x) => x.notes, noteId);
      if (!s) return false;
      s.notes = s.notes.filter((n) => n.id !== noteId);
      return true;
    },
    async setProduct(supplierId, productId, row) {
      const s = suppliers.get(supplierId)!;
      let link = s.products.find((p) => p.productId === productId);
      if (!link) {
        link = { id: id(), productId, productName: PRODUCTS.find((p) => p.id === productId)!.name, available: true, notes: "", prices: [] } satisfies SupplierProduct;
        s.products.push(link);
      }
      if (row.available !== undefined) link.available = row.available;
      if (row.notes !== undefined) link.notes = row.notes;
      return { id: link.id };
    },
    async removeProduct(linkId) {
      const s = ownerOf((x) => x.products, linkId);
      if (!s) return false;
      s.products = s.products.filter((p) => p.id !== linkId);
      return true;
    },
    async addPrice(linkId, row) {
      const link = [...suppliers.values()].flatMap((s) => s.products).find((p) => p.id === linkId)!;
      const price: SupplierPrice = {
        id: id(),
        price: row.price,
        currency: row.currency,
        unit: row.unit,
        packSizeKg: row.pack_size_kg,
        minQuantityTonnes: row.min_quantity_tonnes,
        basis: row.basis,
        deliveryLocation: row.delivery_location,
        quotedOn: row.quoted_on,
        validUntil: row.valid_until,
        source: row.source,
        notes: row.notes,
        pricePerTonne: quotePerTonne(row.price, row.unit, row.pack_size_kg),
        createdAt: stamp(),
      };
      link.prices.unshift(price);
      link.prices.sort((a, b) => b.quotedOn.localeCompare(a.quotedOn) || b.createdAt.localeCompare(a.createdAt));
      return copy(price);
    },
    async deletePrice(priceId) {
      for (const link of [...suppliers.values()].flatMap((s) => s.products)) {
        const before = link.prices.length;
        link.prices = link.prices.filter((p) => p.id !== priceId);
        if (link.prices.length < before) return true;
      }
      return false;
    },
    listProducts: async () => PRODUCTS,
  };
}

function setup() {
  const access: SupplierAccess = { store: memoryStore(), today: () => "2026-10-16" };
  const handler = createMcpHandler(() =>
    createFeedSportMcpServer(async () => mergeIngredientPrices([]), { formulations: null, featured: null, suppliers: access }),
  );
  return { access, handler };
}

type ToolResult = { result?: { isError?: boolean; structuredContent?: any; content?: any[] }; error?: { message: string } };

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

async function ok(handler: ReturnType<typeof createMcpHandler>, name: string, args: unknown) {
  const res = await call(handler, name, args);
  assert.equal(res.error, undefined, `${name} returned a protocol error: ${JSON.stringify(res.error)}`);
  assert.ok(!res.result?.isError, `${name} failed: ${JSON.stringify(res.result?.structuredContent)}`);
  return res.result!.structuredContent;
}
async function refused(handler: ReturnType<typeof createMcpHandler>, name: string, args: unknown) {
  const res = await call(handler, name, args);
  if (res.error) return res.error.message;
  assert.ok(res.result?.isError, `${name} should have been refused: ${JSON.stringify(res.result?.structuredContent)}`);
  return String(res.result?.structuredContent?.message ?? res.result?.content?.[0]?.text);
}

const SUPPLIER_TOOLS = [
  "list_suppliers",
  "get_supplier",
  "create_supplier",
  "update_supplier",
  "add_supplier_contact",
  "update_supplier_contact",
  "remove_supplier_contact",
  "add_supplier_note",
  "set_supplier_product",
  "record_supplier_price",
  "compare_supplier_prices",
];

const surface = { company: "Surface Wilmar", phone: "+263 712 875 797", location: "Chitungwiza", verification: "verified", products: ["soybean-meal"] };

describe("supplier tool discovery and access", () => {
  it("advertises the supplier tools and instructions to admin sign-ins", async () => {
    const { handler } = setup();
    const tools = ((await rpc(handler, "tools/list", {})).result as any).tools as { name: string; annotations?: any; inputSchema: any }[];
    for (const name of SUPPLIER_TOOLS) assert.ok(tools.some((t) => t.name === name), `missing ${name}`);
    assert.equal(tools.find((t) => t.name === "list_suppliers")!.annotations.readOnlyHint, true);
    assert.equal(tools.find((t) => t.name === "record_supplier_price")!.annotations.readOnlyHint, false);
    assert.equal(tools.find((t) => t.name === "remove_supplier_contact")!.annotations.destructiveHint, true);
    assert.ok(tools.find((t) => t.name === "add_supplier_contact")!.inputSchema.required.includes("name"));
    const init = (await rpc(handler, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } })).result as any;
    assert.match(init.instructions, /Contacts are named people\. Never invent a name/);
  });

  it("does not expose supplier tools to advisors or the public endpoint", async () => {
    const advisor = createMcpHandler(() => createFeedSportMcpServer(async () => mergeIngredientPrices([]), { formulations: null, featured: null, suppliers: null }));
    const publicServer = createMcpHandler(() => createFeedSportMcpServer(async () => mergeIngredientPrices([])));
    for (const handler of [advisor, publicServer]) {
      const tools = ((await rpc(handler, "tools/list", {})).result as any).tools as { name: string }[];
      assert.deepEqual(tools.filter((t) => SUPPLIER_TOOLS.includes(t.name)), []);
      const init = (await rpc(handler, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } })).result as any;
      assert.doesNotMatch(init.instructions, /Suppliers \(FeedSport admin/);
    }
  });
});

describe("suppliers, contacts and notes", () => {
  it("creates a supplier with named contacts, products and a timestamped note", async () => {
    const { handler } = setup();
    const created = await ok(handler, "create_supplier", {
      ...surface,
      contacts: [
        { name: "Tendai Moyo", role: "Sales manager", phone: "+263 77 111 1111", is_primary: true },
        { name: "Rudo Chari", email: "rudo@surface.test" },
      ],
      note: "Asked for 30 t price tiers.",
    });
    const s = created.supplier;
    assert.equal(created.status, "created");
    assert.equal(s.company, "Surface Wilmar");
    assert.deepEqual(s.company_lines.phones, ["+263 712 875 797"]);
    assert.deepEqual(s.contacts.map((c: any) => [c.name, c.is_primary]), [["Tendai Moyo", true], ["Rudo Chari", false]]);
    assert.deepEqual(s.products.map((p: any) => p.product_id), ["soybean-meal"]);
    assert.equal(s.notes[0].note, "Asked for 30 t price tiers.");
    assert.ok(s.notes[0].created_at);

    const msg = await refused(handler, "create_supplier", { company: "surface wilmar" });
    assert.match(msg, /already exists/);
  });

  it("finds suppliers by name fragment, contact or product, and refuses ambiguous references", async () => {
    const { handler } = setup();
    await ok(handler, "create_supplier", surface);
    await ok(handler, "create_supplier", { company: "GrainCo (Pvt) Ltd", location: "Harare", products: ["bran", "Soybean meal"] });
    await ok(handler, "create_supplier", { company: "Grain Solutions", location: "Bulawayo" });

    assert.equal((await ok(handler, "get_supplier", { supplier: "grainco" })).company, "GrainCo (Pvt) Ltd");
    assert.match(await refused(handler, "get_supplier", { supplier: "grain" }), /More than one supplier matches/);
    const soya = await ok(handler, "list_suppliers", { product: "soya" });
    assert.deepEqual(soya.suppliers.map((s: any) => s.company), ["GrainCo (Pvt) Ltd", "Surface Wilmar"]);
    assert.equal((await ok(handler, "list_suppliers", { location: "bulawayo" })).count, 1);
    assert.match(await refused(handler, "list_suppliers", { product: "maize germ" }), /No catalogue product matches/);
  });

  it("keeps one primary contact and requires a name", async () => {
    const { handler } = setup();
    const created = await ok(handler, "create_supplier", { ...surface, contacts: [{ name: "Tendai Moyo", is_primary: true }] });
    const added = await ok(handler, "add_supplier_contact", { supplier: created.supplier.supplier_id, name: "Rudo Chari", is_primary: true });
    const s = await ok(handler, "get_supplier", { supplier: "Surface Wilmar" });
    assert.deepEqual(s.contacts.filter((c: any) => c.is_primary).map((c: any) => c.name), ["Rudo Chari"]);

    await refused(handler, "add_supplier_contact", { supplier: "Surface Wilmar", phone: "+263 77 000 0000" });
    assert.match(await refused(handler, "add_supplier_contact", { supplier: "Surface Wilmar", name: "tendai moyo" }), /already has a contact named/);

    const updated = await ok(handler, "update_supplier_contact", { supplier: "Surface Wilmar", contact_id: added.contact.contact_id, role: "Buyer desk" });
    assert.equal(updated.contact.role, "Buyer desk");
    await ok(handler, "remove_supplier_contact", { supplier: "Surface Wilmar", contact_id: added.contact.contact_id });
    assert.equal((await ok(handler, "get_supplier", { supplier: "Surface Wilmar" })).contacts.length, 1);
  });

  it("adds notes newest first and updates supplier fields", async () => {
    const { handler } = setup();
    await ok(handler, "create_supplier", surface);
    await ok(handler, "add_supplier_note", { supplier: "Surface Wilmar", note: "First call." });
    await ok(handler, "add_supplier_note", { supplier: "Surface Wilmar", note: "Second call." });
    const s = await ok(handler, "get_supplier", { supplier: "Surface Wilmar" });
    assert.deepEqual(s.notes.map((n: any) => n.note), ["Second call.", "First call."]);

    await refused(handler, "update_supplier", { supplier: "Surface Wilmar" });
    const retired = await ok(handler, "update_supplier", { supplier: "Surface Wilmar", active: false, verification: null });
    assert.equal(retired.supplier.active, false);
    assert.equal(retired.supplier.verification, null);
    assert.equal((await ok(handler, "list_suppliers", {})).count, 0);
    assert.equal((await ok(handler, "list_suppliers", { include_inactive: true })).count, 1);
  });
});

describe("supplier prices", () => {
  it("records quotes as given, computes per tonne and links the product", async () => {
    const { handler } = setup();
    await ok(handler, "create_supplier", { company: "AgriSwiss Zimbabwe / RSAgri" });
    const first = await ok(handler, "record_supplier_price", {
      supplier: "AgriSwiss",
      product: "Wheat bran",
      price: 12.5,
      unit: "bag",
      bag_size_kg: 50,
      quoted_on: "2026-10-10",
      source: "WhatsApp",
    });
    assert.equal(first.price.price_per_tonne, 250);
    assert.equal(first.price.bag_size_kg, 50);
    assert.match(first.message, /Wheat bran was added/);

    const second = await ok(handler, "record_supplier_price", { supplier: "AgriSwiss", product: "wheat-bran", price: 240, unit: "tonne" });
    assert.equal(second.price.quoted_on, "2026-10-16");
    assert.deepEqual(second.previous_price, { price_per_tonne: 250, quoted_on: "2026-10-10", change_per_tonne: -10 });

    const s = await ok(handler, "get_supplier", { supplier: "AgriSwiss" });
    assert.deepEqual(s.products[0].prices.map((p: any) => p.price_per_tonne), [240, 250]);
  });

  it("refuses incomplete or impossible quotes", async () => {
    const { handler } = setup();
    await ok(handler, "create_supplier", surface);
    const base = { supplier: "Surface Wilmar", product: "soybean-meal" };
    assert.match(await refused(handler, "record_supplier_price", { ...base, price: 30, unit: "bag" }), /bag_size_kg/);
    assert.match(await refused(handler, "record_supplier_price", { ...base, price: 600, unit: "tonne", bag_size_kg: 50 }), /only applies/);
    assert.match(await refused(handler, "record_supplier_price", { ...base, price: 600.123, unit: "tonne" }), /2 decimal places/);
    assert.match(await refused(handler, "record_supplier_price", { ...base, price: 600, unit: "tonne", quoted_on: "2026-11-01" }), /in the future/);
    assert.match(await refused(handler, "record_supplier_price", { ...base, price: 600, unit: "tonne", basis: "delivered" }), /delivery_location/);
    assert.match(await refused(handler, "record_supplier_price", { ...base, price: 600, unit: "tonne", quoted_on: "2026-10-10", valid_until: "2026-10-01" }), /before quoted_on/);
  });

  it("ranks current quotes per tonne with tiers, expiry and FeedSport's margin", async () => {
    const { handler } = setup();
    await ok(handler, "create_supplier", surface);
    await ok(handler, "create_supplier", { company: "United Refineries Limited", location: "Bulawayo", products: ["soybean-meal"] });
    await ok(handler, "create_supplier", { company: "PHI Commodities", phone: "+263 242 745 973", products: ["soybean-meal"] });
    await ok(handler, "create_supplier", { company: "Old Trader", products: ["soybean-meal"] });

    const quote = (supplier: string, extra: object) => ok(handler, "record_supplier_price", { supplier, product: "soybean-meal", unit: "tonne", ...extra });
    await quote("Surface Wilmar", { price: 560, quoted_on: "2026-10-01" });
    await quote("Surface Wilmar", { price: 540, min_quantity_tonnes: 30, quoted_on: "2026-10-01" });
    await quote("United Refineries", { price: 575, basis: "delivered", delivery_location: "Harare" });
    await quote("Old Trader", { price: 500, quoted_on: "2026-09-01", valid_until: "2026-09-30" });

    const small = await ok(handler, "compare_supplier_prices", { product: "soya", quantity_tonnes: 5 });
    assert.equal(small.feedsport_selling_price_per_tonne, 640);
    assert.deepEqual(small.quoted.map((q: any) => [q.company, q.best_price.price_per_tonne, q.margin_per_tonne]), [
      ["Surface Wilmar", 560, 80],
      ["United Refineries Limited", 575, 65],
    ]);
    assert.deepEqual(small.without_matching_quote.map((q: any) => q.company), ["Old Trader", "PHI Commodities"]);
    assert.deepEqual(small.without_matching_quote.find((q: any) => q.company === "PHI Commodities").phones, ["+263 242 745 973"]);

    const bulk = await ok(handler, "compare_supplier_prices", { product: "soybean-meal", quantity_tonnes: 30, basis: "ex_works", include_expired: true });
    assert.deepEqual(bulk.quoted.map((q: any) => [q.company, q.best_price.price_per_tonne]), [
      ["Old Trader", 500],
      ["Surface Wilmar", 540],
    ]);
    assert.equal(bulk.quoted[0].best_price.expired, true);
  });

  it("marks a product unavailable without losing its prices", async () => {
    const { handler } = setup();
    await ok(handler, "create_supplier", surface);
    await ok(handler, "record_supplier_price", { supplier: "Surface Wilmar", product: "soybean-meal", price: 560, unit: "tonne" });
    const result = await ok(handler, "set_supplier_product", { supplier: "Surface Wilmar", product: "soybean-meal", available: false, notes: "Plant shutdown until November" });
    assert.equal(result.status, "updated");
    assert.deepEqual([result.product.available, result.product.quotes], [false, 1]);
    const compare = await ok(handler, "compare_supplier_prices", { product: "soybean-meal" });
    assert.equal(compare.quoted[0].product_available, false);
  });
});
