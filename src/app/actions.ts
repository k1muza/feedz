
'use server';

import { config } from 'dotenv';
config();

import {
  addDoc,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  writeBatch,
  Timestamp,
  orderBy,
  arrayUnion,
  setDoc,
} from 'firebase/firestore';
import { getDatabase, ref, get, set, push, serverTimestamp, child, onValue } from 'firebase/database';
import { revalidatePath } from 'next/cache';
import { db, rtdb } from '@/lib/firebase';
import { BlogPost, BlogCategory, User, Product, Ingredient, ProductCategory, Composition, ContactInquiry, NewsletterSubscription, AppSettings, Policy, Invoice, InvoiceItem } from '@/types';
import { z } from 'zod';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { RecommendIngredientCombinationsInput, RecommendIngredientCombinationsOutput, recommendIngredientCombinations } from '@/ai/flows/recommend-ingredient-combinations';
import { generateProductDetails, GenerateProductDetailsInput, GenerateProductDetailsOutput } from '@/ai/flows/generate-product-details';
import { getNutrients } from '@/data/nutrients';
import type { Conversation, Message } from '@/types/chat';
import { routeInquiry } from '@/ai/flows/router';


const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export type S3Asset = {
  key: string;
  url: string;
  size: number;
  lastModified: Date;
};

// --- AI ACTIONS ---

export async function getRecommendations(
  input: RecommendIngredientCombinationsInput
): Promise<RecommendIngredientCombinationsOutput> {
  return await recommendIngredientCombinations(input);
}

export async function getProductSuggestions(
  input: GenerateProductDetailsInput
): Promise<GenerateProductDetailsOutput> {
  return await generateProductDetails(input);
}

// --- CONTACT & NEWSLETTER ACTIONS ---

const ContactInquirySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  message: z.string().min(1, 'Message is required'),
  phone: z.string().optional(),
});

export async function saveContactInquiry(formData: z.infer<typeof ContactInquirySchema>) {
  const validation = ContactInquirySchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  try {
    await addDoc(collection(db, 'inquiries'), {
      ...validation.data,
      submittedAt: Timestamp.now(),
      read: false,
    });
    revalidatePath('/admin/inquiries');
    return { success: true };
  } catch (error) {
    console.error("Error saving contact inquiry:", error);
    return { success: false, error: 'Failed to submit inquiry.' };
  }
}

const NewsletterSubscriptionSchema = z.string().email('Invalid email address.');

export async function saveNewsletterSubscription(email: string) {
  const validation = NewsletterSubscriptionSchema.safeParse(email);
  if (!validation.success) {
    return { success: false, error: 'Please provide a valid email address.' };
  }
  
  try {
    const subscriptionsRef = collection(db, 'newsletterSubscriptions');
    const q = query(subscriptionsRef, where('email', '==', email), limit(1));
    const existing = await getDocs(q);

    if (!existing.empty) {
      return { success: false, error: 'This email is already subscribed.' };
    }

    await addDoc(subscriptionsRef, {
      email: validation.data,
      subscribedAt: Timestamp.now(),
    });
    
    revalidatePath('/admin/subscribers');
    return { success: true };
  } catch (error) {
    console.error("Error saving newsletter subscription:", error);
    return { success: false, error: 'Failed to subscribe.' };
  }
}


export async function getContactInquiries(): Promise<ContactInquiry[]> {
  try {
    const q = query(collection(db, 'inquiries'), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt.toJSON(),
      } as ContactInquiry;
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return [];
  }
}

export async function getNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
   try {
    const q = query(collection(db, 'newsletterSubscriptions'), orderBy('subscribedAt', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt.toJSON(),
      } as NewsletterSubscription;
    });
  } catch (error) {
    console.error("Error fetching newsletter subscriptions:", error);
    return [];
  }
}


// --- CHAT ACTIONS (RTDB) ---

