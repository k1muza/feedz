
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
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { BlogPost, BlogCategory, User } from '@/types';
import { z } from 'zod';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    const cloudfrontUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${filename}`;

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
                url: `${cloudfrontDomain}/${item.Key}`,
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
const categoriesCollection = collection(db, 'blogCategories');


// -- Category Actions --

export async function getBlogCategories(): Promise<BlogCategory[]> {
  try {
    const snapshot = await getDocs(query(categoriesCollection));
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
    await addDoc(categoriesCollection, { name, slug });
    revalidatePath('/admin/blog');
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
});

// Fetch all posts
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const snapshot = await getDocs(postsCollection);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<BlogPost, 'id'>),
    }));
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
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<BlogPost, 'id'>) };
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

  const { title, tags } = validation.data;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  
  const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  const postData = {
    ...validation.data,
    slug,
    tags: tagsArray,
    author: {
        name: 'Admin User',
        role: 'Site Administrator',
        image: 'https://placehold.co/100x100.png'
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
