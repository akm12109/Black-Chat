
export interface UserPermissions {
  canSendMessage: boolean;
  canAddTasks: boolean;
  canCompleteTasks: boolean;
  canShareFiles: boolean;
  canCreateStories: boolean;
  canPostToCommunity: boolean;
  canSubmitDailyReport: boolean; 
  // Add other specific permissions here as needed
}

export const defaultUserPermissions: UserPermissions = {
  canSendMessage: true,
  canAddTasks: true,
  canCompleteTasks: true,
  canShareFiles: true,
  canCreateStories: true,
  canPostToCommunity: true,
  canSubmitDailyReport: true, 
};

export interface AppUserBase {
  uid: string;
  email: string | null;
  handle: string | null;
  photoURL?: string | null;
  createdAt?: any; // Firestore Timestamp or ServerTimestamp
  isAdmin?: boolean;
  permissions?: UserPermissions;
}