export async function startOrGetConversation(uid: string): Promise<Conversation> {
  const chatRef = ref(rtdb, `chats/${uid}`);
  const snapshot = await get(chatRef);

  if (snapshot.exists()) {
    const data = snapshot.val();
    const messages = data.messages ? Object.values(data.messages) : [];
    return {
      id: uid,
      startTime: data.startTime,
      messages: messages as Message[],
      aiSuspended: data.aiSuspended || false,
      lastMessage: data.lastMessage,
    };
  } else {
    // Create a new conversation with a welcome message
    const welcomeMessage: Message = {
      role: 'model',
      content: "Hi there! I'm Feedy, your friendly AI assistant. How can I help you with your animal nutrition needs today?",
      timestamp: Date.now(),
    };
    const messagesRef = ref(rtdb, `chats/${uid}/messages`);
    const newMessageRef = push(messagesRef);

    const newConversationData = {
      startTime: serverTimestamp(),
      messages: { [newMessageRef.key!]: welcomeMessage },
      lastMessage: welcomeMessage,
      aiSuspended: false,
    };
    
    await set(chatRef, newConversationData);
    
    return { 
      id: uid, 
      startTime: Date.now(), 
      messages: [welcomeMessage],
      aiSuspended: false,
      lastMessage: welcomeMessage,
    };
  }
}

export async function addMessage(uid: string, content: string): Promise<Conversation> {
  const chatRef = ref(rtdb, `chats/${uid}`);
  const messagesRef = ref(rtdb, `chats/${uid}/messages`);
  
  // 1. Add user message
  const userMessage: Message = {
    role: 'user',
    content,
    timestamp: Date.now(),
  };
  await push(messagesRef, userMessage);
  
  // Update last message for admin view
  await set(child(chatRef, 'lastMessage'), userMessage);


  // 2. Check if AI chat is enabled globally and for this specific conversation
  const settings = await getAppSettings();
  const convoSnapshot = await get(chatRef);
  const isAiSuspended = convoSnapshot.val()?.aiSuspended || false;

  if (!settings.aiChatEnabled || isAiSuspended) {
      return startOrGetConversation(uid);
  }

  // 3. Get current conversation history to pass to AI
  const currentConversation = await startOrGetConversation(uid);

  // 4. Get AI response using the router flow
  const aiInput = {
    history: currentConversation.messages.map(msg => ({ role: msg.role, content: msg.content })),
  };
  const aiResponseContent = await routeInquiry(aiInput);
  
  // 5. Add AI message
  const aiMessage: Message = {
    role: 'model',
    content: aiResponseContent,
    timestamp: Date.now(),
  };
  await push(messagesRef, aiMessage);
  await set(child(chatRef, 'lastMessage'), aiMessage);
  
  // 6. Return the final state of the conversation
  revalidatePath('/admin/conversations');
  return startOrGetConversation(uid);
}


export async function addAdminMessage(uid: string, content: string): Promise<{ success: boolean; error?: string }> {
  const chatRef = ref(rtdb, `chats/${uid}`);
  const messagesRef = ref(rtdb, `chats/${uid}/messages`);

  const adminMessage: Message = {
    role: 'model', // Admins are treated as the 'model' role
    content,
    timestamp: Date.now(),
  };

  try {
    await push(messagesRef, adminMessage);
    await set(child(chatRef, 'lastMessage'), adminMessage);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending admin message:", error);
    return { success: false, error: error.message };
  }
}

export async function getConversations(): Promise<Conversation[]> {
  try {
    const chatsRef = ref(rtdb, 'chats');
    const snapshot = await get(chatsRef);
    if (!snapshot.exists()) {
      return [];
    }
    
    const allChats = snapshot.val();
    const conversations: Conversation[] = Object.keys(allChats).map(uid => {
      const chatData = allChats[uid];
      const messages = chatData.messages ? Object.values(chatData.messages) as Message[] : [];
      return {
        id: uid,
        startTime: chatData.startTime,
        messages: messages,
        lastMessage: chatData.lastMessage,
        aiSuspended: chatData.aiSuspended || false,
      };
    });

    // Sort by last message timestamp, descending
    conversations.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));

    return conversations;
  } catch (error) {
    console.error("Error fetching conversations from RTDB:", error);
    return [];
  }
}

