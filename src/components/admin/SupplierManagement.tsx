'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Edit, Loader2, Mail, MoreHorizontal, Phone, Plus, Save, Search, Star, Trash2, Truck, User, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useToast } from "../ui/use-toast";
import {
  SUPPLIER_PRICE_BASES,
  SUPPLIER_PRICE_UNITS,
  SUPPLIER_VERIFICATIONS,
  type Supplier,
  type SupplierContact,
  type SupplierPrice,
  type SupplierVerification,
} from "@/types";
import { isExpired, supplierPhones } from "@/lib/suppliers";
import {
  addSupplierNote,
  addSupplierPrice,
  deleteSupplier,
  deleteSupplierContact,
  deleteSupplierNote,
  deleteSupplierPrice,
  removeSupplierProduct,
  saveSupplier,
  saveSupplierContact,
  setSupplierProduct,
  type SupplierContactValues,
  type SupplierFormValues,
  type SupplierPriceValues,
} from "@/app/actions";

type CatalogueProduct = { id: string; name: string };
type Result = { success: boolean; error?: string };

const emptyForm: SupplierFormValues = {
  company: '',
  phone: '',
  phone2: '',
  phone3: '',
  email: '',
  location: '',
  verification: '',
  source: '',
  active: true,
};

const emptyContact: SupplierContactValues = { name: '', role: '', phone: '', email: '', isPrimary: false };

const inputClass = "mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2";
const labelClass = "block text-sm font-medium text-ash-300";
const sectionTitle = "text-sm font-semibold uppercase tracking-wider text-ash-400";
const primaryButton = "px-3 py-1.5 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center gap-1.5 text-sm disabled:bg-ash-500";
const secondaryButton = "px-3 py-1.5 border border-ash-600 rounded-lg hover:bg-ash-700 text-sm";

const verificationLabels: Record<SupplierVerification, string> = {
  verified: 'Verified',
  corroborated: 'Corroborated',
  unverified: 'Unverified',
};

const verificationBadgeClass: Record<SupplierVerification, string> = {
  verified: 'bg-emerald-500/15 text-emerald-400',
  corroborated: 'bg-sky-500/15 text-sky-400',
  unverified: 'bg-amber-500/15 text-amber-400',
};

