'use server';

import type {
  AppSettings,
  BlogCategory,
  BlogPost,
  ContactInquiry,
  Invoice,
  NewsletterSubscription,
  Policy,
  Product,
  ProductCategory,
  NutritionIngredientOption,
  TeamMember,
  User,
  Supplier,
  Lead,
} from '@/types';
import { LEAD_STATUSES } from '@/types';
import type { Conversation } from '@/types/chat';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { feedProductCatalog, PRODUCT_STATUSES } from '@/data/feedProducts';
import { normalizeArticleProductReferences } from '@/lib/article-product-references';
import { knowledgeTopics, type KnowledgeArticle } from '@/data/knowledgeArticles';
import { getPolicies, getTeamMembers, rowToArticle, type ArticleRow } from '@/lib/content';
import { isSupabaseConfigured, supabaseNotConfiguredError, supabaseUrl } from '@/lib/supabase/config';
import { createPublicClient, getAdminClient } from '@/lib/supabase/server';
import { sendInquiryNotification } from '@/lib/email';
import { INGREDIENT_LIBRARY, type IngredientNutrientRecord } from '@/lib/ingredient-nutrients';
import { PUBLIC_PREMIX_ID, PUBLIC_PREMIX_NAME } from '@/lib/public-feed-premix';
import { siteConfig } from '@/lib/seo';

const staticModeError = 'This operation is unavailable while FeedSport is running in static mode.';
const unavailable = () => ({ success: false, error: staticModeError });

export type S3Asset = { key: string; url: string; size: number; lastModified: Date };

export async function getRecommendations(_input: unknown): Promise<any> { return { recommendations: [], explanation: staticModeError }; }
export async function getProductSuggestions(_input: unknown): Promise<any> { return {}; }
export async function generateBlogPostAudio(_input: unknown): Promise<any> { return { audioDataUri: '' }; }


export async function startOrGetConversation(_uid: string): Promise<Conversation | null> { return null; }
export async function addMessage(uid: string, content: string): Promise<Conversation> {
  const message = { role: 'user' as const, content, timestamp: Date.now() };
  return { id: uid, startTime: message.timestamp, messages: [message], lastMessage: message };
}
export async function addAdminMessage(_uid: string, _content: string) { return unavailable(); }
export async function markConversationAsRead(_uid: string) { return unavailable(); }
export async function getConversations(): Promise<Conversation[]> { return []; }
export async function setAiSuspension(_uid: string, _suspended: boolean) { return unavailable(); }

export async function getSignedS3Url(_filename: string, _contentType: string, _size: number) { return unavailable(); }
export async function listS3Assets(): Promise<S3Asset[]> { return []; }
export async function deleteS3Asset(_key: string) { return unavailable(); }
export async function createAudioGenerationTask(_blogPostId: string, _text: string) { return unavailable(); }

export async function getBlogCategories(): Promise<BlogCategory[]> { return []; }
export async function addBlogCategory(_name: string): Promise<any> { return unavailable(); }
export async function updateBlogCategory(_id: string, _name: string): Promise<any> { return unavailable(); }
export async function deleteBlogCategory(_id: string): Promise<any> { return unavailable(); }

export async function getAllUsers(): Promise<User[]> { return []; }
export async function saveUser(..._args: any[]): Promise<any> { return unavailable(); }
export async function deleteUser(_id: string): Promise<any> { return unavailable(); }

export async function getAllIngredients(): Promise<IngredientNutrientRecord[]> {
  return INGREDIENT_LIBRARY.ingredients;
}
export async function getIngredientById(id: string): Promise<IngredientNutrientRecord | null> {
  return INGREDIENT_LIBRARY.ingredients.find((ingredient) => ingredient.id === id) ?? null;
}
export async function saveIngredient(..._args: any[]): Promise<any> { return unavailable(); }
export async function deleteIngredient(_id: string): Promise<any> { return unavailable(); }
export async function updateIngredientCompositions(..._args: any[]): Promise<any> { return unavailable(); }


export async function search(_query: string) { return { products: [] as Product[], blogPosts: [] as BlogPost[] }; }
export async function getAppSettings(): Promise<AppSettings> { return { registrationsOpen: false, aiChatEnabled: false, chatWidgetEnabled: true }; }
export async function updateAppSettings(_settings: Partial<AppSettings>) { return unavailable(); }
export async function createUserProfile(..._args: any[]) { return unavailable(); }
export async function getBusinessDetails(): Promise<string> {
  return `FeedSport supplies feed ingredients and practical animal nutrition support in Zimbabwe. Address: ${siteConfig.addressLines.join(', ')}. Phone or WhatsApp +263 77 468 4534. Email ${siteConfig.email}.`;
}

