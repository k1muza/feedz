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
  query,
  where,
  limit,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { BlogPost, BlogPostSchema } from '@/types';
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

// Schema for form data validation
const BlogFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url('Must be a valid URL'),
});

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
    author: {
        name: 'Admin User',
        role: 'Site Administrator',
        image: '/images/authors/doctor.png'
    },
    date: new Date().toISOString(),
    readingTime: `${Math.ceil(validation.data.content.split(' ').length / 200)} min read`,
    tags: [validation.data.category, 'New'],
    featured: false,
  };

  try {
    if (postId) {
      const postRef = doc(db, 'blogPosts', postId);
      await updateDoc(postRef, postData);
    } else {
      await addDoc(postsCollection, postData);
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
