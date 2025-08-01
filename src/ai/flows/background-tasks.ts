
'use server';
/**
 * @fileOverview Background task processor using Genkit flows.
 * This file defines flows that are triggered by changes in the database,
 * specifically for long-running tasks like audio generation.
 * This flow should be run as a long-running process (e.g., using `genkit start`).
 */

import { ai } from '@/ai/genkit';
import { defineFlow, firebase, onFlow } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { generateAudio } from './text-to-speech';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Define the schema for the task document in Firestore
const AudioTaskPayloadSchema = z.object({
  blogPostId: z.string(),
  text: z.string(),
});

// Define the flow that will be triggered
export const generateAudioTaskFlow = defineFlow(
  {
    name: 'generateAudioTask',
    inputSchema: AudioTaskPayloadSchema,
    outputSchema: z.void(),
    // Use the Firebase trigger to listen to new documents in `backgroundTasks`
    trigger: {
      type: 'firebase',
      // Firebase trigger configuration
      firebase: {
        collection: 'backgroundTasks',
        // Only trigger for new documents of type 'generateAudio' and status 'pending'
        where: [
          ['type', '==', 'generateAudio'],
          ['status', '==', 'pending'],
        ],
      },
    },
  },
  async (payload, streamingCallback, context) => {
    const taskId = context?.firebase?.documentRef?.id;
    if (!taskId) {
        console.error("Task ID not found in context.");
        return;
    }

    const taskRef = doc(db, 'backgroundTasks', taskId);

    try {
      // 1. Mark task as in-progress
      await updateDoc(taskRef, { status: 'processing' });
      
      // 2. Generate the audio
      const { audioDataUri } = await generateAudio({ text: payload.text });

      // 3. Update the blog post document with the new audio URL
      const blogPostRef = doc(db, 'blogPosts', payload.blogPostId);
      await updateDoc(blogPostRef, {
        audioUrl: audioDataUri,
      });

      // 4. Mark task as completed
      await updateDoc(taskRef, { 
          status: 'completed',
          result: {
              audioUrl: audioDataUri,
          }
      });
      console.log(`Audio generation task ${taskId} completed successfully.`);

    } catch (error) {
      console.error(`Error processing audio task ${taskId}:`, error);
      // Mark task as failed
      await updateDoc(taskRef, { 
          status: 'failed',
          error: (error as Error).message 
      });
    }
  }
);
