
'use server';

import * as admin from 'firebase-admin';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase'; // Use client-side db for reading tokens

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
  }
}

export async function sendNewMessageNotification(userId: string, messageContent: string) {
    if (!admin.apps.length) {
        console.log("Admin SDK not initialized. Skipping notification.");
        return;
    }

    const tokensSnapshot = await getDocs(collection(db, 'fcmTokens'));
    if (tokensSnapshot.empty) {
        console.log("No admin tokens to send notification to.");
        return;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    
    if (tokens.length === 0) {
        console.log("No valid tokens found.");
        return;
    }

    const message = {
        notification: {
            title: 'New Chat Message',
            body: `User...${userId.substring(userId.length - 4)}: ${messageContent.substring(0, 100)}`
        },
        webpush: {
            fcm_options: {
                link: `/admin/conversations?chatId=${userId}`
            }
        },
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('Notifications sent successfully:', response.successCount);
        if (response.failureCount > 0) {
            response.responses.forEach(resp => {
                if (!resp.success) {
                    console.error('Failed to send notification:', resp.error);
                }
            });
        }
    } catch (error) {
        console.error('Error sending push notifications:', error);
    }
}
