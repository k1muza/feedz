/**
 * Supplier directory: suppliers with their named contacts, timestamped notes,
 * the catalogue products they offer and dated price quotes for each. Shared by
 * the admin web app and the admin MCP tools (src/lib/mcp/feedsport-suppliers.ts).
 * Every table is admin-only through row-level security, so the store must run
 * as the signed-in admin.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Supplier,
  SupplierContact,
  SupplierNote,
  SupplierPrice,
  SupplierPriceBasis,
  SupplierPriceUnit,
  SupplierProduct,
  SupplierVerification,
} from '@/types';

// ---------------------------------------------------------------------------
// Writes

export type SupplierWrite = {
  company: string;
  phone: string;
  phone_2: string;
  phone_3: string;
  email: string;
  location: string;
  verification: SupplierVerification | null;
  source: string;
  active: boolean;
};

export type SupplierContactWrite = { name: string; role: string; phone: string; email: string; is_primary: boolean };

export type SupplierProductWrite = { available?: boolean; notes?: string };

export type SupplierPriceWrite = {
  price: number;
  currency: string;
  unit: SupplierPriceUnit;
  pack_size_kg: number | null;
  min_quantity_tonnes: number;
  basis: SupplierPriceBasis;
  delivery_location: string;
  quoted_on: string;
  valid_until: string | null;
  source: string;
  notes: string;
};

export interface CatalogueProduct {
  id: string;
  name: string;
  searchTerms: string[];
  /** FeedSport's selling price for one pack of packSizeKg. */
  price: number;
  currency: string;
  packSizeKg: number;
  active: boolean;
}

/** Thrown when a write breaks a uniqueness rule, e.g. a second supplier with the same company name. */
export class SupplierConflictError extends Error {}

export interface SupplierStore {
  /** Every supplier with its contacts, notes, products and price history, by company name. */
  list(): Promise<Supplier[]>;
  get(id: string): Promise<Supplier | null>;
  create(row: SupplierWrite): Promise<Supplier>;
  update(id: string, row: Partial<SupplierWrite>): Promise<Supplier | null>;
  addContact(supplierId: string, row: SupplierContactWrite): Promise<SupplierContact>;
  updateContact(id: string, row: Partial<SupplierContactWrite>): Promise<SupplierContact | null>;
  deleteContact(id: string): Promise<boolean>;
  addNote(supplierId: string, body: string): Promise<SupplierNote>;
  deleteNote(id: string): Promise<boolean>;
  /** Links the product to the supplier, or updates the existing link. */
  setProduct(supplierId: string, productId: string, row: SupplierProductWrite): Promise<{ id: string }>;
  /** Unlinks the product, deleting its price history. */
  removeProduct(supplierProductId: string): Promise<boolean>;
  addPrice(supplierProductId: string, row: SupplierPriceWrite): Promise<SupplierPrice>;
  deletePrice(id: string): Promise<boolean>;
  listProducts(): Promise<CatalogueProduct[]>;
}

// ---------------------------------------------------------------------------
// Rows

type ContactRow = {
  id: string;
  supplier_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};
type NoteRow = { id: string; supplier_id: string; body: string; author_email: string; created_at: string };
type PriceRow = {
  id: string;
  supplier_product_id: string;
  price: number | string;
  currency: string;
  unit: SupplierPriceUnit;
  pack_size_kg: number | string | null;
  min_quantity_tonnes: number | string;
  basis: SupplierPriceBasis;
  delivery_location: string;
  quoted_on: string;
  valid_until: string | null;
  source: string;
  notes: string;
  price_per_tonne: number | string;
  created_at: string;
};
type ProductLinkRow = {
  id: string;
  product_id: string;
  available: boolean;
  notes: string;
  created_at: string;
  products: { name: string } | null;
  supplier_prices: PriceRow[] | null;
};
type SupplierRow = {
  id: string;
  company: string;
  phone: string;
  phone_2: string;
  phone_3: string;
  email: string;
  location: string;
  verification: SupplierVerification | null;
  source: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  supplier_contacts: ContactRow[] | null;
  supplier_notes: NoteRow[] | null;
  supplier_products: ProductLinkRow[] | null;
};

const SUPPLIER_SELECT = '*, supplier_contacts(*), supplier_notes(*), supplier_products(*, products(name), supplier_prices(*))';

const toContact = (row: ContactRow): SupplierContact => ({
  id: row.id,
  name: row.name,
  role: row.role,
  phone: row.phone,
  email: row.email,
  isPrimary: row.is_primary,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toNote = (row: NoteRow): SupplierNote => ({ id: row.id, body: row.body, authorEmail: row.author_email, createdAt: row.created_at });

const toPrice = (row: PriceRow): SupplierPrice => ({
  id: row.id,
  price: Number(row.price),
  currency: row.currency,
  unit: row.unit,
  packSizeKg: row.pack_size_kg === null ? null : Number(row.pack_size_kg),
  minQuantityTonnes: Number(row.min_quantity_tonnes),
  basis: row.basis,
  deliveryLocation: row.delivery_location,
  quotedOn: row.quoted_on,
  validUntil: row.valid_until,
  source: row.source,
  notes: row.notes,
  pricePerTonne: Number(row.price_per_tonne),
  createdAt: row.created_at,
});

/** Newest quote first. */
export const byNewestQuote = (a: SupplierPrice, b: SupplierPrice) => b.quotedOn.localeCompare(a.quotedOn) || b.createdAt.localeCompare(a.createdAt);

const toProduct = (row: ProductLinkRow): SupplierProduct => ({
  id: row.id,
  productId: row.product_id,
  productName: row.products?.name ?? row.product_id,
  available: row.available,
  notes: row.notes,
  prices: (row.supplier_prices ?? []).map(toPrice).sort(byNewestQuote),
});

function toSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    company: row.company,
    phone: row.phone,
    phone2: row.phone_2,
    phone3: row.phone_3,
    email: row.email,
    location: row.location,
    verification: row.verification,
    source: row.source,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Primary contact first, then by name.
    contacts: (row.supplier_contacts ?? []).map(toContact).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name)),
    notes: (row.supplier_notes ?? []).map(toNote).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    products: (row.supplier_products ?? []).map(toProduct).sort((a, b) => a.productName.localeCompare(b.productName)),
  };
}