// ---------------------------------------------------------------------------
// Supabase-backed actions. Visitor submissions use the anonymous client; admin
// actions use the signed-in session, and row-level security enforces admin access.

const notAdminError = 'You must be signed in as an admin.';

async function requireAdmin() {
  if (!isSupabaseConfigured) return { error: supabaseNotConfiguredError } as const;
  const admin = await getAdminClient();
  return admin ? { supabase: admin.supabase } : ({ error: notAdminError } as const);
}

const commaList = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);
const lineList = (value = '') => value.split('\n').map((item) => item.trim()).filter(Boolean);

// Products & invoices -----------------------------------------------------------

type ProductRow = {
  id: string;
  nutrition_ingredient_id: string;
  name: string;
  search_terms: string[] | null;
  category_id: string;
  product_categories: { name: string; slug: string } | { name: string; slug: string }[];
  description: string;
  status: Product['status'];
  animals: Product['animals'] | null;
  grade_fallback: string;
  image_label: string;
  origin: string;
  packaging: string;
  price: number | string;
  currency: string;
  pack_size_kg: number | string;
  moq_kg: number | string;
  stock: number | string;
  certifications: string[] | null;
  images: string[] | null;
  shipping: string | null;
  featured: boolean;
  active: boolean;
};

function rowToProduct(row: ProductRow): Product {
  const category = Array.isArray(row.product_categories) ? row.product_categories[0] : row.product_categories;
  return {
    id: row.id,
    ingredientId: row.nutrition_ingredient_id,
    searchTerms: row.search_terms ?? [],
    ingredient: {
      id: row.nutrition_ingredient_id,
      name: row.name,
      description: row.description,
      category: category?.name ?? '',
      compositions: [],
    },
    categoryId: row.category_id,
    status: row.status,
    animals: row.animals ?? [],
    gradeFallback: row.grade_fallback,
    imageLabel: row.image_label,
    origin: row.origin,
    packaging: row.packaging,
    price: Number(row.price),
    currency: row.currency,
    packSizeKg: Number(row.pack_size_kg),
    moqKg: Number(row.moq_kg),
    stock: Number(row.stock),
    certifications: row.certifications ?? [],
    images: row.images?.length ? row.images : ['/images/products/placeholder.webp'],
    shipping: row.shipping || undefined,
    featured: row.featured,
    active: row.active,
  };
}

const productSelect = '*, product_categories!inner(name, slug)';

export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];
  const admin = await getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.supabase.from('products').select(productSelect).order('name');
  if (error) {
    console.error('Error loading products:', error.message);
    return [];
  }
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !z.string().trim().min(1).max(100).safeParse(id).success) return null;
  const admin = await getAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.supabase.from('products').select(productSelect).eq('id', id).maybeSingle();
  if (error) console.error('Error loading product:', error.message);
  return data ? rowToProduct(data as ProductRow) : null;
}

const ProductImageSchema = z.string().trim().refine(
  (value) => value.startsWith('/') || z.string().url().safeParse(value).success,
  'Images must use an absolute URL or a site-relative path.',
);