export async function setAiSuspension(uid: string, suspended: boolean) {
  try {
    const chatRef = ref(rtdb, `chats/${uid}/aiSuspended`);
    await set(chatRef, suspended);
    revalidatePath('/admin/conversations');
    return { success: true };
  } catch (error) {
    console.error("Error setting AI suspension:", error);
    return { success: false, error: "Failed to update AI suspension status." };
  }
}

// --- S3 ASSET ACTIONS ---

export async function getSignedS3Url(filename: string, contentType: string, size: number) {
  if (size > 10 * 1024 * 1024) { // 10 MB limit
    return { success: false, error: 'File size must be less than 10MB.' };
  }

  const putObjectCommand = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: filename,
    ContentType: contentType,
    ContentLength: size,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 60, // URL expires in 60 seconds
    });
    
    // Construct the CloudFront URL
    const cloudfrontUrl = `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${filename}`;

    return { success: true, signedUrl: signedUrl, assetUrl: cloudfrontUrl };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { success: false, error: 'Could not get a signed URL for upload.' };
  }
}

export async function listS3Assets(): Promise<S3Asset[]> {
    const command = new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        MaxKeys: 50, // Limit results for now
    });

    try {
        const { Contents } = await s3Client.send(command);
        if (!Contents) {
            return [];
        }

        const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
        if (!cloudfrontDomain) {
            throw new Error("CloudFront domain is not configured in environment variables.");
        }

        const assets: S3Asset[] = Contents
            .filter(item => item.Key && item.Size && item.Size > 0) // Filter out empty objects/folders
            .map(item => ({
                key: item.Key!,
                url: `https://${cloudfrontDomain}/${item.Key}`,
                size: item.Size || 0,
                lastModified: item.LastModified || new Date(),
            }))
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()); // Sort by most recent

        return assets;
    } catch (error) {
        console.error("Error listing S3 assets:", error);
        return [];
    }
}

export async function deleteS3Asset(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  });

  try {
    await s3Client.send(command);
    revalidatePath('/admin/assets'); // Revalidate the page cache
    return { success: true };
  } catch (error) {
    console.error("Error deleting S3 asset:", error);
    return { success: false, error: 'Failed to delete asset from S3.' };
  }
}


// --- BLOG ACTIONS ---

const postsCollection = collection(db, 'blogPosts');
const blogCategoriesCollection = collection(db, 'blogCategories');


// -- Blog Category Actions --

export async function getBlogCategories(): Promise<BlogCategory[]> {
  try {
    const snapshot = await getDocs(query(blogCategoriesCollection));
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<BlogCategory, 'id'>)
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching blog categories:", error);
    return [];
  }
}

export async function addBlogCategory(name: string) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Category name cannot be empty.' };
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  
  try {
    await addDoc(blogCategoriesCollection, { name, slug });
    revalidatePath('/admin/blog');
    revalidatePath('/admin/blog/create');
    return { success: true };
  } catch (error) {
    console.error('Error adding category:', error);
    return { success: false, error: 'Failed to add category.' };
  }
}

export async function updateBlogCategory(id: string, name: string) {
   if (!name || name.trim().length === 0) {
    return { success: false, error: 'Category name cannot be empty.' };
  }
  try {
    const categoryRef = doc(db, 'blogCategories', id);
    await updateDoc(categoryRef, { name });
    revalidatePath('/admin/blog');
     revalidatePath('/admin/blog/create');
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error: 'Failed to update category.' };
  }
}

export async function deleteBlogCategory(id: string) {
  try {
    // Optional: Check if any posts are using this category before deleting.
    // For simplicity, we'll just delete it.
    const categoryRef = doc(db, 'blogCategories', id);
    await deleteDoc(categoryRef);
    revalidatePath('/admin/blog');
     revalidatePath('/admin/blog/create');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Failed to delete category.' };
  }
}


