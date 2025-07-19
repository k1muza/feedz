
'use server';

import * as admin from 'firebase-admin';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
        console.log('Notifications sent to admins successfully:', response.successCount);
        if (response.failureCount > 0) {
            response.responses.forEach(resp => {
                if (!resp.success) {
                    console.error('Failed to send admin notification:', resp.error);
                }
            });
        }
    } catch (error) {
        console.error('Error sending push notifications to admins:', error);
    }
}


export async function sendUserNotification(userId: string, messageContent: string) {
    if (!admin.apps.length) {
        console.log("Admin SDK not initialized. Skipping notification.");
        return;
    }

    // Get the specific user's token
    const tokenDocRef = doc(db, 'userFcmTokens', userId);
    const tokenSnap = await getDoc(tokenDocRef);

    if (!tokenSnap.exists()) {
        console.log(`No FCM token found for user ${userId}.`);
        return;
    }

    const token = tokenSnap.data().token;
    if (!token) {
        console.log(`Token field is empty for user ${userId}.`);
        return;
    }

    const message = {
        notification: {
            title: 'New Message from Support',
            body: messageContent.substring(0, 100),
        },
        token: token,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message to user:', response);
    } catch (error) {
        console.error('Error sending message to user:', error);
    }
}
