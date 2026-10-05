'use server';

import type {
  AppSettings,
  BlogCategory,
  BlogPost,
  ContactInquiry,
  Ingredient,
  Invoice,
  NewsletterSubscription,
  Policy,
  Product,
  ProductCategory,
  TeamMember,
  User,
} from '@/types';
import type { Conversation } from '@/types/chat';

const staticModeError = 'This operation is unavailable while FeedSport is running in static mode.';
const unavailable = () => ({ success: false, error: staticModeError });

export type S3Asset = { key: string; url: string; size: number; lastModified: Date };

export async function getRecommendations(_input: unknown): Promise<any> { return { recommendations: [], explanation: staticModeError }; }
export async function getProductSuggestions(_input: unknown): Promise<any> { return {}; }
export async function generateBlogPostAudio(_input: unknown): Promise<any> { return { audioDataUri: '' }; }

export async function saveContactInquiry(_data: unknown) { return unavailable(); }
export async function saveNewsletterSubscription(_email: string) { return unavailable(); }
export async function getContactInquiries(): Promise<ContactInquiry[]> { return []; }
export async function getNewsletterSubscriptions(): Promise<NewsletterSubscription[]> { return []; }

export async function startOrGetConversation(_uid: string): Promise<Conversation | null> { return null; }
export async function addMessage(uid: string, content: string): Promise<Conversation> {
  const message = { role: 'user' as const, content, timestamp: Date.now() };
  return { id: uid, messages: [message], lastMessage: message };
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
export async function getAllBlogPosts(): Promise<BlogPost[]> { return []; }
export async function getPostBySlug(_slug: string): Promise<BlogPost | null> { return null; }
export async function saveBlogPost(..._args: any[]): Promise<any> { return unavailable(); }
export async function updatePostFeaturedStatus(_postId: string, _featured: boolean): Promise<any> { return unavailable(); }
export async function deleteBlogPost(_postId: string): Promise<any> { return unavailable(); }

export async function getAllUsers(): Promise<User[]> { return []; }
export async function saveUser(..._args: any[]): Promise<any> { return unavailable(); }
export async function deleteUser(_id: string): Promise<any> { return unavailable(); }
export async function getAllTeamMembers(): Promise<TeamMember[]> { return []; }
export async function saveTeamMember(..._args: any[]): Promise<any> { return unavailable(); }
export async function deleteTeamMember(_id: string): Promise<any> { return unavailable(); }

export async function getProductCategories(): Promise<ProductCategory[]> { return []; }
export async function addProductCategory(_name: string): Promise<any> { return unavailable(); }
export async function updateProductCategory(_id: string, _name: string): Promise<any> { return unavailable(); }
export async function deleteProductCategory(_id: string): Promise<any> { return unavailable(); }
export async function getAllIngredients(): Promise<Ingredient[]> { return []; }
export async function getIngredientById(_id: string): Promise<Ingredient | null> { return null; }
export async function saveIngredient(..._args: any[]): Promise<any> { return unavailable(); }
export async function deleteIngredient(_id: string): Promise<any> { return unavailable(); }
export async function getAllProducts(): Promise<Product[]> { return []; }
export async function getProductById(_id: string): Promise<Product | null> { return null; }
export async function saveProduct(..._args: any[]): Promise<any> { return unavailable(); }
export async function deleteProduct(_id: string): Promise<any> { return unavailable(); }
export async function updateProductStock(_id: string, _stock: number): Promise<any> { return unavailable(); }
export async function updateIngredientCompositions(..._args: any[]): Promise<any> { return unavailable(); }

const staticPolicies: Policy[] = [
  { id: 'privacy', title: 'Privacy policy', content: 'FeedSport only uses enquiry details to respond to customers and fulfil orders.', lastUpdated: '2026-10-05', effectiveDate: '2026-10-05' },
  { id: 'supply', title: 'Supply and product information', content: 'Specifications are typical values unless a batch specification says otherwise.', lastUpdated: '2026-10-05', effectiveDate: '2026-10-05' },
];
export async function getAllPolicies(): Promise<Policy[]> { return staticPolicies; }
export async function getPolicyById(id: string): Promise<Policy | null> { return staticPolicies.find((policy) => policy.id === id) || null; }
export async function savePolicy(..._args: any[]): Promise<any> { return unavailable(); }
export async function deletePolicy(_id: string): Promise<any> { return unavailable(); }

export async function createInvoice(_invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<{ success: boolean; id?: string; error?: string }> { return unavailable(); }
export async function getAllInvoices(): Promise<Invoice[]> { return []; }
export async function getInvoiceById(_id: string): Promise<Invoice | null> { return null; }
export async function updateInvoice(..._args: any[]): Promise<any> { return unavailable(); }
export async function deleteInvoice(_id: string): Promise<any> { return unavailable(); }

export async function search(_query: string) { return { products: [] as Product[], blogPosts: [] as BlogPost[] }; }
export async function getAppSettings(): Promise<AppSettings> { return { registrationsOpen: false, aiChatEnabled: false, chatWidgetEnabled: true }; }
export async function updateAppSettings(_settings: Partial<AppSettings>) { return unavailable(); }
export async function createUserProfile(..._args: any[]) { return unavailable(); }
export async function getBusinessDetails(): Promise<string> {
  return 'FeedSport supplies feed ingredients and practical animal nutrition support in Zimbabwe. Phone or WhatsApp +263 77 468 4534.';
}
