
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging, isSupported } from 'firebase/messaging'; 

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;

const essentialConfigPresent = firebaseConfigValues.apiKey &&
                               firebaseConfigValues.authDomain &&
                               firebaseConfigValues.projectId &&
                               firebaseConfigValues.messagingSenderId &&
                               firebaseConfigValues.appId;


if (essentialConfigPresent) {
  const firebaseConfig: FirebaseOptions = {
    apiKey: firebaseConfigValues.apiKey!,
    authDomain: firebaseConfigValues.authDomain!,
    projectId: firebaseConfigValues.projectId!,
    storageBucket: firebaseConfigValues.storageBucket || "", 
    messagingSenderId: firebaseConfigValues.messagingSenderId!,
    appId: firebaseConfigValues.appId!, 
    measurementId: firebaseConfigValues.measurementId,
  };

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Failed to initialize Firebase app:", e);
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      auth = getAuth(app);
      firestore = getFirestore(app);
      storage = getStorage(app);
      if (typeof window !== 'undefined') { 
        isSupported().then(supported => {
          if (supported) {
            messaging = getMessaging(app!);
          } else {
            console.warn("Firebase Messaging not supported in this browser environment.");
          }
        }).catch(e => console.error("Error checking messaging support:", e));
      }
    } catch (e) {
      console.error("Failed to initialize Firebase services (auth, firestore, storage, messaging):", e);
    }
  }
} else {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      "Firebase configuration is missing or incomplete. Essential Firebase features (like auth, firestore, messaging) will be unavailable. " +
      "Please ensure the following environment variables are set in your .env.local file:\n" +
      "NEXT_PUBLIC_FIREBASE_API_KEY\n" +
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n" +
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID\n" +
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n" +
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n" +
      "NEXT_PUBLIC_FIREBASE_APP_ID\n" +
      "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional)\n" +
      "NEXT_PUBLIC_FCM_VAPID_KEY (for push notifications)" 
    );
  }
}

export { app, auth, firestore, storage, messaging };

/*
Example .env.local file structure:

NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyBwsgPN_ZriWzPo9b7xodH-MtWyy_A7MYI"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="black-chat-1.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="black-chat-1"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="black-chat-1.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="710462889318"
NEXT_PUBLIC_FIREBASE_APP_ID="1:710462889318:web:3efe20d79c7a8b5eb3bca7"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-3SNKN8NRN0" # Optional
NEXT_PUBLIC_FCM_VAPID_KEY="BFn7eW_EuXEQRgiSbVQGpdSepvyFHNWvjV8VPA98-WP7w2Ih05ExqljDGVDwqR1JHKDwvBsoSryVssvEA7-jlCA" # From Firebase Console > Project Settings > Cloud Messaging > Web Push certificates

*/
