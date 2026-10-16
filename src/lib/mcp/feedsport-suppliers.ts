/**
 * The supplier directory for FeedSport admins, through the advisor MCP
 * endpoint: suppliers, their named contacts, timestamped notes, the catalogue
 * products they offer and dated price quotes, with a price comparison across
 * suppliers. Records are the same ones /admin/suppliers shows (src/lib/suppliers.ts).
 *
 * Only admin sign-ins get these tools, and their store runs as the signed-in
 * admin, so row-level security applies as it does on the web. Suppliers are
 * deactivated here, never deleted; deleting stays in the web app.
 */
import {
  SupplierConflictError,
  byNewestQuote,
  isExpired,
  supplierPhones,
  type CatalogueProduct,
  type SupplierContactWrite,
  type SupplierStore,
  type SupplierWrite,
} from "@/lib/suppliers";
import { pricePerTonne } from "@/lib/product-units";
import type { Supplier, SupplierContact, SupplierPrice, SupplierPriceBasis, SupplierPriceUnit, SupplierProduct, SupplierVerification } from "@/types";

import { harareToday } from "./feedsport-invoices";
import { FeedSportInputError } from "./feedsport-service";

export interface SupplierAccess {
  store: SupplierStore;
  /** Today's date (YYYY-MM-DD) in FeedSport's time zone. */
  today?: () => string;
}

const todayOf = (access: SupplierAccess) => (access.today ?? harareToday)();

// ---------------------------------------------------------------------------
// Views

const priceView = (price: SupplierPrice, today: string) => ({
  price_id: price.id,
  price: price.price,
  currency: price.currency,
  unit: price.unit,
  ...(price.unit === "bag" ? { bag_size_kg: price.packSizeKg } : {}),
  price_per_tonne: price.pricePerTonne,
  min_quantity_tonnes: price.minQuantityTonnes,
  basis: price.basis,
  delivery_location: price.deliveryLocation || null,
  quoted_on: price.quotedOn,
  valid_until: price.validUntil,
  expired: isExpired(price, today),
  source: price.source || null,
  notes: price.notes || null,
  recorded_at: price.createdAt,
});

const contactView = (contact: SupplierContact) => ({
  contact_id: contact.id,
  name: contact.name,
  role: contact.role || null,
  phone: contact.phone || null,
  email: contact.email || null,
  is_primary: contact.isPrimary,
});

const productSummary = (product: SupplierProduct, today: string) => ({
  product_id: product.productId,
  product_name: product.productName,
  available: product.available,
  latest_price: product.prices[0] ? priceView(product.prices[0], today) : null,
});

const companyLines = (supplier: Supplier) => ({
  phones: supplierPhones(supplier),
  email: supplier.email || null,
});

function summaryView(supplier: Supplier, today: string) {
  const primary = supplier.contacts.find((c) => c.isPrimary) ?? supplier.contacts[0];
  return {
    supplier_id: supplier.id,
    company: supplier.company,
    location: supplier.location || null,
    verification: supplier.verification,
    active: supplier.active,
    ...companyLines(supplier),
    primary_contact: primary ? contactView(primary) : null,
    contact_count: supplier.contacts.length,
    products: supplier.products.map((p) => productSummary(p, today)),
    note_count: supplier.notes.length,
    last_note_at: supplier.notes[0]?.createdAt ?? null,
  };
}