const ProductFormSchema = z.object({
  nutritionIngredientId: z.string().trim().min(1, 'Choose a Brazilian Tables ingredient.').max(160),
  name: z.string().trim().min(1, 'Product name is required.').max(160),
  searchTerms: z.string().trim().max(2000).optional(),
  categoryId: z.string().trim().min(1, 'Category is required.').max(100),
  description: z.string().trim().min(1, 'Description is required.').max(2000),
  status: z.enum(PRODUCT_STATUSES),
  animals: z.array(z.enum(['pigs', 'poultry', 'cattle', 'other'])).min(1, 'Choose at least one animal.'),
  gradeFallback: z.string().trim().min(1, 'A fallback grade is required.').max(200),
  imageLabel: z.string().trim().min(1, 'An image label is required.').max(200),
  origin: z.string().trim().min(1, 'Origin or supplier is required.').max(200),
  packaging: z.string().trim().min(1, 'Packaging information is required.').max(300),
  packSizeKg: z.coerce.number().positive('Pack size must be greater than zero.').max(999999999),
  price: z.coerce.number().min(0, 'Price cannot be negative.').max(999999999),
  moqKg: z.coerce.number().positive('MOQ must be greater than zero.').max(999999999),
  stock: z.coerce.number().min(0, 'Stock cannot be negative.').max(999999999),
  images: z.array(ProductImageSchema).min(1, 'At least one image is required.').max(20),
  certifications: z.string().trim().max(1000).optional(),
  shipping: z.string().trim().max(1000).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function revalidateProductCategories() {
  revalidatePath('/admin/products');
  revalidatePath('/admin/products/create');
  revalidatePath('/admin/ingredients');
  revalidatePath('/admin/ingredients/create');
  revalidatePath('/products');
  revalidatePath('/products/categories');
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient().from('product_categories').select('id, name, slug, image_label').order('name');
  if (error) {
    console.error('Error loading product categories:', error.message);
    return [];
  }
  return data.map((row) => ({ id: row.id, name: row.name, slug: row.slug, imageLabel: row.image_label }));
}

export async function getNutritionIngredientOptions(): Promise<NutritionIngredientOption[]> {
  return [
    ...INGREDIENT_LIBRARY.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      sourceTable: ingredient.provenance.sourceTable,
    })),
    // The formulation tool's phase-specific premix; it has no Brazilian Tables record.
    { id: PUBLIC_PREMIX_ID, name: PUBLIC_PREMIX_NAME, category: 'vitamin_mineral_premix', sourceTable: 'Formulation premix' },
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export async function addProductCategory(name: string) {
  const parsed = z.string().trim().min(1).max(100).safeParse(name);
  if (!parsed.success) return { success: false, error: 'Category name is required.' };
  const slug = slugify(parsed.data);
  if (!slug) return { success: false, error: 'Category name must contain letters or numbers.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('product_categories').insert({ id: slug, name: parsed.data, slug });
  if (error?.code === '23505') return { success: false, error: 'That category already exists.' };
  if (error) return { success: false, error: 'Failed to add the category.' };
  revalidateProductCategories();
  return { success: true };
}

export async function updateProductCategory(id: string, name: string) {
  const parsed = z.object({ id: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(100) }).safeParse({ id, name });
  if (!parsed.success) return { success: false, error: 'Enter a valid category name.' };
  const slug = slugify(parsed.data.name);
  if (!slug) return { success: false, error: 'Category name must contain letters or numbers.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };

  const { data: current } = await admin.supabase.from('product_categories').select('id').eq('id', parsed.data.id).maybeSingle();
  if (!current) return { success: false, error: 'Category not found.' };
  const { error } = await admin.supabase.from('product_categories').update({ id: slug, name: parsed.data.name, slug }).eq('id', parsed.data.id);
  if (error?.code === '23505') return { success: false, error: 'That category already exists.' };
  if (error) return { success: false, error: 'Failed to update the category.' };
  revalidateProductCategories();
  revalidateProducts();
  return { success: true };
}

export async function deleteProductCategory(id: string) {
  if (!z.string().trim().min(1).max(100).safeParse(id).success) return { success: false, error: 'Invalid category ID.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { data: category } = await admin.supabase.from('product_categories').select('id').eq('id', id).maybeSingle();
  if (!category) return { success: false, error: 'Category not found.' };
  const { count } = await admin.supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', category.id);
  if ((count ?? 0) > 0) return { success: false, error: 'Move or delete the products in this category first.' };
  const { error } = await admin.supabase.from('product_categories').delete().eq('id', id);
  if (error) return { success: false, error: 'Failed to delete the category.' };
  revalidateProductCategories();
  return { success: true };
}

function revalidateProducts(id?: string) {
  revalidatePath('/admin/products');
  revalidatePath('/admin/stock');
  revalidatePath('/admin/invoices/create');
  revalidatePath('/products');
  revalidatePath('/formulations');
  if (id) {
    revalidatePath(`/admin/products/${id}`);
    revalidatePath(`/products/${id}`);
  }
}

export async function saveProduct(productData: unknown, productId?: string) {
  const validation = ProductFormSchema.safeParse(productData);
  if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };
  if (productId && !z.string().trim().min(1).max(100).safeParse(productId).success) {
    return { success: false, errors: { _server: ['Invalid product ID.'] } };
  }
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, errors: { _server: [admin.error] } };

  const values = validation.data;
  if (values.nutritionIngredientId !== PUBLIC_PREMIX_ID && !INGREDIENT_LIBRARY.ingredients.some((ingredient) => ingredient.id === values.nutritionIngredientId)) {
    return { success: false, errors: { nutritionIngredientId: ['Choose a valid ingredient from the JSON library.'] } };
  }
  const { data: category } = await admin.supabase.from('product_categories').select('id').eq('id', values.categoryId).maybeSingle();
  if (!category) return { success: false, errors: { categoryId: ['Choose a valid product category.'] } };
  const row = {
    nutrition_ingredient_id: values.nutritionIngredientId,
    name: values.name,
    search_terms: Array.from(new Set(commaList(values.searchTerms).map((term) => term.toLowerCase()))),
    category_id: values.categoryId,
    description: values.description,
    status: values.status,
    animals: values.animals,
    grade_fallback: values.gradeFallback,
    image_label: values.imageLabel,
    origin: values.origin,
    packaging: values.packaging,
    pack_size_kg: values.packSizeKg,
    price: values.price,
    moq_kg: values.moqKg,
    stock: values.stock,
    certifications: commaList(values.certifications),
    images: values.images,
    shipping: values.shipping || '',
    featured: values.featured ?? false,
    active: values.active ?? true,
  };

  let savedId = productId;
  if (productId) {
    const { data, error } = await admin.supabase.from('products').update(row).eq('id', productId).select('id').maybeSingle();
    if (error || !data) {
      if (error) console.error('Error updating product:', error.message);
      return { success: false, errors: { _server: ['Failed to update the product.'] } };
    }
  } else {
    savedId = slugify(values.name);
    if (!savedId) return { success: false, errors: { _server: ['Product name must contain letters or numbers.'] } };
    const { error } = await admin.supabase.from('products').insert({ id: savedId, ...row });
    if (error?.code === '23505') return { success: false, errors: { _server: ['A product with this name already exists.'] } };
    if (error) {
      console.error('Error creating product:', error.message);
      return { success: false, errors: { _server: ['Failed to create the product.'] } };
    }
  }

  revalidateProducts(savedId);
  return { success: true, id: savedId };
}

export async function updateProductStock(id: string, stock: number) {
  const input = z.object({
    id: z.string().trim().min(1).max(100),
    stock: z.coerce.number().min(0).max(999999999),
  }).safeParse({ id, stock });
  if (!input.success) return { success: false, error: 'Enter a valid non-negative stock quantity.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { data, error } = await admin.supabase.from('products').update({ stock: input.data.stock }).eq('id', input.data.id).select('id').maybeSingle();
  if (error || !data) return { success: false, error: 'Failed to update product stock.' };
  revalidateProducts(id);
  return { success: true };
}

export async function deleteProduct(id: string) {
  if (!z.string().trim().min(1).max(100).safeParse(id).success) return { success: false, error: 'Invalid product ID.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('products').delete().eq('id', id);
  if (error) return { success: false, error: 'Failed to delete the product.' };
  revalidateProducts(id);
  return { success: true };
}

const InvoiceItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  productId: z.string().trim().max(100).optional(),
  description: z.string().trim().min(1, 'Every line item needs a description.').max(300),
  quantity: z.coerce.number().positive('Line item quantities must be greater than zero.'),
  price: z.coerce.number().min(0, 'Line item prices cannot be negative.'),
});

const InvoiceSchema = z.object({
  date: z.coerce.date(),
  dueDate: z.coerce.date(),
  client: z.object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(254),
    address: z.string().trim().min(1).max(300),
    city: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(1).max(60),
  }),
  items: z.array(InvoiceItemSchema).min(1).max(100),
  taxRate: z.coerce.number().min(0).max(1),
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

type InvoiceInput = Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'totalAmount'> & {
  totalAmount?: number;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  client: Invoice['client'];
  items: Invoice['items'];
  tax_rate: number | string;
  total_amount: number | string;
  notes: string;
  payment_terms: string;
  bank: Invoice['bank'];
  status: Invoice['status'];
  created_at: string;
  updated_at: string;
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function invoiceRow(validation: z.infer<typeof InvoiceSchema>) {
  const subtotal = money(validation.items.reduce((sum, item) => sum + item.quantity * item.price, 0));
  return {
    issue_date: validation.date.toISOString().slice(0, 10),
    due_date: validation.dueDate.toISOString().slice(0, 10),
    client: validation.client,
    items: validation.items,
    tax_rate: validation.taxRate,
    subtotal,
    total_amount: money(subtotal * (1 + validation.taxRate)),
    notes: validation.notes,
    payment_terms: validation.paymentTerms,
    bank: validation.bank,
    status: validation.status,
  };
}

function rowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.issue_date,
    dueDate: row.due_date,
    client: row.client,
    items: row.items,
    taxRate: Number(row.tax_rate),
    notes: row.notes,
    paymentTerms: row.payment_terms,
    bank: row.bank,
    totalAmount: Number(row.total_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function invoiceValidationError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(' ');
}

function revalidateInvoices(id?: string) {
  revalidatePath('/admin/invoices');
  if (id) {
    revalidatePath(`/admin/invoices/${id}`);
  }
}

export async function createInvoice(invoice: InvoiceInput): Promise<{ success: boolean; id?: string; error?: string }> {
  const validation = InvoiceSchema.safeParse(invoice);
  if (!validation.success) return { success: false, error: invoiceValidationError(validation.error) };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };

  const { data, error } = await admin.supabase.from('invoices').insert(invoiceRow(validation.data)).select('id').single();
  if (error) {
    console.error('Error creating invoice:', error.message);
    return { success: false, error: 'Failed to create the invoice.' };
  }
  revalidateInvoices(data.id);
  return { success: true, id: data.id };
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const admin = await requireAdmin();
  if ('error' in admin) return [];
  const { data, error } = await admin.supabase.from('invoices').select('*').order('issue_date', { ascending: false }).order('created_at', { ascending: false });
  if (error) {
    console.error('Error loading invoices:', error.message);
    return [];
  }
  return (data as InvoiceRow[]).map(rowToInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const admin = await requireAdmin();
  if ('error' in admin) return null;
  const { data, error } = await admin.supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error) console.error('Error loading invoice:', error.message);
  return data ? rowToInvoice(data as InvoiceRow) : null;
}

export async function updateInvoice(id: string, invoice: InvoiceInput) {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Invalid invoice ID.' };
  const validation = InvoiceSchema.safeParse(invoice);
  if (!validation.success) return { success: false, error: invoiceValidationError(validation.error) };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };

  const { data, error } = await admin.supabase.from('invoices').update(invoiceRow(validation.data)).eq('id', id).select('id').maybeSingle();
  if (error || !data) {
    if (error) console.error('Error updating invoice:', error.message);
    return { success: false, error: 'Failed to update the invoice.' };
  }
  revalidateInvoices(id);
  return { success: true };
}

export async function deleteInvoice(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Invalid invoice ID.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('invoices').delete().eq('id', id);
  if (error) {
    console.error('Error deleting invoice:', error.message);
    return { success: false, error: 'Failed to delete the invoice.' };
  }
  revalidateInvoices(id);
  return { success: true };
}

function revalidateArticles(slug?: string) {
  revalidatePath('/');
  revalidatePath('/knowledge');
  revalidatePath('/knowledge/feed.xml');
  revalidatePath('/sitemap.xml');
  revalidatePath('/products/[id]', 'page');
  if (slug) revalidatePath(`/knowledge/${slug}`);
  revalidatePath('/admin/blog');
}

// Contact inquiries & newsletter ------------------------------------------------

const ContactInquirySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  // Honeypot: real visitors never see or fill this field.
  company: z.string().max(0).optional(),
});

