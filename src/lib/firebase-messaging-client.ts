
'use client';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const requestNotificationPermission = async (userId: string, isEndUser: boolean = false) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
        console.log('Notification permission granted.');
        try {
            const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                
                // Save the token to the appropriate Firestore collection
                const collectionName = isEndUser ? 'userFcmTokens' : 'fcmTokens';
                const tokenRef = doc(db, collectionName, userId);
                await setDoc(tokenRef, { token: currentToken, uid: userId }, { merge: true });
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } catch (err) {
            console.log('An error occurred while retrieving token. ', err);
        }
    } else {
        console.log('Unable to get permission to notify.');
    }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
});