// -- Post Actions --

// Schema for form data validation
const BlogFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url('Must be a valid URL'),
  tags: z.string().optional(),
  authorId: z.string().min(1, 'Author is required'),
});

// Fetch all posts
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const snapshot = await getDocs(postsCollection);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
        const data = doc.data() as Omit<BlogPost, 'id'>;
        return {
            id: doc.id,
            ...data,
            author: data.author && typeof data.author === 'object' && !('path' in data.author)
                ? data.author
                : { name: 'Deleted User', role: 'N/A', image: '/images/default-avatar.png' }
        };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

// Fetch a single post by slug
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const q = query(postsCollection, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }
    const docData = snapshot.docs[0];
    return { id: docData.id, ...docData.data() } as BlogPost;
  } catch (error) {
    console.error(`Error fetching post by slug ${slug}:`, error);
    return null;
  }
}

// Create or Update a blog post
export async function saveBlogPost(
  data: z.infer<typeof BlogFormSchema>,
  postId?: string
) {
  const validation = BlogFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

  const { title, tags, authorId, ...restData } = validation.data;
  
  const authorDocRef = doc(db, 'users', authorId);
  const authorSnap = await getDoc(authorDocRef);

  if (!authorSnap.exists()) {
    return { success: false, errors: { _server: ['Selected author not found.'] } };
  }

  const authorData = authorSnap.data() as User;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  
  const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  const postData = {
    ...restData,
    slug,
    tags: tagsArray,
    author: {
        name: authorData.name,
        role: authorData.role,
        image: authorData.image
    },
    date: new Date().toISOString(),
    readingTime: `${Math.ceil(validation.data.content.split(' ').length / 200)} min read`,
  };

  try {
    if (postId) {
      const postRef = doc(db, 'blogPosts', postId);
      await updateDoc(postRef, postData);
    } else {
      await addDoc(postsCollection, { ...postData, featured: false });
    }

    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    revalidatePath('/admin/blog');
    revalidatePath('/sitemap.xml');

    return { success: true };
  } catch (error) {
    console.error('Error saving blog post:', error);
    return { success: false, errors: { _server: ['Failed to save post.'] } };
  }
}

export async function updatePostFeaturedStatus(postId: string, isFeatured: boolean) {
  try {
    const postRef = doc(db, 'blogPosts', postId);
    await updateDoc(postRef, { featured: isFeatured });

    revalidatePath('/admin/blog');
    revalidatePath('/blog');

    return { success: true };
  } catch (error) {
    console.error('Error updating featured status:', error);
    return { success: false, error: 'Failed to update post.' };
  }
}


// --- USER ACTIONS ---

const usersCollection = collection(db, 'users');

const UserFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['Administrator', 'Editor', 'Viewer']),
  image: z.string().url('A valid image URL is required'),
  bio: z.string().optional(),
});


export async function getAllUsers(): Promise<User[]> {
  try {
    const snapshot = await getDocs(query(usersCollection));
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<User, 'id'>)
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function saveUser(
  data: z.infer<typeof UserFormSchema>,
  userId?: string
) {
  const validation = UserFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

  const userData = {
    ...validation.data,
    lastActive: new Date().toISOString(),
  };

  try {
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, userData);
    } else {
      await addDoc(usersCollection, userData);
    }
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error saving user:', error);
    return { success: false, errors: { _server: ['Failed to save user.'] } };
  }
}


export async function deleteUser(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user.' };
  }
}


// --- PRODUCT & INGREDIENT ACTIONS ---

const productsCollection = collection(db, 'products');
const ingredientsCollection = collection(db, 'ingredients');
const productCategoriesCollection = collection(db, 'productCategories');

// Schemas for validation
const IngredientFormSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required.'),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  key_benefits: z.string().optional(),
  applications: z.string().optional(),
});