const basisLabels = { ex_works: 'Ex works', delivered: 'Delivered' } as const;

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Harare' }).format(new Date());
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Harare' }).format(new Date(value));
const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
const money = (value: number, currency: string) => `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const telHref = (phone: string) => `tel:${phone.replace(/\s+/g, '')}`;

function quoteLabel(price: SupplierPrice) {
  const per = price.unit === 'bag' ? `${price.packSizeKg} kg bag` : price.unit;
  return `${money(price.price, price.currency)} / ${per}`;
}

const VerificationBadge = ({ value }: { value: SupplierVerification | null }) =>
  value ? <span className={`px-2 text-xs rounded-full ${verificationBadgeClass[value]}`}>{verificationLabels[value]}</span> : null;

const ErrorAlert = ({ message }: { message: string | null }) =>
  message ? (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;

/** Runs a server action, refreshing the page on success and reporting errors as a toast. */
function useSupplierAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const run = async (action: () => Promise<Result>, success?: string) => {
    setPending(true);
    const result = await action();
    setPending(false);
    if (result.success) {
      if (success) toast({ title: success });
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: 'destructive' });
    }
    return result.success;
  };
  return { run, pending };
}

// ---------------------------------------------------------------------------
// Company details

const SupplierFormModal = ({ supplier, isOpen, onClose, onSave }: {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [form, setForm] = useState<SupplierFormValues>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(supplier ? {
      company: supplier.company,
      phone: supplier.phone,
      phone2: supplier.phone2,
      phone3: supplier.phone3,
      email: supplier.email,
      location: supplier.location,
      verification: supplier.verification ?? '',
      source: supplier.source,
      active: supplier.active,
    } : emptyForm);
    setServerError(null);
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const set = (field: keyof SupplierFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setServerError(null);
    const result = await saveSupplier(form, supplier?.id);
    setIsSubmitting(false);
    if (result.success) onSave();
    else setServerError(result.error || 'An unknown error occurred on the server.');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-ash-800 border border-ash-700 rounded-lg w-full max-w-lg flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-4 border-b border-ash-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-medium text-ash-100">{supplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <button type="button" onClick={onClose} className="text-ash-400 hover:text-ash-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-grow overflow-y-auto space-y-4">
            <ErrorAlert message={serverError} />
            <div>
              <label htmlFor="company" className={labelClass}>Company</label>
              <input id="company" required value={form.company} onChange={set('company')} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="phone" className={labelClass}>Company phone</label>
                <input id="phone" type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="phone2" className={labelClass}>Phone 2</label>
                <input id="phone2" type="tel" value={form.phone2} onChange={set('phone2')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="phone3" className={labelClass}>Phone 3</label>
                <input id="phone3" type="tel" value={form.phone3} onChange={set('phone3')} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Company email</label>
              <input id="email" type="email" value={form.email} onChange={set('email')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="location" className={labelClass}>Location</label>
              <input id="location" value={form.location} onChange={set('location')} className={inputClass} placeholder="e.g. Harare, Zambia, South Africa" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="verification" className={labelClass}>Verification</label>
                <select id="verification" value={form.verification} onChange={set('verification')} className={inputClass}>
                  <option value="">Not assessed</option>
                  {SUPPLIER_VERIFICATIONS.map((value) => (
                    <option key={value} value={value}>{verificationLabels[value]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="source" className={labelClass}>Source</label>
                <input id="source" value={form.source} onChange={set('source')} className={inputClass} placeholder="Where this supplier came from" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ash-300">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Active supplier
            </label>
            {!supplier && <p className="text-xs text-ash-500">Add contacts, products, prices and notes after saving.</p>}
          </div>

          <div className="p-4 border-t border-ash-700 flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-ash-600 rounded-lg hover:bg-ash-700">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 disabled:bg-ash-500"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Contacts

const ContactForm = ({ supplierId, contact, onDone }: { supplierId: string; contact: SupplierContact | null; onDone: () => void }) => {
  const [form, setForm] = useState<SupplierContactValues>(
    contact ? { name: contact.name, role: contact.role, phone: contact.phone, email: contact.email, isPrimary: contact.isPrimary } : emptyContact,
  );
  const { run, pending } = useSupplierAction();
  const set = (field: keyof SupplierContactValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await run(() => saveSupplierContact(supplierId, form, contact?.id), contact ? 'Contact updated' : 'Contact added')) onDone();
  };

  return (
    <form onSubmit={submit} className="bg-ash-900/40 border border-ash-700 rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Name</label>
          <input required value={form.name} onChange={set('name')} className={inputClass} placeholder="Person's name" />
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <input value={form.role} onChange={set('role')} className={inputClass} placeholder="e.g. Sales manager" />
        </div>
        <div>
          <label className={labelClass}>Phone / WhatsApp</label>
          <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={form.email} onChange={set('email')} className={inputClass} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ash-300">
          <input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))} />
          Primary contact
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onDone} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save contact
          </button>
        </div>
      </div>
    </form>
  );
};

const ContactsSection = ({ supplier }: { supplier: Supplier }) => {
  const [editing, setEditing] = useState<SupplierContact | 'new' | null>(null);
  const { run } = useSupplierAction();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className={sectionTitle}>Contacts</h4>
        {editing === null && (
          <button onClick={() => setEditing('new')} className={secondaryButton + " flex items-center gap-1"}><Plus className="w-4 h-4" /> Add contact</button>
        )}
      </div>
      {editing === 'new' && <ContactForm supplierId={supplier.id} contact={null} onDone={() => setEditing(null)} />}
      {supplier.contacts.length === 0 && editing !== 'new' && <p className="text-sm text-ash-500">No named contacts yet.</p>}
      <ul className="space-y-2">
        {supplier.contacts.map((contact) =>
          editing !== 'new' && editing?.id === contact.id ? (
            <li key={contact.id}><ContactForm supplierId={supplier.id} contact={contact} onDone={() => setEditing(null)} /></li>
          ) : (
            <li key={contact.id} className="flex items-start justify-between gap-3 bg-ash-900/30 rounded-lg p-3">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-ash-100 font-medium">
                  <User className="w-4 h-4 text-ash-400" />
                  {contact.name}
                  {contact.isPrimary && <span className="flex items-center gap-1 px-2 text-xs rounded-full bg-harvest-500/15 text-harvest-400"><Star className="w-3 h-3" />Primary</span>}
                </div>
                {contact.role && <div className="text-xs text-ash-400">{contact.role}</div>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-ash-300">
                  {contact.phone && <a href={telHref(contact.phone)} className="flex items-center gap-1.5 hover:text-harvest-400"><Phone className="w-3.5 h-3.5" />{contact.phone}</a>}
                  {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-harvest-400"><Mail className="w-3.5 h-3.5" />{contact.email}</a>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditing(contact)} className="p-1.5 rounded hover:bg-ash-700" aria-label={`Edit ${contact.name}`}><Edit className="w-4 h-4" /></button>
                <button
                  onClick={() => confirm(`Remove ${contact.name}?`) && run(() => deleteSupplierContact(contact.id), 'Contact removed')}
                  className="p-1.5 rounded hover:bg-red-900/50 text-red-400"
                  aria-label={`Remove ${contact.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Products & prices

const PriceForm = ({ supplierId, products, productId, onDone }: {
  supplierId: string;
  products: CatalogueProduct[];
  productId?: string;
  onDone: () => void;
}) => {
  const [form, setForm] = useState<SupplierPriceValues>({
    productId: productId ?? '',
    price: '' as unknown as number,
    currency: 'USD',
    unit: 'tonne',
    packSizeKg: 50,
    minQuantityTonnes: 0,
    basis: 'ex_works',
    deliveryLocation: '',
    quotedOn: today(),
    validUntil: '',
    source: '',
    notes: '',
  });
  const { run, pending } = useSupplierAction();
  const set = (field: keyof SupplierPriceValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await run(() => addSupplierPrice(supplierId, form), 'Price recorded')) onDone();
  };

  return (
    <form onSubmit={submit} className="bg-ash-900/40 border border-ash-700 rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Product</label>
          <select required value={form.productId} onChange={set('productId')} className={inputClass} disabled={!!productId}>
            <option value="">Choose a product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Price</label>
          <input required type="number" min="0.01" step="0.01" value={form.price as number} onChange={set('price')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <input required maxLength={3} value={form.currency} onChange={set('currency')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Per</label>
          <select value={form.unit} onChange={set('unit')} className={inputClass}>
            {SUPPLIER_PRICE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        {form.unit === 'bag' && (
          <div>
            <label className={labelClass}>Bag size (kg)</label>
            <input required type="number" min="0.001" step="0.001" value={form.packSizeKg} onChange={set('packSizeKg')} className={inputClass} />
          </div>
        )}
        <div>
          <label className={labelClass}>Min. order (t)</label>
          <input type="number" min="0" step="0.001" value={form.minQuantityTonnes} onChange={set('minQuantityTonnes')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Basis</label>
          <select value={form.basis} onChange={set('basis')} className={inputClass}>
            {SUPPLIER_PRICE_BASES.map((b) => <option key={b} value={b}>{basisLabels[b]}</option>)}
          </select>
        </div>
        {form.basis === 'delivered' && (
          <div>
            <label className={labelClass}>Delivered to</label>
            <input required value={form.deliveryLocation} onChange={set('deliveryLocation')} className={inputClass} placeholder="e.g. Harare" />
          </div>
        )}
        <div>
          <label className={labelClass}>Quoted on</label>
          <input required type="date" max={today()} value={form.quotedOn} onChange={set('quotedOn')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Valid until</label>
          <input type="date" min={form.quotedOn} value={form.validUntil} onChange={set('validUntil')} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Source</label>
          <input value={form.source} onChange={set('source')} className={inputClass} placeholder="e.g. Phone call, WhatsApp, written quote" />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className={labelClass}>Notes</label>
          <input value={form.notes} onChange={set('notes')} className={inputClass} placeholder="Grade, packaging, payment terms..." />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={secondaryButton}>Cancel</button>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Record price
        </button>
      </div>
    </form>
  );
};

const PriceRow = ({ price }: { price: SupplierPrice }) => {
  const { run } = useSupplierAction();
  const expired = isExpired(price, today());
  return (
    <tr className={expired ? 'opacity-60' : ''}>
      <td className="py-1.5 pr-3 whitespace-nowrap">{formatDate(price.quotedOn)}</td>
      <td className="py-1.5 pr-3 whitespace-nowrap text-ash-100">{quoteLabel(price)}</td>
      <td className="py-1.5 pr-3 whitespace-nowrap">{money(price.pricePerTonne, price.currency)}/t</td>
      <td className="py-1.5 pr-3 whitespace-nowrap">{price.minQuantityTonnes > 0 ? `≥ ${price.minQuantityTonnes} t` : 'Any'}</td>
      <td className="py-1.5 pr-3">{basisLabels[price.basis]}{price.deliveryLocation ? ` to ${price.deliveryLocation}` : ''}</td>
      <td className="py-1.5 pr-3 text-ash-400">
        {[price.validUntil && `${expired ? 'Expired' : 'Valid to'} ${formatDate(price.validUntil)}`, price.source, price.notes].filter(Boolean).join(' · ')}
      </td>
      <td className="py-1.5 text-right">
        <button
          onClick={() => confirm('Delete this price? Record a new quote instead if the price changed.') && run(() => deleteSupplierPrice(price.id), 'Price deleted')}
          className="p-1 rounded hover:bg-red-900/50 text-red-400"
          aria-label="Delete price"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};

const ProductsSection = ({ supplier, catalogue }: { supplier: Supplier; catalogue: CatalogueProduct[] }) => {
  const [adding, setAdding] = useState<string | 'any' | null>(null);
  const [linking, setLinking] = useState('');
  const { run, pending } = useSupplierAction();
  const unlinked = catalogue.filter((p) => !supplier.products.some((sp) => sp.productId === p.id));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className={sectionTitle}>Products &amp; prices</h4>
        <div className="flex flex-wrap gap-2">
          {unlinked.length > 0 && (
            <div className="flex gap-1">
              <select value={linking} onChange={(event) => setLinking(event.target.value)} className="bg-ash-700 border-ash-600 rounded-md px-2 py-1 text-sm">
                <option value="">Add product…</option>
                {unlinked.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                disabled={!linking || pending}
                onClick={async () => { if (await run(() => setSupplierProduct(supplier.id, linking, { available: true }), 'Product added')) setLinking(''); }}
                className={secondaryButton}
              >
                Add
              </button>
            </div>
          )}
          {adding === null && (
            <button onClick={() => setAdding('any')} className={secondaryButton + " flex items-center gap-1"}><Plus className="w-4 h-4" /> Record price</button>
          )}
        </div>
      </div>
      {adding === 'any' && <PriceForm supplierId={supplier.id} products={catalogue} onDone={() => setAdding(null)} />}
      {supplier.products.length === 0 && <p className="text-sm text-ash-500">No products recorded yet.</p>}
      <ul className="space-y-3">
        {supplier.products.map((product) => (
          <li key={product.id} className="bg-ash-900/30 rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-ash-100 font-medium">{product.productName}</span>
                {!product.available && <span className="px-2 text-xs rounded-full bg-ash-700 text-ash-300">Not available</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setAdding(product.productId)} className="px-2 py-1 text-xs rounded hover:bg-ash-700 text-harvest-400">Add price</button>
                <button
                  onClick={() => run(() => setSupplierProduct(supplier.id, product.productId, { available: !product.available }))}
                  className="px-2 py-1 text-xs rounded hover:bg-ash-700 text-ash-300"
                >
                  {product.available ? 'Mark unavailable' : 'Mark available'}
                </button>
                <button
                  onClick={() =>
                    confirm(`Remove ${product.productName} from ${supplier.company}?${product.prices.length ? ` This deletes its ${product.prices.length} recorded price(s).` : ''}`) &&
                    run(() => removeSupplierProduct(product.id), 'Product removed')
                  }
                  className="p-1 rounded hover:bg-red-900/50 text-red-400"
                  aria-label={`Remove ${product.productName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {product.notes && <p className="text-xs text-ash-400">{product.notes}</p>}
            {adding === product.productId && (
              <PriceForm supplierId={supplier.id} products={catalogue} productId={product.productId} onDone={() => setAdding(null)} />
            )}
            {product.prices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-ash-300">
                  <thead className="text-ash-500 text-left">
                    <tr>
                      <th className="pb-1 pr-3 font-medium">Quoted</th>
                      <th className="pb-1 pr-3 font-medium">Price</th>
                      <th className="pb-1 pr-3 font-medium">Per tonne</th>
                      <th className="pb-1 pr-3 font-medium">Tier</th>
                      <th className="pb-1 pr-3 font-medium">Basis</th>
                      <th className="pb-1 pr-3 font-medium">Details</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>{product.prices.map((price) => <PriceRow key={price.id} price={price} />)}</tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-ash-500">No prices recorded.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Notes

const NotesSection = ({ supplier }: { supplier: Supplier }) => {
  const [draft, setDraft] = useState('');
  const { run, pending } = useSupplierAction();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await run(() => addSupplierNote(supplier.id, draft), 'Note added')) setDraft('');
  };

  return (
    <section className="space-y-3">
      <h4 className={sectionTitle}>Notes</h4>
      <form onSubmit={submit} className="space-y-2">
        <textarea rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} className={inputClass} placeholder="Call outcome, terms, lead times..." />
        <div className="flex justify-end">
          <button type="submit" disabled={pending || !draft.trim()} className={primaryButton}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add note
          </button>
        </div>
      </form>
      {supplier.notes.length === 0 && <p className="text-sm text-ash-500">No notes yet.</p>}
      <ul className="space-y-2">
        {supplier.notes.map((note) => (
          <li key={note.id} className="bg-ash-900/30 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-ash-200 whitespace-pre-wrap">{note.body}</p>
              <button
                onClick={() => confirm('Delete this note?') && run(() => deleteSupplierNote(note.id), 'Note deleted')}
                className="p-1 rounded hover:bg-red-900/50 text-red-400 flex-shrink-0"
                aria-label="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-ash-500 mt-1">{formatDateTime(note.createdAt)}{note.authorEmail ? ` · ${note.authorEmail}` : ''}</div>
          </li>
        ))}
      </ul>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Supplier detail

const SupplierDetail = ({ supplier, catalogue, onClose, onEdit }: {
  supplier: Supplier;
  catalogue: CatalogueProduct[];
  onClose: () => void;
  onEdit: () => void;
}) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-ash-800 border border-ash-700 rounded-lg w-full max-w-4xl flex flex-col max-h-[92vh]">
      <div className="p-4 border-b border-ash-700 flex justify-between items-start gap-4 flex-shrink-0">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-ash-100 flex flex-wrap items-center gap-2">
            {supplier.company}
            <VerificationBadge value={supplier.verification} />
            {!supplier.active && <span className="px-2 text-xs rounded-full bg-ash-700 text-ash-300">Inactive</span>}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ash-300">
            {supplier.location && <span className="text-ash-400">{supplier.location}</span>}
            {supplierPhones(supplier).map((phone) => (
              <a key={phone} href={telHref(phone)} className="flex items-center gap-1.5 hover:text-harvest-400"><Phone className="w-3.5 h-3.5" />{phone}</a>
            ))}
            {supplier.email && <a href={`mailto:${supplier.email}`} className="flex items-center gap-1.5 hover:text-harvest-400"><Mail className="w-3.5 h-3.5" />{supplier.email}</a>}
          </div>
          {supplier.source && <div className="text-xs text-ash-500">Source: {supplier.source}</div>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onEdit} className={secondaryButton + " flex items-center gap-1"}><Edit className="w-4 h-4" /> Edit</button>
          <button onClick={onClose} className="text-ash-400 hover:text-ash-200" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="p-6 overflow-y-auto space-y-8">
        <ContactsSection supplier={supplier} />
        <ProductsSection supplier={supplier} catalogue={catalogue} />
        <NotesSection supplier={supplier} />
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// List

export const SupplierManagement = ({ initialSuppliers, catalogue }: { initialSuppliers: Supplier[]; catalogue: CatalogueProduct[] }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [query, setQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [openSupplierId, setOpenSupplierId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  // The open supplier follows refreshed data, so edits inside the detail view show straight away.
  const openSupplier = suppliers.find((s) => s.id === openSupplierId) ?? null;

  const filteredSuppliers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return suppliers.filter((supplier) =>
      (!productFilter || supplier.products.some((p) => p.productId === productFilter)) &&
      (!term || [
        supplier.company,
        supplier.location,
        supplier.email,
        ...supplierPhones(supplier),
        ...supplier.contacts.flatMap((c) => [c.name, c.phone, c.email]),
        ...supplier.products.map((p) => p.productName),
      ].some((value) => value.toLowerCase().includes(term)))
    );
  }, [suppliers, query, productFilter]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleSaveSuccess = () => {
    toast({ title: "Success!", description: `Supplier has been ${selectedSupplier ? 'updated' : 'added'}.` });
    handleModalClose();
    router.refresh();
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    const result = await deleteSupplier(supplierToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: "Supplier has been deleted." });
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: 'destructive' });
    }
    setSupplierToDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-ash-100 flex items-center gap-2">
            <Truck />
            Suppliers
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors self-start">
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-ash-400" />
            <input
              type="text"
              placeholder="Search by company, contact, phone, location, or product..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-ash-800 border border-ash-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-harvest-500/50"
            />
          </div>
          <select
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            className="py-2 px-3 bg-ash-800 border border-ash-700 rounded-lg"
            aria-label="Filter by product"
          >
            <option value="">All products</option>
            {catalogue.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="bg-ash-800/50 border border-ash-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ash-700">
              <thead className="bg-ash-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-ash-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-700">
                {filteredSuppliers.map((supplier) => {
                  const primary = supplier.contacts.find((c) => c.isPrimary) ?? supplier.contacts[0];
                  return (
                    <tr
                      key={supplier.id}
                      onClick={() => setOpenSupplierId(supplier.id)}
                      className={`hover:bg-ash-700/50 transition-colors cursor-pointer ${supplier.active ? '' : 'opacity-60'}`}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-medium text-ash-100 flex flex-wrap items-center gap-2">
                          {supplier.company}
                          <VerificationBadge value={supplier.verification} />
                          {!supplier.active && <span className="px-2 text-xs rounded-full bg-ash-700 text-ash-300">Inactive</span>}
                        </div>
                        {supplier.location && <div className="text-xs text-ash-400 mt-1">{supplier.location}</div>}
                        {supplier.notes[0] && (
                          <div className="text-xs text-ash-500 mt-1 max-w-xs line-clamp-2" title={supplier.notes[0].body}>{supplier.notes[0].body}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-ash-300 space-y-1" onClick={(event) => event.stopPropagation()}>
                        {primary && <div className="text-ash-100 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{primary.name}</div>}
                        {(primary?.phone ? [primary.phone] : supplierPhones(supplier).slice(0, 2)).map((phone) => (
                          <a key={phone} href={telHref(phone)} className="flex items-center gap-1.5 hover:text-harvest-400"><Phone className="w-3.5 h-3.5" />{phone}</a>
                        ))}
                        {(primary?.email || supplier.email) && (
                          <a href={`mailto:${primary?.email || supplier.email}`} className="flex items-center gap-1.5 hover:text-harvest-400"><Mail className="w-3.5 h-3.5" />{primary?.email || supplier.email}</a>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {supplier.products.map((product) => (
                            <span
                              key={product.id}
                              className={`px-2 py-0.5 text-xs rounded-full ${product.available ? 'bg-harvest-500/15 text-harvest-400' : 'bg-ash-700 text-ash-400 line-through'}`}
                              title={product.prices[0] ? `${quoteLabel(product.prices[0])} (${formatDate(product.prices[0].quotedOn)})` : 'No price recorded'}
                            >
                              {product.productName}
                              {product.prices[0] && ` · ${money(product.prices[0].pricePerTonne, product.prices[0].currency)}/t`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top whitespace-nowrap text-right text-sm font-medium" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-full hover:bg-ash-700">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-ash-800 border-ash-700 text-ash-100">
                            <DropdownMenuItem onClick={() => setOpenSupplierId(supplier.id)} className="flex items-center gap-2 cursor-pointer">
                              <User className="w-4 h-4" /> Contacts, prices &amp; notes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(supplier)} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSupplierToDelete(supplier)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-ash-400">
                      {suppliers.length === 0 ? 'No suppliers yet. Add your first supply contact.' : 'No suppliers match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openSupplier && (
        <SupplierDetail
          supplier={openSupplier}
          catalogue={catalogue}
          onClose={() => setOpenSupplierId(null)}
          onEdit={() => handleEdit(openSupplier)}
        />
      )}

      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveSuccess}
        supplier={selectedSupplier}
      />

      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              <span className="font-bold text-ash-100 mx-1">{supplierToDelete?.company}</span>
              with its contacts, notes and price history. Mark them inactive instead if you may use them again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
