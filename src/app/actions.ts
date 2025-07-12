

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
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { BlogPost, BlogCategory, User, Product, Ingredient, ProductCategory, Composition } from '@/types';
import { z } from 'zod';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { RecommendIngredientCombinationsInput, RecommendIngredientCombinationsOutput, recommendIngredientCombinations } from '@/ai/flows/recommend-ingredient-combinations';
import { generateProductDetails, GenerateProductDetailsInput, GenerateProductDetailsOutput } from '@/ai/flows/generate-product-details';
import { getNutrients } from '@/data/nutrients';
import type { Conversation, Message } from '@/types/chat';
import { chatWithSalesAgent, ChatInput } from '@/ai/flows/chat';


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

// --- CHAT ACTIONS ---
const conversationsCollection = collection(db, 'conversations');

export async function startOrGetConversation(conversationId?: string): Promise<Conversation> {
  if (conversationId) {
    const docRef = doc(db, 'conversations', conversationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const messages = (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp.toJSON() // Convert Timestamp to plain object
      }));
      return { id: docSnap.id, startTime: data.startTime.toJSON(), messages } as Conversation;
    }
  }

  // Create a new conversation
  const newConversation: Omit<Conversation, 'id' | 'startTime'> & { startTime: Timestamp } = {
    startTime: Timestamp.now(),
    messages: [],
  };
  const docRef = await addDoc(conversationsCollection, newConversation);
  
  return { id: docRef.id, startTime: newConversation.startTime.toJSON(), messages: [] };
}


export async function addMessage(conversationId: string, content: string): Promise<Conversation> {
  const conversationRef = doc(db, 'conversations', conversationId);

  // 1. Add user message
  const userMessage: Message = {
    role: 'user',
    content: content,
    timestamp: Timestamp.now(),
  };

  await updateDoc(conversationRef, {
    messages: arrayUnion(userMessage),
  });

  // 2. Get current conversation history to pass to AI
  const updatedSnap = await getDoc(conversationRef);
  const conversationData = updatedSnap.data() as Omit<Conversation, 'id'>;

  // 3. Get AI response
  const aiInput: ChatInput = {
    history: conversationData.messages.map(msg => ({ role: msg.role, content: msg.content })),
  };
  const aiResponseContent = await chatWithSalesAgent(aiInput);
  
  // 4. Add AI message
  const aiMessage: Message = {
    role: 'model',
    content: aiResponseContent,
    timestamp: Timestamp.now(),
  };

  await updateDoc(conversationRef, {
    messages: arrayUnion(aiMessage),
  });
  
  // 5. Return the final state of the conversation
  const finalSnap = await getDoc(conversationRef);
  revalidatePath('/admin/conversations');
  const finalData = finalSnap.data()!;
  const messages = (finalData.messages || []).map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp.toJSON() // Convert Timestamp
  }));

  return { id: finalSnap.id, startTime: finalData.startTime.toJSON(), messages } as Conversation;
}


export async function getConversations(): Promise<Conversation[]> {
  try {
    const q = query(conversationsCollection, orderBy('startTime', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Manually convert Timestamps to serializable objects (e.g., JSON representation)
      const messages = (data.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp.toJSON(), // Convert Timestamp to a serializable object
      }));

      return {
        id: doc.id,
        startTime: data.startTime.toJSON(), // Convert Timestamp
        messages: messages,
      } as Conversation;
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
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
      // Create a default admin user if no users exist
      const defaultAdmin: Omit<User, 'id'> = {
        name: 'Admin User',
        email: 'admin@feedsport.com',
        role: 'Administrator',
        image: `https://placehold.co/100x100/6366f1/ffffff?text=A`,
        bio: 'Default site administrator.',
        lastActive: new Date().toISOString(),
      };
      const docRef = await addDoc(usersCollection, defaultAdmin);
      return [{ id: docRef.id, ...defaultAdmin }];
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
    const productsSnapshot = await getDocs(productsCollection);
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