export async function saveContactInquiry(formData: z.input<typeof ContactInquirySchema>) {
  const validation = ContactInquirySchema.safeParse(formData);
  if (!validation.success) return { success: false, error: validation.error.issues[0]?.message || 'Invalid data provided.' };
  if (!isSupabaseConfigured) return { success: false, error: supabaseNotConfiguredError };

  const { name, email, phone, message } = validation.data;
  const { error } = await createPublicClient().from('contact_inquiries').insert({ name, email, phone: phone || null, message });
  if (error) {
    console.error('Error saving contact inquiry:', error.message);
    return { success: false, error: 'Failed to send your message.' };
  }
  // Email the sales inbox after responding, so a slow or failed send never affects the visitor.
  after(() => sendInquiryNotification({ name, email, phone, message }));
  revalidatePath('/admin/inquiries');
  return { success: true };
}

export async function saveNewsletterSubscription(email: string) {
  const validation = z.string().trim().email().max(254).safeParse(email);
  if (!validation.success) return { success: false, error: 'Please provide a valid email address.' };
  if (!isSupabaseConfigured) return { success: false, error: supabaseNotConfiguredError };

  const { error } = await createPublicClient().from('newsletter_subscriptions').insert({ email: validation.data.toLowerCase() });
  if (error?.code === '23505') return { success: false, error: 'This email is already subscribed.' };
  if (error) {
    console.error('Error saving newsletter subscription:', error.message);
    return { success: false, error: 'Failed to subscribe.' };
  }
  revalidatePath('/admin/subscribers');
  return { success: true };
}