const ProductFormSchema = z.object({
  ingredientId: z.string().min(1, 'An ingredient must be selected.'),
  packaging: z.string().min(1, 'Packaging information is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  moq: z.coerce.number().positive('MOQ must be a positive number.'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative.'),
  certifications: z.string().optional(),
  images: z.array(z.string().url()).min(1, 'At least one image is required.'),
  shipping: z.string().optional(),
  featured: z.boolean().optional(),
});


// -- Product Category Actions --

export async function getProductCategories(): Promise<ProductCategory[]> {
  try {
    const snapshot = await getDocs(query(productCategoriesCollection));
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<ProductCategory, 'id'>)
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching product categories:", error);
    return [];
  }
}

export async function addProductCategory(name: string) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Category name cannot be empty.' };
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  
  try {
    await addDoc(productCategoriesCollection, { name, slug });
    revalidatePath('/admin/products');
    revalidatePath('/admin/products/create');
    revalidatePath('/admin/ingredients');
    revalidatePath('/admin/ingredients/create');
    revalidatePath('/'); // For footer
    return { success: true };
  } catch (error) {
    console.error('Error adding product category:', error);
    return { success: false, error: 'Failed to add category.' };
  }
}

export async function updateProductCategory(id: string, name: string) {
   if (!name || name.trim().length === 0) {
    return { success: false, error: 'Category name cannot be empty.' };
  }
  try {
    const categoryRef = doc(db, 'productCategories', id);
    await updateDoc(categoryRef, { name });
    revalidatePath('/admin/products');
    revalidatePath('/admin/products/create');
    revalidatePath('/admin/ingredients');
    revalidatePath('/admin/ingredients/create');
    revalidatePath('/'); // For footer
    return { success: true };
  } catch (error) {
    console.error('Error updating product category:', error);
    return { success: false, error: 'Failed to update category.' };
  }
}

export async function deleteProductCategory(id: string) {
  try {
    const categoryRef = doc(db, 'productCategories', id);
    await deleteDoc(categoryRef);
    revalidatePath('/admin/products');
    revalidatePath('/admin/products/create');
    revalidatePath('/admin/ingredients');
    revalidatePath('/admin/ingredients/create');
    revalidatePath('/'); // For footer
    return { success: true };
  } catch (error) {
    console.error('Error deleting product category:', error);
    return { success: false, error: 'Failed to delete category.' };
  }
}


// Fetch all ingredients
export async function getAllIngredients(): Promise<Ingredient[]> {
  try {
    const snapshot = await getDocs(ingredientsCollection);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Ingredient, 'id'>)
    }));
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return [];
  }
}

// Fetch a single ingredient by ID
export async function getIngredientById(id: string): Promise<Ingredient | null> {
    try {
        const ingredientDocRef = doc(db, 'ingredients', id);
        const ingredientSnap = await getDoc(ingredientDocRef);

        if (!ingredientSnap.exists()) {
            console.warn(`Ingredient with ID ${id} not found.`);
            return null;
        }

        const ingredientData = ingredientSnap.data() as Omit<Ingredient, 'id'>;
        const allNutrients = getNutrients();
        const nutrientsMap = new Map(allNutrients.map(n => [n.id, n]));
        
        if (ingredientData.compositions) {
            ingredientData.compositions = ingredientData.compositions.map(comp => ({
                ...comp,
                nutrient: nutrientsMap.get(comp.nutrientId)
            }));
        }

        return {
            id: ingredientSnap.id,
            ...ingredientData,
        };

    } catch (error) {
        console.error("Error fetching ingredient by ID:", error);
        return null;
    }
}


