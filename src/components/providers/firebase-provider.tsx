"use client";

import React, { createContext, useContext } from 'react';
import { app as firebaseAppInstance, auth as firebaseAuthInstance, firestore as firebaseFirestoreInstance, storage as firebaseStorageInstance } from '@/lib/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  storage: FirebaseStorage | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: firebaseAppInstance,
  auth: firebaseAuthInstance,
  firestore: firebaseFirestoreInstance,
  storage: firebaseStorageInstance,
});

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = { 
    app: firebaseAppInstance, 
    auth: firebaseAuthInstance, 
    firestore: firebaseFirestoreInstance, 
    storage: firebaseStorageInstance 
  };

  if (!firebaseAppInstance && process.env.NODE_ENV === 'development') {
    // This warning is now primarily in firebase.ts, but can be useful here too.
    // console.warn("FirebaseProvider: Firebase app instance is not available. Firebase features might be limited.");
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextType => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    // This fallback should ideally not be reached if the provider wraps the app.
    // Returns a context with null services, consistent with unconfigured Firebase.
    if (process.env.NODE_ENV === 'development') {
        console.warn("useFirebase called outside of FirebaseProvider or Firebase not configured. Returning null services.");
    }
    return { app: null, auth: null, firestore: null, storage: null };
  }
  return context;
};