export async function getContactInquiries(): Promise<ContactInquiry[]> {
  const admin = await requireAdmin();
  if ('error' in admin) return [];
  const { data, error } = await admin.supabase.from('contact_inquiries').select('*').order('submitted_at', { ascending: false });
  if (error) {
    console.error('Error loading inquiries:', error.message);
    return [];
  }
  return data.map((row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone ?? undefined, message: row.message, read: row.read, submittedAt: row.submitted_at }));
}

export async function markInquiryRead(id: string, read = true) {
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('contact_inquiries').update({ read }).eq('id', id);
  if (error) return { success: false, error: 'Failed to update inquiry.' };
  revalidatePath('/admin/inquiries');
  return { success: true };
}

export async function getNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
  const admin = await requireAdmin();
  if ('error' in admin) return [];
  const { data, error } = await admin.supabase.from('newsletter_subscriptions').select('*').order('subscribed_at', { ascending: false });
  if (error) {
    console.error('Error loading subscribers:', error.message);
    return [];
  }
  return data.map((row) => ({ id: row.id, email: row.email, subscribedAt: row.subscribed_at }));
}

// Knowledge articles ------------------------------------------------------------

const allowedImageHosts = ['images.unsplash.com', 'dy15acotyf9k1.cloudfront.net', ...(supabaseUrl ? [new URL(supabaseUrl).hostname] : [])];

const ArticleFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers and single hyphens'),
  seoTitle: z.string().trim().max(200).optional(),
  description: z.string().trim().min(1, 'Description is required').max(400),
  topic: z.string().refine((topic) => knowledgeTopics.includes(topic), 'Choose a topic'),
  imageUrl: z.string().trim().url('Enter a valid image URL').refine((url) => allowedImageHosts.includes(new URL(url).hostname), `Images must be hosted on ${allowedImageHosts.join(', ')}`),
  imageAlt: z.string().trim().min(1, 'Describe the image for screen readers and search engines').max(300),
  imageCredit: z.string().trim().max(200).optional(),
  ingredients: z.preprocess(
    normalizeArticleProductReferences,
    z.array(z.string().refine((id) => feedProductCatalog.some((product) => product.id === id))).default([]),
  ),
  keywords: z.string().optional(),
  keyPoints: z.string().optional(),
  body: z.string().min(1, 'Content is required'),
  status: z.enum(['draft', 'published']),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a publish date'),
});

export type ArticleFormValues = z.input<typeof ArticleFormSchema>;

export async function getAllArticlesForAdmin(): Promise<KnowledgeArticle[]> {
  const admin = await requireAdmin();
  if ('error' in admin) return [];
  const { data, error } = await admin.supabase.from('articles').select('*').order('published_at', { ascending: false }).order('created_at', { ascending: false });
  if (error) {
    console.error('Error loading articles:', error.message);
    return [];
  }
  return (data as ArticleRow[]).map(rowToArticle);
}

export async function getArticleForAdmin(slug: string): Promise<KnowledgeArticle | null> {
  const admin = await requireAdmin();
  if ('error' in admin) return null;
  const { data } = await admin.supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
  return data ? rowToArticle(data as ArticleRow) : null;
}

export async function saveArticle(values: ArticleFormValues, articleId?: string) {
  const validation = ArticleFormSchema.safeParse(values);
  if (!validation.success) return { success: false, error: validation.error.issues.map((issue) => issue.message).join(', ') };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };

  const data = validation.data;
  const row = {
    slug: data.slug,
    title: data.title,
    seo_title: data.seoTitle || null,
    description: data.description,
    topic: data.topic,
    image_url: data.imageUrl,
    image_alt: data.imageAlt,
    image_credit: data.imageCredit || '',
    ingredients: data.ingredients,
    keywords: commaList(data.keywords),
    key_points: lineList(data.keyPoints),
    body: data.body,
    status: data.status,
    published_at: data.publishedAt,
  };

  const previousSlug = articleId
    ? (await admin.supabase.from('articles').select('slug').eq('id', articleId).maybeSingle()).data?.slug
    : undefined;
  const { error } = articleId
    ? await admin.supabase.from('articles').update(row).eq('id', articleId)
    : await admin.supabase.from('articles').insert(row);
  if (error?.code === '23505') return { success: false, error: 'Another article already uses this slug.' };
  if (error) {
    console.error('Error saving article:', error.message);
    return { success: false, error: 'Failed to save the article.' };
  }

  revalidateArticles(data.slug);
  if (previousSlug && previousSlug !== data.slug) revalidatePath(`/knowledge/${previousSlug}`);
  return { success: true, slug: data.slug };
}

export async function setArticleStatus(articleId: string, status: 'draft' | 'published') {
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { data, error } = await admin.supabase.from('articles').update({ status }).eq('id', articleId).select('slug').single();
  if (error) return { success: false, error: 'Failed to update the article.' };
  revalidateArticles(data.slug);
  return { success: true };
}