// Save (Create/Update) an ingredient
export async function saveIngredient(
  ingredientData: z.infer<typeof IngredientFormSchema>,
  ingredientId?: string
) {
  const validation = IngredientFormSchema.safeParse(ingredientData);

  if (!validation.success) {
      return { success: false, errors: validation.error.flatten().fieldErrors };
  }

  try {
    const { key_benefits, applications, ...rest } = validation.data;
    const ingredientPayload = {
      ...rest,
      key_benefits: key_benefits?.split(',').map(s => s.trim()).filter(Boolean) || [],
      applications: applications?.split(',').map(s => s.trim()).filter(Boolean) || [],
    };
    
    if (ingredientId) {
      const ingredientRef = doc(db, 'ingredients', ingredientId);
      await updateDoc(ingredientRef, ingredientPayload);
    } else {
      await addDoc(ingredientsCollection, { ...ingredientPayload, compositions: [] });
    }

    revalidatePath('/admin/ingredients');
    revalidatePath(`/admin/ingredients/${ingredientId || ''}`);

    return { success: true };
  } catch (error) {
    console.error('Error saving ingredient:', error);
    return { success: false, errors: { _server: ['Failed to save ingredient to the database.'] } };
  }
}

export async function deleteIngredient(ingredientId: string) {
    // Optional: Check if any products are using this ingredient before deleting
    try {
        await deleteDoc(doc(db, "ingredients", ingredientId));
        revalidatePath('/admin/ingredients');
        return { success: true };
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        return { success: false, error: 'Failed to delete ingredient.' };
    }
}