/** A supplier as MCP clients see it: company lines, contacts, products with full price history, and notes newest first. */
export function supplierView(supplier: Supplier, today: string) {
  return {
    supplier_id: supplier.id,
    company: supplier.company,
    location: supplier.location || null,
    verification: supplier.verification,
    source: supplier.source || null,
    active: supplier.active,
    company_lines: companyLines(supplier),
    contacts: supplier.contacts.map(contactView),
    products: supplier.products.map((p) => ({
      product_id: p.productId,
      product_name: p.productName,
      available: p.available,
      notes: p.notes || null,
      prices: p.prices.map((price) => priceView(price, today)),
    })),
    notes: supplier.notes.map((n) => ({ note_id: n.id, note: n.body, author: n.authorEmail || null, created_at: n.createdAt })),
    created_at: supplier.createdAt,
    updated_at: supplier.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Input handling

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function validDate(value: string, what: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new FeedSportInputError(`${what} must be a real date in YYYY-MM-DD format (got "${value}").`);
  }
  return value;
}

function requirePrecision(value: number, places: number, what: string) {
  if (Math.round(value * 10 ** places) / 10 ** places !== value) throw new FeedSportInputError(`${what} can have at most ${places} decimal places (got ${value}).`);
}

const conflict = async <T>(write: () => Promise<T>) => {
  try {
    return await write();
  } catch (error) {
    if (error instanceof SupplierConflictError) throw new FeedSportInputError(`${error.message} Use list_suppliers to find it and update_supplier to change it.`);
    throw error;
  }
};

/** A supplier by id, exact company name, or a company-name fragment that matches only one supplier. */
async function findSupplier(store: SupplierStore, reference: string) {
  const ref = reference.trim();
  if (UUID.test(ref)) {
    const supplier = await store.get(ref);
    if (supplier) return supplier;
  } else {
    const all = await store.list();
    const exact = all.filter((s) => s.company.toLowerCase() === ref.toLowerCase());
    if (exact.length === 1) return exact[0];
    const wanted = slug(ref);
    const partial = wanted ? all.filter((s) => slug(s.company).includes(wanted)) : [];
    if (partial.length === 1) return partial[0];
    if (partial.length > 1) {
      throw new FeedSportInputError(
        `More than one supplier matches "${reference}": ${partial.slice(0, 8).map((s) => `"${s.company}" (${s.id})`).join(", ")}. Pass the supplier_id.`,
      );
    }
  }
  throw new FeedSportInputError(`No supplier "${reference}". Use list_suppliers to find the supplier_id.`);
}

function findProduct(products: CatalogueProduct[], reference: string) {
  const wanted = reference.trim().toLowerCase();
  const exact = products.filter((p) => p.id === wanted || p.name.toLowerCase() === wanted || p.searchTerms.some((t) => t.toLowerCase() === wanted));
  if (exact.length === 1) return exact[0];
  const candidates = exact.length ? exact : products.filter((p) => p.name.toLowerCase().includes(wanted) || slug(p.id).includes(slug(wanted)));
  if (candidates.length === 1) return candidates[0];
  const hint = candidates.length
    ? ` Did you mean ${candidates.slice(0, 8).map((p) => `"${p.id}" (${p.name})`).join(", ")}?`
    : ` Catalogue products: ${products.map((p) => `"${p.id}"`).join(", ")}.`;
  throw new FeedSportInputError(`${candidates.length ? "More than one" : "No"} catalogue product matches "${reference}".${hint}`);
}

function findContact(supplier: Supplier, contactId: string) {
  const contact = supplier.contacts.find((c) => c.id === contactId.trim());
  if (!contact) {
    const known = supplier.contacts.map((c) => `"${c.name}" (${c.id})`).join(", ");
    throw new FeedSportInputError(`${supplier.company} has no contact ${contactId}.${known ? ` Its contacts: ${known}.` : " It has no contacts yet."}`);
  }
  return contact;
}

const definedOnly = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

export type SupplierFieldsInput = {
  company?: string;
  phone?: string;
  phone_2?: string;
  phone_3?: string;
  email?: string;
  location?: string;
  verification?: SupplierVerification | null;
  source?: string;
};

export type ContactInput = { name: string; role?: string; phone?: string; email?: string; is_primary?: boolean };

const contactWrite = (input: ContactInput): SupplierContactWrite => ({
  name: input.name.trim(),
  role: input.role?.trim() ?? "",
  phone: input.phone?.trim() ?? "",
  email: input.email?.trim() ?? "",
  is_primary: input.is_primary ?? false,
});

// ---------------------------------------------------------------------------
// Tools

export async function listSuppliersTool(
  args: { query?: string; product?: string; location?: string; verification?: SupplierVerification; include_inactive?: boolean; limit: number },
  access: SupplierAccess,
) {
  const today = todayOf(access);
  const product = args.product ? findProduct(await access.store.listProducts(), args.product) : undefined;
  const query = args.query?.trim().toLowerCase();
  const location = args.location?.trim().toLowerCase();
  const suppliers = (await access.store.list())
    .filter((s) => args.include_inactive || s.active)
    .filter((s) => !args.verification || s.verification === args.verification)
    .filter((s) => !location || s.location.toLowerCase().includes(location))
    .filter((s) => !product || s.products.some((p) => p.productId === product.id))
    .filter(
      (s) =>
        !query ||
        [s.company, s.email, s.location, ...supplierPhones(s), ...s.contacts.flatMap((c) => [c.name, c.phone, c.email]), ...s.products.map((p) => p.productName)].some((v) =>
          v.toLowerCase().includes(query),
        ),
    );
  return { count: Math.min(suppliers.length, args.limit), total_matching: suppliers.length, suppliers: suppliers.slice(0, args.limit).map((s) => summaryView(s, today)) };
}

export async function getSupplierTool(args: { supplier: string }, access: SupplierAccess) {
  return supplierView(await findSupplier(access.store, args.supplier), todayOf(access));
}

export async function createSupplierTool(
  args: SupplierFieldsInput & { company: string; products?: string[]; contacts?: ContactInput[]; note?: string },
  access: SupplierAccess,
) {
  const { store } = access;
  if ((args.contacts ?? []).filter((c) => c.is_primary).length > 1) throw new FeedSportInputError("Only one contact can be the primary contact.");
  const catalogue = args.products?.length ? await store.listProducts() : [];
  const products = [...new Map((args.products ?? []).map((ref) => findProduct(catalogue, ref)).map((p) => [p.id, p])).values()];

  const row: SupplierWrite = {
    company: args.company.trim(),
    phone: args.phone?.trim() ?? "",
    phone_2: args.phone_2?.trim() ?? "",
    phone_3: args.phone_3?.trim() ?? "",
    email: args.email?.trim() ?? "",
    location: args.location?.trim() ?? "",
    verification: args.verification ?? null,
    source: args.source?.trim() ?? "",
    active: true,
  };
  const created = await conflict(() => store.create(row));
  for (const contact of args.contacts ?? []) await store.addContact(created.id, contactWrite(contact));
  for (const product of products) await store.setProduct(created.id, product.id, { available: true });
  if (args.note?.trim()) await store.addNote(created.id, args.note.trim());
  return { status: "created", saved: true, supplier: supplierView((await store.get(created.id))!, todayOf(access)) };
}

export async function updateSupplierTool(args: SupplierFieldsInput & { supplier: string; active?: boolean }, access: SupplierAccess) {
  const { supplier: reference, ...fields } = args;
  const changes = definedOnly({
    company: fields.company?.trim(),
    phone: fields.phone?.trim(),
    phone_2: fields.phone_2?.trim(),
    phone_3: fields.phone_3?.trim(),
    email: fields.email?.trim(),
    location: fields.location?.trim(),
    verification: fields.verification,
    source: fields.source?.trim(),
    active: fields.active,
  }) as Partial<SupplierWrite>;
  if (!Object.keys(changes).length) throw new FeedSportInputError("Nothing to change: give at least one field to update.");
  const current = await findSupplier(access.store, reference);
  const updated = await conflict(() => access.store.update(current.id, changes));
  if (!updated) throw new FeedSportInputError(`${current.company} could not be updated; it may have been deleted in FeedSport admin.`);
  return { status: "updated", saved: true, supplier: supplierView(updated, todayOf(access)) };
}

export async function addSupplierContactTool(args: ContactInput & { supplier: string }, access: SupplierAccess) {
  const { supplier: reference, ...contact } = args;
  const supplier = await findSupplier(access.store, reference);
  const duplicate = supplier.contacts.find((c) => c.name.trim().toLowerCase() === contact.name.trim().toLowerCase());
  if (duplicate) {
    throw new FeedSportInputError(`${supplier.company} already has a contact named "${duplicate.name}" (${duplicate.id}). Use update_supplier_contact to change their details.`);
  }
  const created = await access.store.addContact(supplier.id, contactWrite(contact));
  return { status: "created", saved: true, supplier_id: supplier.id, company: supplier.company, contact: contactView(created) };
}

export async function updateSupplierContactTool(
  args: Partial<ContactInput> & { supplier: string; contact_id: string },
  access: SupplierAccess,
) {
  const { supplier: reference, contact_id: contactId, ...fields } = args;
  const changes = definedOnly({
    name: fields.name?.trim(),
    role: fields.role?.trim(),
    phone: fields.phone?.trim(),
    email: fields.email?.trim(),
    is_primary: fields.is_primary,
  }) as Partial<SupplierContactWrite>;
  if (!Object.keys(changes).length) throw new FeedSportInputError("Nothing to change: give at least one field to update.");
  const supplier = await findSupplier(access.store, reference);
  const contact = findContact(supplier, contactId);
  const updated = await access.store.updateContact(contact.id, changes);
  if (!updated) throw new FeedSportInputError(`Contact ${contact.name} could not be updated; it may have been removed in FeedSport admin.`);
  return { status: "updated", saved: true, supplier_id: supplier.id, company: supplier.company, contact: contactView(updated) };
}

export async function removeSupplierContactTool(args: { supplier: string; contact_id: string }, access: SupplierAccess) {
  const supplier = await findSupplier(access.store, args.supplier);
  const contact = findContact(supplier, args.contact_id);
  await access.store.deleteContact(contact.id);
  return { status: "removed", saved: true, supplier_id: supplier.id, company: supplier.company, removed_contact: contactView(contact) };
}

export async function addSupplierNoteTool(args: { supplier: string; note: string }, access: SupplierAccess) {
  const supplier = await findSupplier(access.store, args.supplier);
  const note = await access.store.addNote(supplier.id, args.note.trim());
  return { status: "created", saved: true, supplier_id: supplier.id, company: supplier.company, note: { note_id: note.id, note: note.body, author: note.authorEmail || null, created_at: note.createdAt } };
}

export async function setSupplierProductTool(args: { supplier: string; product: string; available?: boolean; notes?: string }, access: SupplierAccess) {
  const supplier = await findSupplier(access.store, args.supplier);
  const product = findProduct(await access.store.listProducts(), args.product);
  const existing = supplier.products.find((p) => p.productId === product.id);
  await access.store.setProduct(supplier.id, product.id, definedOnly({ available: args.available ?? (existing ? undefined : true), notes: args.notes?.trim() }));
  const updated = (await access.store.get(supplier.id))!;
  const link = updated.products.find((p) => p.productId === product.id)!;
  return {
    status: existing ? "updated" : "linked",
    saved: true,
    supplier_id: supplier.id,
    company: supplier.company,
    product: { product_id: link.productId, product_name: link.productName, available: link.available, notes: link.notes || null, quotes: link.prices.length },
  };
}

export type RecordPriceInput = {
  supplier: string;
  product: string;
  price: number;
  currency?: string;
  unit: SupplierPriceUnit;
  bag_size_kg?: number;
  min_quantity_tonnes?: number;
  basis?: SupplierPriceBasis;
  delivery_location?: string;
  quoted_on?: string;
  valid_until?: string;
  source?: string;
  notes?: string;
};

export async function recordSupplierPriceTool(args: RecordPriceInput, access: SupplierAccess) {
  requirePrecision(args.price, 2, "price");
  if (args.unit === "bag" && args.bag_size_kg === undefined) throw new FeedSportInputError('Give bag_size_kg for unit "bag" (e.g. 50 for 50 kg bags).');
  if (args.unit !== "bag" && args.bag_size_kg !== undefined) throw new FeedSportInputError('bag_size_kg only applies when unit is "bag".');
  const today = todayOf(access);
  const quotedOn = validDate(args.quoted_on ?? today, "quoted_on");
  if (quotedOn > today) throw new FeedSportInputError(`quoted_on ${quotedOn} is in the future; give the date the supplier gave the price.`);
  const validUntil = args.valid_until ? validDate(args.valid_until, "valid_until") : null;
  if (validUntil && validUntil < quotedOn) throw new FeedSportInputError("valid_until cannot be before quoted_on.");
  if (args.basis === "delivered" && !args.delivery_location?.trim()) throw new FeedSportInputError('Give delivery_location for a delivered price (e.g. "Harare").');

  const supplier = await findSupplier(access.store, args.supplier);
  const product = findProduct(await access.store.listProducts(), args.product);
  const existing = supplier.products.find((p) => p.productId === product.id);
  // Recording a quote implies the supplier offers the product.
  const link = existing ? { id: existing.id } : await access.store.setProduct(supplier.id, product.id, { available: true });
  const price = await access.store.addPrice(link.id, {
    price: args.price,
    currency: (args.currency ?? "USD").toUpperCase(),
    unit: args.unit,
    pack_size_kg: args.unit === "bag" ? args.bag_size_kg! : null,
    min_quantity_tonnes: args.min_quantity_tonnes ?? 0,
    basis: args.basis ?? "ex_works",
    delivery_location: args.delivery_location?.trim() ?? "",
    quoted_on: quotedOn,
    valid_until: validUntil,
    source: args.source?.trim() ?? "",
    notes: args.notes?.trim() ?? "",
  });
  const previous = existing?.prices.filter((p) => p.currency === price.currency && p.basis === price.basis).sort(byNewestQuote)[0];
  return {
    status: "recorded",
    saved: true,
    supplier_id: supplier.id,
    company: supplier.company,
    product_id: product.id,
    product_name: product.name,
    ...(existing ? {} : { message: `${product.name} was added to ${supplier.company}'s products.` }),
    price: priceView(price, today),
    ...(previous
      ? { previous_price: { price_per_tonne: previous.pricePerTonne, quoted_on: previous.quotedOn, change_per_tonne: Math.round((price.pricePerTonne - previous.pricePerTonne) * 100) / 100 } }
      : {}),
  };
}

export async function compareSupplierPricesTool(
  args: { product: string; basis?: SupplierPriceBasis; quantity_tonnes?: number; currency?: string; include_expired?: boolean; include_inactive?: boolean },
  access: SupplierAccess,
) {
  const today = todayOf(access);
  const product = findProduct(await access.store.listProducts(), args.product);
  const currency = (args.currency ?? "USD").toUpperCase();
  const offering = (await access.store.list())
    .filter((s) => args.include_inactive || s.active)
    .flatMap((supplier) => {
      const link = supplier.products.find((p) => p.productId === product.id);
      return link ? [{ supplier, link }] : [];
    });

  const quoted = [];
  const unquoted = [];
  for (const { supplier, link } of offering) {
    const applicable = link.prices.filter(
      (p) =>
        p.currency === currency &&
        (!args.basis || p.basis === args.basis) &&
        (args.include_expired || !isExpired(p, today)) &&
        (args.quantity_tonnes === undefined || p.minQuantityTonnes <= args.quantity_tonnes),
    );
    // The newest quote for each tier and basis, then the cheapest of those.
    const current = new Map<string, SupplierPrice>();
    for (const price of [...applicable].sort(byNewestQuote)) {
      const key = `${price.basis}:${price.minQuantityTonnes}:${price.deliveryLocation.toLowerCase()}`;
      if (!current.has(key)) current.set(key, price);
    }
    const best = [...current.values()].sort((a, b) => a.pricePerTonne - b.pricePerTonne)[0];
    const entry = {
      supplier_id: supplier.id,
      company: supplier.company,
      location: supplier.location || null,
      verification: supplier.verification,
      product_available: link.available,
    };
    if (best) quoted.push({ ...entry, best_price: priceView(best, today), other_current_quotes: [...current.values()].filter((p) => p !== best).map((p) => priceView(p, today)) });
    else unquoted.push({ ...entry, quotes_on_record: link.prices.length, ...companyLines(supplier) });
  }
  quoted.sort((a, b) => a.best_price.price_per_tonne - b.best_price.price_per_tonne);

  const selling = product.currency === currency && product.price > 0 && product.packSizeKg > 0 ? pricePerTonne(product.price, product.packSizeKg) : null;
  return {
    product_id: product.id,
    product_name: product.name,
    currency,
    filters: { basis: args.basis ?? "any", quantity_tonnes: args.quantity_tonnes ?? null, include_expired: !!args.include_expired },
    feedsport_selling_price_per_tonne: selling,
    quoted: quoted.map((q) => ({ ...q, ...(selling !== null ? { margin_per_tonne: Math.round((selling - q.best_price.price_per_tonne) * 100) / 100 } : {}) })),
    without_matching_quote: unquoted,
  };
}
