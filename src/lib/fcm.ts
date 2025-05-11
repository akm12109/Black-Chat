
"use client";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app, firestore, auth } from "./firebase"; // app should be FirebaseApp
import { doc, setDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

// Ensure this VAPID key is correctly set in your Firebase project console
// Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration -> Web Push certificates -> Key pair
// The user provided: BFn7eW_EuXEQRgiSbVQGpdSepvyFHNWvjV8VPA98-WP7w2Ih05ExqljDGVDwqR1JHKDwvBsoSryVssvEA7-jlCA
const FCM_VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || "BFn7eW_EuXEQRgiSbVQGpdSepvyFHNWvjV8VPA98-WP7w2Ih05ExqljDGVDwqR1JHKDwvBsoSryVssvEA7-jlCA"; 

export const requestNotificationPermission = async () => {
  if (!app || !auth.currentUser || !firestore) {
    console.warn("Firebase not initialized or user not logged in. Cannot request notification permission.");
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn("Firebase Messaging is not supported in this browser.");
    toast({
        variant: "destructive",
        title: "Notifications Not Supported",
        description: "Your browser does not support push notifications.",
    });
    return null;
  }
  
  const messaging = getMessaging(app);

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
      
      if (!FCM_VAPID_KEY || FCM_VAPID_KEY === "YOUR_FCM_WEB_PUSH_CERTIFICATE_KEY_PAIR_PLACEHOLDER" || FCM_VAPID_KEY.includes("PLACEHOLDER")) { 
          console.error("VAPID key is not configured. Please set NEXT_PUBLIC_FCM_VAPID_KEY in your environment variables or update the placeholder in src/lib/fcm.ts.");
          toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Push notification VAPID key is not configured.",
          });
          return null;
      }

      const currentToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
      if (currentToken) {
        console.log("FCM Token:", currentToken);
        
        const userDocRef = doc(firestore, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, {
          fcmTokens: arrayUnion(currentToken), 
          lastTokenUpdate: serverTimestamp()
        }).catch(async (err) => { 
            console.warn("Failed to updateDoc with token, trying setDoc merge: ", err);
            await setDoc(userDocRef, {
                fcmTokens: [currentToken],
                lastTokenUpdate: serverTimestamp()
            }, { merge: true });
        });

        toast({ title: "Notifications Enabled", description: "You will now receive push notifications." });
        return currentToken;
      } else {
        console.log("No registration token available. Request permission to generate one.");
        toast({
          variant: "destructive",
          title: "Token Error",
          description: "Could not retrieve a push notification token.",
        });
        return null;
      }
    } else {
      console.log("Unable to get permission to notify.");
      toast({
        title: "Notifications Denied",
        description: "You have not granted permission for push notifications.",
      });
      return null;
    }
  } catch (err) {
    console.error("An error occurred while retrieving token or permission: ", err);
    let message = "An error occurred with push notifications.";
    if (err instanceof Error && err.message.includes("push service error")) {
        message = "Push service error. Ensure your browser supports push notifications and is not in incognito mode."
    } else if (err instanceof Error && (err.message.includes("Registration failed") || err.message.includes("Invalid VAPID key"))) {
        message = "Push notification registration failed. Please check the VAPID key configuration.";
    }
    toast({
        variant: "destructive",
        title: "Notification Error",
        description: message,
    });
    return null;
  }
};

export const initializeForegroundNotifications = () => {
    if (!app || typeof window === 'undefined') return;

    isSupported().then(supported => {
        if (!supported) {
            console.warn("Firebase Messaging not supported in this browser, cannot initialize foreground notifications.");
            return;
        }
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            console.log('Message received in foreground. ', payload);
            
            const notificationTitle = payload.notification?.title || "New Notification";
            const notificationOptions: NotificationOptions = {
                body: payload.notification?.body,
                icon: payload.notification?.icon || "/logo-192.png", // Ensure logo-192.png is in /public
            };
            
            // Check if Notification API is available before trying to use it
            if ('Notification' in window) {
              new Notification(notificationTitle, notificationOptions);
            } else {
              console.warn('Browser does not support Notification API for foreground messages.');
            }

            toast({
                title: notificationTitle,
                description: payload.notification?.body,
            });
        });
    }).catch(err => console.error("Error checking messaging support for foreground: ", err));
};