// Fetch all products and populate their ingredient data
export async function getAllProducts(): Promise<Product[]> {
  try {
    const productsSnapshot = await getDocs(query(productsCollection));
    if (productsSnapshot.empty) {
      return [];
    }
    
    const ingredients = await getAllIngredients();
    const ingredientsMap = new Map(ingredients.map(i => [i.id, i]));

    const allNutrients = getNutrients();
    const nutrientsMap = new Map(allNutrients.map(n => [n.id, n]));

    return productsSnapshot.docs.map(doc => {
      const productData = doc.data() as Omit<Product, 'id'>;
      const ingredient = ingredientsMap.get(productData.ingredientId);
      
      if (ingredient && ingredient.compositions) {
          ingredient.compositions = ingredient.compositions.map(comp => ({
              ...comp,
              nutrient: nutrientsMap.get(comp.nutrientId)
          }));
      }
      
      return {
        id: doc.id,
        ...productData,
        ingredient: ingredient
      };
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Fetch a single product by ID
export async function getProductById(id: string): Promise<Product | null> {
    try {
        const productDocRef = doc(db, 'products', id);
        const productSnap = await getDoc(productDocRef);

        if (!productSnap.exists()) {
            console.warn(`Product with ID ${id} not found.`);
            return null;
        }

        const productData = productSnap.data() as Omit<Product, 'id'>;
        let ingredientData: Ingredient | undefined = undefined;

        if (productData.ingredientId) {
            const ingredientDocRef = doc(db, 'ingredients', productData.ingredientId);
            const ingredientSnap = await getDoc(ingredientDocRef);
            
            if (ingredientSnap.exists()) {
                ingredientData = { id: ingredientSnap.id, ...ingredientSnap.data() } as Ingredient;
                
                const allNutrients = getNutrients();
                const nutrientsMap = new Map(allNutrients.map(n => [n.id, n]));
                
                if (ingredientData.compositions) {
                    ingredientData.compositions = ingredientData.compositions.map(comp => ({
                        ...comp,
                        nutrient: nutrientsMap.get(comp.nutrientId)
                    }));
                }
            }
        }

        return {
            id: productSnap.id,
            ...productData,
            ingredient: ingredientData
        };

    } catch (error) {
        console.error("Error fetching product by ID:", error);
        return null;
    }
}


// Save (Create/Update) a product
export async function saveProduct(
  productData: z.infer<typeof ProductFormSchema>,
  productId?: string,
) {
  const validation = ProductFormSchema.safeParse(productData);

  if (!validation.success) {
      return { success: false, errors: validation.error.flatten().fieldErrors };
  }
  
  try {
    const { certifications, ...rest } = validation.data;
    const finalProductData = {
      ...rest,
      certifications: certifications?.split(',').map(s => s.trim()).filter(Boolean) || [],
    };

    if (productId) {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, finalProductData);
    } else {
      await addDoc(productsCollection, {
        ...finalProductData,
        featured: finalProductData.featured || false,
      });
    }

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${productId || ''}`);
    revalidatePath('/products');

    return { success: true };
  } catch (error) {
    console.error('Error saving product:', error);
    return { success: false, errors: { _server: ['Failed to save product to the database.'] } };
  }
}

export async function deleteProduct(productId: string) {
    try {
        await deleteDoc(doc(db, "products", productId));
        revalidatePath('/admin/products');
        revalidatePath('/products');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: 'Failed to delete product.' };
    }
}

export async function updateProductStock(productId: string, newStock: number) {
    try {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, { stock: newStock });
        revalidatePath('/admin/stock');
        revalidatePath('/admin/products');
        return { success: true };
    } catch (error) {
        console.error('Error updating stock:', error);
        return { success: false, error: 'Failed to update stock.' };
    }
}

export async function updateIngredientCompositions(
    ingredientId: string,
    compositions: Composition[]
) {
    try {
        const ingredientRef = doc(db, 'ingredients', ingredientId);
        const compositionsToStore = compositions.map(({ nutrient, ...rest }) => rest);
        await updateDoc(ingredientRef, { compositions: compositionsToStore });
        revalidatePath(`/admin/ingredients/${ingredientId}/edit`);
        revalidatePath(`/admin/products`);
        return { success: true };
    } catch (error) {
        console.error('Error updating ingredient compositions:', error);
        return { success: false, error: 'Failed to update compositions.' };
    }
}

// --- POLICY ACTIONS ---

const policiesCollection = collection(db, 'policies');
const PolicyFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export async function getAllPolicies(): Promise<Policy[]> {
    try {
        const snapshot = await getDocs(query(policiesCollection, orderBy('title')));
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                lastUpdated: data.lastUpdated.toJSON(),
            } as Policy;
        });
    } catch (error) {
        console.error("Error fetching policies:", error);
        return [];
    }
}

export async function getPolicyById(id: string): Promise<Policy | null> {
    try {
        const docRef = doc(db, 'policies', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            lastUpdated: data.lastUpdated.toJSON(),
        } as Policy;
    } catch (error) {
        console.error("Error fetching policy by ID:", error);
        return null;
    }
}

export async function savePolicy(data: z.infer<typeof PolicyFormSchema>, policyId?: string) {
    const validation = PolicyFormSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Validation failed" };
    }

    const payload = {
        ...validation.data,
        lastUpdated: Timestamp.now(),
    };

    try {
        if (policyId) {
            await updateDoc(doc(db, 'policies', policyId), payload);
        } else {
            await addDoc(policiesCollection, payload);
        }
        revalidatePath('/admin/policies');
        revalidatePath('/policies');
        return { success: true };
    } catch (error) {
        console.error("Error saving policy:", error);
        return { success: false, error: "Failed to save policy." };
    }
}

export async function deletePolicy(policyId: string) {
    try {
        await deleteDoc(doc(db, 'policies', policyId));
        revalidatePath('/admin/policies');
        revalidatePath('/policies');
        return { success: true };
    } catch (error) {
        console.error("Error deleting policy:", error);
        return { success: false, error: 'Failed to delete policy.' };
    }
}

// --- INVOICE ACTIONS ---

const invoicesCollection = collection(db, 'invoices');

export async function createInvoice(invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await addDoc(invoicesCollection, {
      ...invoiceData,
      invoiceNumber: `INV-${Date.now()}`, // Simple invoice number for now
    });
    revalidatePath('/admin/invoices');
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: 'Failed to create invoice.' };
  }
}

const toJSONSafe = (timestamp: any) => {
    if (timestamp && typeof timestamp.toJSON === 'function') {
        return timestamp.toJSON();
    }
    // Handle cases where it might already be a string or needs a default
    return timestamp ? new Date(timestamp).toJSON() : new Date().toJSON();
};


export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const snapshot = await getDocs(query(invoicesCollection, orderBy('date', 'desc')));
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: toJSONSafe(data.date),
            dueDate: toJSONSafe(data.dueDate),
        } as Invoice;
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
    try {
        const docRef = doc(db, 'invoices', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            date: toJSONSafe(data.date),
            dueDate: toJSONSafe(data.dueDate),
        } as Invoice;
    } catch (error) {
        console.error("Error fetching invoice by ID:", error);
        return null;
    }
}

export async function updateInvoice(id: string, invoiceData: Partial<Omit<Invoice, 'id' | 'invoiceNumber'>>) {
    try {
        await updateDoc(doc(db, 'invoices', id), invoiceData);
        revalidatePath('/admin/invoices');
        revalidatePath(`/admin/invoices/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating invoice:", error);
        return { success: false, error: "Failed to update invoice." };
    }
}

export async function deleteInvoice(id: string) {
    try {
        await deleteDoc(doc(db, 'invoices', id));
        revalidatePath('/admin/invoices');
        return { success: true };
    } catch (error) {
        console.error("Error deleting invoice:", error);
        return { success: false, error: "Failed to delete invoice." };
    }
}



// --- SEARCH ---

export async function search(query: string) {
    const [products, blogPosts] = await Promise.all([
        getAllProducts(),
        getAllBlogPosts(),
    ]);

    const lowerCaseQuery = query.toLowerCase();

    const productResults = products
        .filter(p => 
            p.ingredient?.name.toLowerCase().includes(lowerCaseQuery) ||
            p.ingredient?.description?.toLowerCase().includes(lowerCaseQuery) ||
            p.ingredient?.category?.toLowerCase().includes(lowerCaseQuery)
        )
        .map(p => ({ ...p, type: 'product' as const }));

    const blogPostResults = blogPosts
        .filter(b => 
            b.title.toLowerCase().includes(lowerCaseQuery) ||
            b.content.toLowerCase().includes(lowerCaseQuery) ||
            b.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
        )
        .map(b => ({ ...b, type: 'blog' as const }));

    return {
        products: productResults,
        blogPosts: blogPostResults,
    };
}


// --- SETTINGS ---
const settingsDocRef = doc(db, 'app', 'settings');

export async function getAppSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
        registrationsOpen: true,
        aiChatEnabled: true,
        chatWidgetEnabled: true,
    };

    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            return { ...defaultSettings, ...(docSnap.data() as Partial<AppSettings>) };
        } else {
            // No settings doc yet, create it with defaults
            await setDoc(settingsDocRef, defaultSettings);
            return defaultSettings;
        }
    } catch (error) {
        console.error("Error getting app settings:", error);
        return defaultSettings;
    }
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
    try {
        await setDoc(settingsDocRef, settings, { merge: true });
        revalidatePath('/admin/settings');
        revalidatePath('/login');
        return { success: true };
    } catch (error) {
        console.error("Error updating app settings:", error);
        return { success: false, error: 'Failed to update settings.' };
    }
}

export async function createUserProfile(uid: string, data: { email: string | null; name: string | null; image: string | null }) {
    const userRef = doc(db, 'users', uid);
    const profile: Omit<User, 'id'> = {
        name: data.name || 'New User',
        email: data.email || '',
        role: 'Viewer', // Default role
        image: data.image || `https://placehold.co/100x100/6366f1/ffffff?text=${data.name?.[0] || 'U'}`,
        bio: '',
        lastActive: new Date().toISOString()
    };
    await setDoc(userRef, profile);
    revalidatePath('/admin/users');
}

export async function getBusinessDetails(): Promise<string> {
    // In a real app, this would fetch from Firestore, e.g., from doc(db, 'app', 'details')
    return "2 Off William Pollet Drive, Borrowdale, Harare, Zimbabwe";
}
