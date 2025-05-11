
// Scripts for firebase and firebase messaging
// IMPORTANT: Make sure you are using versions compatible with your main app's Firebase SDK
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js");

// --- Firebase Project Configuration ---
// These values should match the ones used in your main application (src/lib/firebase.ts)
// and should be for the 'chat-akmx' project.
const firebaseConfig = {
  apiKey: "AIzaSyBBn_9sXiqfCcQ_RWm3FNUVEC2_wInKdqk",
  authDomain: "chat-akmx.firebaseapp.com",
  projectId: "chat-akmx",
  storageBucket: "chat-akmx.firebasestorage.app",
  messagingSenderId: "604325744401",
  appId: "1:604325744401:web:57f38e056b00bb02da06b0",
  measurementId: "G-GSX7G0799G" 
};
// --- End of Firebase Project Configuration ---


if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && firebaseConfig.apiKey !== "AIzaSyBBn_9sXiqfCcQ_RWm3FNUVEC2_wInKdqk_PLACEHOLDER" && firebaseConfig.apiKey !== "AIzaSyBwsgPN_ZriWzPo9b7xodH-MtWyy_A7MYI_PLACEHOLDER") { // Added a check to avoid re-init with placeholders if old file was cached
    try {
        firebase.initializeApp(firebaseConfig);

        const messaging = firebase.messaging();

        messaging.onBackgroundMessage((payload) => {
          console.log(
            "[firebase-messaging-sw.js] Received background message ",
            payload
          );
          
          // Customize notification here
          const notificationTitle = payload.notification?.title || "New Alert";
          const notificationOptions = {
            body: payload.notification?.body || "You have a new update.",
            icon: payload.notification?.icon || "/logo-192.png", // Ensure you have a logo-192.png in /public
            data: payload.data // Pass along any data for click actions
          };

          self.registration.showNotification(notificationTitle, notificationOptions);
        });
        
        // Optional: Handle notification click
        self.addEventListener('notificationclick', (event) => {
            event.notification.close();
            const targetUrl = event.notification.data?.url || '/dashboard'; // Default to dashboard if no URL
            
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                    // Check if a window with the target URL is already open.
                    for (const client of clientList) {
                        if (client.url === targetUrl && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // If not, open a new window.
                    if (clients.openWindow) {
                        return clients.openWindow(targetUrl);
                    }
                })
            );
        });


    } catch (error) {
        console.error("[firebase-messaging-sw.js] Error initializing Firebase or setting up background listener:", error);
    }
} else {
    console.warn("[firebase-messaging-sw.js] Firebase configuration is missing valid values. Service worker will not function correctly.");
}