export async function deleteArticle(articleId: string) {
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { data, error } = await admin.supabase.from('articles').delete().eq('id', articleId).select('slug').single();
  if (error) return { success: false, error: 'Failed to delete the article.' };
  revalidateArticles(data.slug);
  return { success: true };
}

// Team members ------------------------------------------------------------------

const TeamMemberFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(120),
  bio: z.string().trim().max(2000).optional(),
  image: z.string().trim().url('Enter a valid image URL').refine((url) => allowedImageHosts.includes(new URL(url).hostname), `Images must be hosted on ${allowedImageHosts.join(', ')}`).optional().or(z.literal('')),
  social: z.object({
    linkedin: z.string().url().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
  }).optional(),
});

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  return getTeamMembers();
}

export async function saveTeamMember(data: z.input<typeof TeamMemberFormSchema>, memberId?: string) {
  const validation = TeamMemberFormSchema.safeParse(data);
  if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, errors: { _server: [admin.error] } };

  const { name, role, bio, image, social } = validation.data;
  const row = { name, role, bio: bio || '', image: image || '', linkedin: social?.linkedin || '', email: social?.email || '' };
  const { error } = memberId
    ? await admin.supabase.from('team_members').update(row).eq('id', memberId)
    : await admin.supabase.from('team_members').insert(row);
  if (error) {
    console.error('Error saving team member:', error.message);
    return { success: false, errors: { _server: ['Failed to save team member.'] } };
  }
  revalidatePath('/admin/team');
  revalidatePath('/team');
  return { success: true };
}

export async function deleteTeamMember(memberId: string) {
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('team_members').delete().eq('id', memberId);
  if (error) return { success: false, error: 'Failed to delete team member.' };
  revalidatePath('/admin/team');
  revalidatePath('/team');
  return { success: true };
}

// Suppliers ---------------------------------------------------------------------

const optionalEmail = z.string().trim().max(254).email('Enter a valid email').or(z.literal('')).default('');

const SupplierFormSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(160),
  contactName: z.string().trim().max(120).default(''),
  phone: z.string().trim().max(60).default(''),
  email: optionalEmail,
  location: z.string().trim().max(160).default(''),
  supplies: z.string().max(2000).default(''),
  notes: z.string().trim().max(5000).default(''),
  active: z.boolean().default(true),
});

export type SupplierFormValues = z.input<typeof SupplierFormSchema>;

type SupplierRow = {
  id: string;
  company: string;
  contact_name: string;
  phone: string;
  email: string;
  location: string;
  supplies: string[] | null;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function rowToSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    company: row.company,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    location: row.location,
    supplies: row.supplies || [],
    notes: row.notes,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const admin = await requireAdmin();
  if ('error' in admin) return [];
  const { data, error } = await admin.supabase.from('suppliers').select('*').order('company');
  if (error) {
    console.error('Error loading suppliers:', error.message);
    return [];
  }
  return (data as SupplierRow[]).map(rowToSupplier);
}

export async function saveSupplier(values: SupplierFormValues, supplierId?: string) {
  if (supplierId && !z.string().uuid().safeParse(supplierId).success) return { success: false, error: 'Invalid supplier ID.' };
  const validation = SupplierFormSchema.safeParse(values);
  if (!validation.success) return { success: false, error: invoiceValidationError(validation.error) };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };

  const { contactName, supplies, ...rest } = validation.data;
  const row = { ...rest, contact_name: contactName, supplies: commaList(supplies) };
  const { error } = supplierId
    ? await admin.supabase.from('suppliers').update(row).eq('id', supplierId)
    : await admin.supabase.from('suppliers').insert(row);
  if (error) {
    console.error('Error saving supplier:', error.message);
    return { success: false, error: 'Failed to save the supplier.' };
  }
  revalidatePath('/admin/suppliers');
  return { success: true };
}

export async function deleteSupplier(supplierId: string) {
  if (!z.string().uuid().safeParse(supplierId).success) return { success: false, error: 'Invalid supplier ID.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('suppliers').delete().eq('id', supplierId);
  if (error) {
    console.error('Error deleting supplier:', error.message);
    return { success: false, error: 'Failed to delete the supplier.' };
  }
  revalidatePath('/admin/suppliers');
  return { success: true };
}

// Leads -------------------------------------------------------------------------

const LeadFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  company: z.string().trim().max(160).default(''),
  phone: z.string().trim().max(60).default(''),
  email: optionalEmail,
  location: z.string().trim().max(160).default(''),
  interest: z.string().trim().max(500).default(''),
  source: z.string().trim().max(60).default(''),
  status: z.enum(LEAD_STATUSES).default('new'),
  followUpOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid follow-up date').or(z.literal('')).nullish(),
  notes: z.string().trim().max(5000).default(''),
});

