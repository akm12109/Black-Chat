
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { auth as firebaseAuthInstance, firestore as firebaseFirestoreInstance } from '@/lib/firebase'; 
import { doc, serverTimestamp, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserPermissions, AppUserBase } from '@/types/user';
import { defaultUserPermissions } from '@/types/user';

// Combine Firebase Auth User with our custom fields
export interface AppUser extends FirebaseAuthUser, AppUserBase {}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isFirebaseConfigured: boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = "akm@admin.com"; // Hardcoded admin email

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirebaseConfigured = !!firebaseAuthInstance && !!firebaseFirestoreInstance;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false); 
      setUser(null);
      console.warn("AuthProvider: Firebase is not configured. Auth features will be disabled.");
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(firebaseFirestoreInstance!, "users", firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          let appUserData: AppUserBase;

          if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data() as AppUserBase;
            appUserData = {
              ...firestoreData,
              uid: firebaseUser.uid, // Ensure UID is from firebaseUser
              email: firebaseUser.email, // Ensure email is from firebaseUser
              photoURL: firebaseUser.photoURL, // Sync photoURL from Auth
              handle: firebaseUser.displayName || firestoreData.handle, // Prefer Auth displayName
            };
            
            // Special handling for the hardcoded admin
            if (firebaseUser.email === ADMIN_EMAIL && !appUserData.isAdmin) {
              console.log(`Setting admin flag for ${ADMIN_EMAIL}`);
              appUserData.isAdmin = true;
              // Admin gets all permissions
              const adminPermissions = Object.keys(defaultUserPermissions).reduce((acc, key) => {
                acc[key as keyof UserPermissions] = true;
                return acc;
              }, {} as UserPermissions);
              appUserData.permissions = adminPermissions;

              await updateDoc(userDocRef, { 
                isAdmin: true, 
                permissions: appUserData.permissions,
                handle: firebaseUser.displayName || ADMIN_EMAIL.split('@')[0], 
                email: firebaseUser.email, 
                photoURL: firebaseUser.photoURL,
              });
            } else if (firebaseUser.email === ADMIN_EMAIL && appUserData.isAdmin) {
              // Ensure admin always has all permissions
              const adminPermissions = Object.keys(defaultUserPermissions).reduce((acc, key) => {
                acc[key as keyof UserPermissions] = true;
                return acc;
              }, {} as UserPermissions);
              if (JSON.stringify(appUserData.permissions || {}) !== JSON.stringify(adminPermissions)) {
                appUserData.permissions = adminPermissions;
                await updateDoc(userDocRef, { permissions: adminPermissions });
              }
            } else if (!appUserData.permissions) { // Ensure regular users have default permissions if missing
              appUserData.permissions = { ...defaultUserPermissions };
              await updateDoc(userDocRef, { permissions: appUserData.permissions });
            }


          } else {
            // New user or document missing, create it
            const isHardcodedAdmin = firebaseUser.email === ADMIN_EMAIL;
            const newPermissions = isHardcodedAdmin 
              ? Object.keys(defaultUserPermissions).reduce((acc, key) => {
                  acc[key as keyof UserPermissions] = true;
                  return acc;
                }, {} as UserPermissions)
              : { ...defaultUserPermissions };

            appUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              handle: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Operative',
              photoURL: firebaseUser.photoURL || null,
              createdAt: serverTimestamp(),
              isAdmin: isHardcodedAdmin,
              permissions: newPermissions,
            };
            await setDoc(userDocRef, appUserData);
            console.log(`Created user document for ${appUserData.handle}`);
          }
          setUser({ ...firebaseUser, ...appUserData } as AppUser);
        } catch (error) {
            console.error("Error processing user document:", error);
            // Fallback to firebaseUser if Firestore interaction fails
            // Add basic admin check and default permissions even on fallback
            const isHardcodedAdmin = firebaseUser.email === ADMIN_EMAIL;
            const fallbackPermissions = isHardcodedAdmin 
              ? Object.keys(defaultUserPermissions).reduce((acc, key) => {
                  acc[key as keyof UserPermissions] = true;
                  return acc;
                }, {} as UserPermissions)
              : { ...defaultUserPermissions };

            setUser({ 
                ...firebaseUser, 
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                handle: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Operative',
                isAdmin: isHardcodedAdmin,
                permissions: fallbackPermissions,
             } as AppUser); 
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured]);


  if (loading && isFirebaseConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-64 bg-muted" />
            <Skeleton className="h-4 w-48 bg-muted" />
            <Skeleton className="h-4 w-32 bg-muted" />
        </div>
      </div>
    );
  }
  
  if (!isFirebaseConfigured && !loading) {
     // This case should be handled gracefully by the UI if Firebase isn't setup
     // For now, it will render children, which might fail if they expect Firebase
  }


  return (
    <AuthContext.Provider value={{ user, loading, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};

// It's good practice to re-export useAuth from a dedicated hooks file if preferred,
// but defining it here is also common.
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
     // This can happen if useAuth is called outside of AuthProvider,
     // or if Firebase is not configured and AuthProvider short-circuited.
     const isCfg = !!firebaseAuthInstance && !!firebaseFirestoreInstance;
     // console.warn("useAuth called outside of AuthProvider or Firebase not configured. Returning defaults.");
     return { user: null, loading: !isCfg, isFirebaseConfigured: isCfg };
  }
  return context;
};

