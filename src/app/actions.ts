'use server';

import {
  addDoc,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { BlogPost, BlogPostSchema } from '@/types';
import { z } from 'zod';

const postsCollection = collection(db, 'blogPosts');

// Schema for form data validation
const BlogFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url('Must be a valid URL'),
});

// --- BLOG ACTIONS ---

// Fetch all posts
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const snapshot = await getDocs(postsCollection);
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<BlogPost, 'id'>),
  }));
}

// Fetch a single post by slug
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const q = query(postsCollection, where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as Omit<BlogPost, 'id'>) };
}

// Fetch a single post by ID
export async function getPostById(id: string): Promise<BlogPost | null> {
    const docRef = doc(db, 'blogPosts', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as BlogPost;
    } else {
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

  const { title } = validation.data;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const postData = {
    ...validation.data,
    slug,
    // These would be dynamic in a real app with users
    author: {
        name: 'Admin User',
        role: 'Site Administrator',
        image: '/images/authors/doctor.png'
    },
    date: new Date().toISOString(),
    readingTime: `${Math.ceil(validation.data.content.split(' ').length / 200)} min read`,
    tags: [validation.data.category, 'New'],
    featured: false, // Default value
  };

  try {
    if (postId) {
      // Update existing post
      const postRef = doc(db, 'blogPosts', postId);
      await updateDoc(postRef, postData);
    } else {
      // Create new post
      await addDoc(postsCollection, postData);
    }

    // Revalidate paths to show updated content
    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    revalidatePath('/admin/blog');

    return { success: true };
  } catch (error) {
    console.error('Error saving blog post:', error);
    return { success: false, errors: { _server: ['Failed to save post.'] } };
  }
}