export type LeadFormValues = z.input<typeof LeadFormSchema>;

type LeadRow = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  location: string;
  interest: string;
  source: string;
  status: Lead['status'];
  follow_up_on: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    location: row.location,
    interest: row.interest,
    source: row.source,
    status: row.status,
    followUpOn: row.follow_up_on,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllLeads(): Promise<Lead[]> {
  const admin = await requireAdmin();
  if ('error' in admin) return [];
  const { data, error } = await admin.supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error loading leads:', error.message);
    return [];
  }
  return (data as LeadRow[]).map(rowToLead);
}

export async function saveLead(values: LeadFormValues, leadId?: string) {
  if (leadId && !z.string().uuid().safeParse(leadId).success) return { success: false, error: 'Invalid lead ID.' };
  const validation = LeadFormSchema.safeParse(values);
  if (!validation.success) return { success: false, error: invoiceValidationError(validation.error) };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };

  const { followUpOn, ...rest } = validation.data;
  const row = { ...rest, follow_up_on: followUpOn || null };
  const { error } = leadId
    ? await admin.supabase.from('leads').update(row).eq('id', leadId)
    : await admin.supabase.from('leads').insert(row);
  if (error) {
    console.error('Error saving lead:', error.message);
    return { success: false, error: 'Failed to save the lead.' };
  }
  revalidatePath('/admin/leads');
  return { success: true };
}

export async function setLeadStatus(leadId: string, status: Lead['status']) {
  if (!z.string().uuid().safeParse(leadId).success) return { success: false, error: 'Invalid lead ID.' };
  if (!z.enum(LEAD_STATUSES).safeParse(status).success) return { success: false, error: 'Invalid status.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('leads').update({ status }).eq('id', leadId);
  if (error) {
    console.error('Error updating lead status:', error.message);
    return { success: false, error: 'Failed to update the lead.' };
  }
  revalidatePath('/admin/leads');
  return { success: true };
}

export async function deleteLead(leadId: string) {
  if (!z.string().uuid().safeParse(leadId).success) return { success: false, error: 'Invalid lead ID.' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('leads').delete().eq('id', leadId);
  if (error) {
    console.error('Error deleting lead:', error.message);
    return { success: false, error: 'Failed to delete the lead.' };
  }
  revalidatePath('/admin/leads');
  return { success: true };
}

// Policies ----------------------------------------------------------------------

const PolicyFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
});

export async function getAllPolicies(): Promise<Policy[]> {
  return getPolicies();
}

export async function getPolicyById(id: string): Promise<Policy | null> {
  return (await getPolicies()).find((policy) => policy.id === id) || null;
}

export async function savePolicy(data: z.input<typeof PolicyFormSchema>, policyId?: string) {
  const validation = PolicyFormSchema.safeParse(data);
  if (!validation.success) return { success: false, error: 'Validation failed' };
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };

  const { error } = policyId
    ? await admin.supabase.from('policies').update(validation.data).eq('id', policyId)
    : await admin.supabase.from('policies').insert(validation.data);
  if (error) {
    console.error('Error saving policy:', error.message);
    return { success: false, error: 'Failed to save policy.' };
  }
  revalidatePath('/admin/policies');
  revalidatePath('/policies');
  return { success: true };
}

export async function deletePolicy(policyId: string) {
  const admin = await requireAdmin();
  if ('error' in admin) return { success: false, error: admin.error };
  const { error } = await admin.supabase.from('policies').delete().eq('id', policyId);
  if (error) return { success: false, error: 'Failed to delete policy.' };
  revalidatePath('/admin/policies');
  revalidatePath('/policies');
  return { success: true };
}

// Legacy post shape still read by the content dashboard and older blog widgets.
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const articles = isSupabaseConfigured ? await getAllArticlesForAdmin() : [];
  return articles.map((article) => ({
    id: article.id || article.slug,
    slug: article.slug,
    title: article.title,
    excerpt: article.description,
    content: article.body,
    image: article.image.src,
    category: article.topic,
    tags: article.keywords,
    featured: false,
    date: article.published,
    author: { name: 'FeedSport Nutrition Team', role: 'Nutrition', image: '/favicon.webp' },
    readingTime: '',
  }));
}