function check<T>(result: { data: T; error: { message: string; code?: string } | null }, conflict?: string): T {
  if (result.error?.code === '23505' && conflict) throw new SupplierConflictError(conflict);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Reads and writes the supplier tables as the client's user, so row-level security limits it to admins. */
export function createSupabaseSupplierStore(supabase: SupabaseClient): SupplierStore {
  const get = async (id: string) => {
    const row = check(await supabase.from('suppliers').select(SUPPLIER_SELECT).eq('id', id).maybeSingle()) as SupplierRow | null;
    return row ? toSupplier(row) : null;
  };
  const companyTaken = (company?: string) => `A supplier named "${company}" already exists.`;
  return {
    async list() {
      const rows = check(await supabase.from('suppliers').select(SUPPLIER_SELECT).order('company')) as SupplierRow[];
      return rows.map(toSupplier);
    },
    get,
    async create(row) {
      const { id } = check(await supabase.from('suppliers').insert(row).select('id').single(), companyTaken(row.company)) as { id: string };
      return (await get(id))!;
    },
    async update(id, row) {
      const updated = check(await supabase.from('suppliers').update(row).eq('id', id).select('id').maybeSingle(), companyTaken(row.company));
      return updated ? get(id) : null;
    },
    async addContact(supplierId, row) {
      if (row.is_primary) check(await supabase.from('supplier_contacts').update({ is_primary: false }).eq('supplier_id', supplierId).eq('is_primary', true));
      return toContact(check(await supabase.from('supplier_contacts').insert({ ...row, supplier_id: supplierId }).select('*').single()) as ContactRow);
    },
    async updateContact(id, row) {
      if (row.is_primary) {
        const current = check(await supabase.from('supplier_contacts').select('supplier_id').eq('id', id).maybeSingle()) as { supplier_id: string } | null;
        if (!current) return null;
        check(await supabase.from('supplier_contacts').update({ is_primary: false }).eq('supplier_id', current.supplier_id).eq('is_primary', true).neq('id', id));
      }
      const updated = check(await supabase.from('supplier_contacts').update(row).eq('id', id).select('*').maybeSingle()) as ContactRow | null;
      return updated ? toContact(updated) : null;
    },
    async deleteContact(id) {
      return (check(await supabase.from('supplier_contacts').delete().eq('id', id).select('id')) as unknown[]).length > 0;
    },
    async addNote(supplierId, body) {
      return toNote(check(await supabase.from('supplier_notes').insert({ supplier_id: supplierId, body }).select('*').single()) as NoteRow);
    },
    async deleteNote(id) {
      return (check(await supabase.from('supplier_notes').delete().eq('id', id).select('id')) as unknown[]).length > 0;
    },
    async setProduct(supplierId, productId, row) {
      return check(
        await supabase
          .from('supplier_products')
          .upsert({ supplier_id: supplierId, product_id: productId, ...row }, { onConflict: 'supplier_id,product_id' })
          .select('id')
          .single(),
      ) as { id: string };
    },
    async removeProduct(supplierProductId) {
      return (check(await supabase.from('supplier_products').delete().eq('id', supplierProductId).select('id')) as unknown[]).length > 0;
    },
    async addPrice(supplierProductId, row) {
      return toPrice(check(await supabase.from('supplier_prices').insert({ ...row, supplier_product_id: supplierProductId }).select('*').single()) as PriceRow);
    },
    async deletePrice(id) {
      return (check(await supabase.from('supplier_prices').delete().eq('id', id).select('id')) as unknown[]).length > 0;
    },
    async listProducts() {
      const rows = check(await supabase.from('products').select('id, name, search_terms, price, currency, pack_size_kg, active').order('name')) as {
        id: string;
        name: string;
        search_terms: string[] | null;
        price: number | string;
        currency: string;
        pack_size_kg: number | string;
        active: boolean;
      }[];
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        searchTerms: row.search_terms ?? [],
        price: Number(row.price),
        currency: row.currency,
        packSizeKg: Number(row.pack_size_kg),
        active: row.active,
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers

/** Price per tonne for a quote, as the database computes it. */
export function quotePerTonne(price: number, unit: SupplierPriceUnit, packSizeKg?: number | null) {
  const perTonne = unit === 'tonne' ? price : unit === 'kg' ? price * 1000 : (price * 1000) / packSizeKg!;
  return Math.round(perTonne * 100) / 100;
}

/** Whether a quote has passed its valid_until date. */
export const isExpired = (price: Pick<SupplierPrice, 'validUntil'>, today: string) => !!price.validUntil && price.validUntil < today;

/** The supplier's company phone lines that are filled in. */
export const supplierPhones = (supplier: Pick<Supplier, 'phone' | 'phone2' | 'phone3'>) => [supplier.phone, supplier.phone2, supplier.phone3].filter(Boolean);
