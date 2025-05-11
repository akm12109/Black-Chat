
"use client";
import React, { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Trash2, Edit, ShieldCheck, UserX, Shield } from "lucide-react";
import { useAuth, type AppUser } from "@/components/providers/auth-provider";
import { firestore, auth as firebaseAuth } from '@/lib/firebase'; 
import { collection, getDocs, deleteDoc, doc, query, orderBy, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser as deleteAuthUser, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescriptionUI, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { defaultUserPermissions, type UserPermissions, type AppUserBase } from '@/types/user';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const addUserFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  handle: z.string().min(3, { message: "Handle must be at least 3 characters."}).regex(/^[a-zA-Z0-9_]+$/, { message: "Handle can only contain letters, numbers, and underscores."}),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});
type AddUserFormData = z.infer<typeof addUserFormSchema>;

const editPermissionsFormSchema = z.object({
  canSendMessage: z.boolean(),
  canAddTasks: z.boolean(),
  canCompleteTasks: z.boolean(),
  canShareFiles: z.boolean(),
  canCreateStories: z.boolean(),
  canPostToCommunity: z.boolean(),
  // Note: isAdmin is handled separately and not part of this form directly for safety.
});
type EditPermissionsFormData = z.infer<typeof editPermissionsFormSchema>;


export default function AdminUsersPage() {
  const { user: adminUser, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditPermissionsDialogOpen, setIsEditPermissionsDialogOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const addUserForm = useForm<AddUserFormData>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: { email: "", handle: "", password: "" },
  });

  const editPermissionsForm = useForm<EditPermissionsFormData>({
    resolver: zodResolver(editPermissionsFormSchema),
    defaultValues: defaultUserPermissions,
  });
  
  const fetchUsers = async () => {
    if (!firestore || !isFirebaseConfigured) return;
    setLoadingUsers(true);
    try {
      const usersCollectionRef = collection(firestore, "users");
      const q = query(usersCollectionRef, orderBy("handle", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (adminUser?.isAdmin && isFirebaseConfigured) { // Ensure Firebase is configured before fetching
      fetchUsers();
    } else {
      setLoadingUsers(false); 
    }
  }, [isFirebaseConfigured, adminUser]); 

  useEffect(() => {
    if (selectedUserForEdit && selectedUserForEdit.permissions) {
      editPermissionsForm.reset(selectedUserForEdit.permissions);
    } else {
      editPermissionsForm.reset(defaultUserPermissions);
    }
  }, [selectedUserForEdit, editPermissionsForm]);


  const handleAddUser = async (data: AddUserFormData) => {
    if (!firebaseAuth || !firestore || !adminUser?.isAdmin) {
      toast({ variant: "destructive", title: "Error", description: "Operation not permitted or Firebase not available." });
      return;
    }
    const emailExists = users.some(u => u.email === data.email);
    const handleExists = users.some(u => u.handle === data.handle);

    if (emailExists) {
      addUserForm.setError("email", { type: "manual", message: "Email already in use." });
      return;
    }
    if (handleExists) {
      addUserForm.setError("handle", { type: "manual", message: "Handle already taken." });
      return;
    }

    const currentAdminAuthUser = firebaseAuth.currentUser;
    if (!currentAdminAuthUser) {
        toast({variant: "destructive", title: "Error", description: "Admin session error. Please re-login."});
        return;
    }

    try {
      // This is a simplified approach. A Firebase Function is the proper way to create users as an admin
      // to avoid admin sign-out/sign-in juggling.
      const tempUserCredential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
      const newUser = tempUserCredential.user;
      await updateProfile(newUser, { displayName: data.handle });

      const newUserDoc: AppUserBase = {
        uid: newUser.uid,
        email: data.email,
        handle: data.handle,
        photoURL: null,
        createdAt: serverTimestamp(),
        isAdmin: false, 
        permissions: { ...defaultUserPermissions },
      };
      await setDoc(doc(firestore, "users", newUser.uid), newUserDoc);
      
      toast({ title: "User Created", description: `${data.handle} has been added.` });
      
      // Attempt to re-sign in the admin. This is not ideal.
      // For a robust solution, this user creation logic should be in a Firebase Function.
      // await firebaseAuth.signOut(); // Sign out newly created user
      // await signInWithCredential(firebaseAuth, adminCredential); // Hypothetical, need stored admin credential
      // The AuthProvider should ideally handle the admin's session restoration if it gets disrupted.
      // For now, we'll proceed and the AuthProvider might pick up the admin session again, or admin might need to re-login.

      setIsAddUserDialogOpen(false);
      addUserForm.reset();
      fetchUsers(); 
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error.message || "Could not create user." });
    }
  };

  const handleDeleteUser = async (userId: string, userHandle: string | null) => {
    if (!firestore || !adminUser?.isAdmin || adminUser.uid === userId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot delete self or operation not permitted." });
      return;
    }

    if (window.confirm(`Are you sure you want to delete user ${userHandle || userId}? This action removes the Firestore record. Full Auth deletion requires backend functions or manual Firebase console action.`)) {
      try {
        await deleteDoc(doc(firestore, "users", userId));
        toast({ title: "User Record Deleted", description: `Firestore record for ${userHandle || userId} has been removed. The Firebase Auth user may still exist.` });
        fetchUsers();
      } catch (error: any) {
        console.error("Error deleting user record:", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete user record." });
      }
    }
  };
  
  const handleOpenEditPermissions = (userToEdit: AppUser) => {
    setSelectedUserForEdit(userToEdit);
    // editPermissionsForm.reset is called by useEffect when selectedUserForEdit changes
    setIsEditPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async (data: EditPermissionsFormData) => {
    if (!firestore || !selectedUserForEdit || !adminUser?.isAdmin) {
      toast({ variant: "destructive", title: "Error", description: "Operation not permitted or no user selected." });
      return;
    }
    
    const effectivePermissions = { ...data };
    // Admin user always retains admin status and cannot have it removed via this form.
    // Admin status also implies all permissions.
    if (selectedUserForEdit.uid === adminUser.uid && selectedUserForEdit.isAdmin) {
        Object.keys(defaultUserPermissions).forEach(key => {
            effectivePermissions[key as keyof UserPermissions] = true;
        });
    }


    try {
      const userDocRef = doc(firestore, "users", selectedUserForEdit.uid);
      // Do not allow changing isAdmin status directly through this form for safety.
      // isAdmin should be managed through a more secure, dedicated process if needed.
      await updateDoc(userDocRef, { permissions: effectivePermissions });
      toast({ title: "Permissions Updated", description: `Permissions for ${selectedUserForEdit.handle} updated.` });
      setIsEditPermissionsDialogOpen(false);
      setSelectedUserForEdit(null);
      fetchUsers(); 
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update permissions." });
    }
  };

  const filteredUsers = users.filter(u => 
    (u.handle && u.handle.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const permissionKeys = Object.keys(defaultUserPermissions) as Array<keyof UserPermissions>;

   if (!adminUser?.isAdmin && !loadingUsers) {
      return (
        <PageWrapper title="Access Denied" titleIcon={<Users />}>
            <Card><CardContent className="p-6"><p className="text-destructive">You do not have permission to view this page.</p></CardContent></Card>
        </PageWrapper>
      )
  }

  return (
    <PageWrapper title="User Management" titleIcon={<Users />} description="Oversee and manage all operative accounts and their permissions.">
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <Card className="mb-6 border-primary/30">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <CardTitle className="text-lg text-accent">User Registry</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Input 
                    placeholder="Search by handle or email..." 
                    className="flex-grow bg-input border-border focus:border-primary" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <DialogTrigger asChild>
                  <Button variant="default" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New User
                  </Button>
                </DialogTrigger>
            </div>
          </CardHeader>
          <DialogContent className="sm:max-w-md bg-card border-primary/50">
            <DialogHeader>
              <DialogTitle className="text-glow-primary">Register New Operative</DialogTitle>
              <DialogDescriptionUI>
                Manually create a new user account. They will receive default permissions.
              </DialogDescriptionUI>
            </DialogHeader>
            <Form {...addUserForm}>
              <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 py-4">
                <FormField control={addUserForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-accent">Email</FormLabel>
                      <FormControl><Input placeholder="user@example.com" {...field} className="bg-input border-border focus:border-primary" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={addUserForm.control} name="handle" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-accent">Handle</FormLabel>
                      <FormControl><Input placeholder="unique_handle" {...field} className="bg-input border-border focus:border-primary" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={addUserForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-accent">Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Min. 6 characters" {...field} className="bg-input border-border focus:border-primary" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={addUserForm.formState.isSubmitting}>
                    {addUserForm.formState.isSubmitting ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Card>
      </Dialog>
      
      <Dialog open={isEditPermissionsDialogOpen} onOpenChange={setIsEditPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-primary/50">
          <DialogHeader>
            <DialogTitle className="text-glow-primary">Edit Permissions for {selectedUserForEdit?.handle}</DialogTitle>
            <DialogDescriptionUI>
              Toggle specific capabilities for this user. Admin status is managed separately.
            </DialogDescriptionUI>
          </DialogHeader>
          <Form {...editPermissionsForm}>
            <form onSubmit={editPermissionsForm.handleSubmit(handleSavePermissions)} className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              {permissionKeys.map((key) => (
                <FormField
                  key={key}
                  control={editPermissionsForm.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/80 dark:bg-input/50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-accent capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                        <FormDescription className="text-xs">
                          Allow user to {key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={(adminUser?.uid === selectedUserForEdit?.uid && selectedUserForEdit?.isAdmin)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
             
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => setSelectedUserForEdit(null)}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={editPermissionsForm.formState.isSubmitting || (adminUser?.uid === selectedUserForEdit?.uid && selectedUserForEdit?.isAdmin) }>
                  {editPermissionsForm.formState.isSubmitting ? "Saving..." : "Save Permissions"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl text-glow-primary">Registered Operatives</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found matching your criteria or no users registered.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-accent">Handle</TableHead>
                  <TableHead className="text-accent hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-accent hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="text-accent">Role</TableHead>
                  <TableHead className="text-accent text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.uid} className="hover:bg-card/80 dark:hover:bg-white/5">
                    <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                           {u.photoURL ? <img src={u.photoURL} alt={u.handle || 'avatar'} className="h-6 w-6 rounded-full border border-accent" data-ai-hint="user avatar small" /> : <UserX className="h-5 w-5 text-muted-foreground"/>}
                           {u.handle || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {u.isAdmin ? (
                        <Badge variant="destructive" className="bg-red-500/80 text-white"><ShieldCheck className="mr-1 h-3 w-3"/>Admin</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-500/80 text-white"><Shield className="mr-1 h-3 w-3"/>User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="text-primary hover:text-glow-primary h-8 w-8" title="Edit Permissions" onClick={() => handleOpenEditPermissions(u)} 
                        // Admin cannot edit their own base permissions if they are the current admin, but can edit others.
                        // The isAdmin flag itself is not editable here.
                        disabled={false} 
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 h-8 w-8" title="Delete User Record" onClick={() => handleDeleteUser(u.uid, u.handle)} disabled={u.uid === adminUser?.uid || u.isAdmin}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground border-t pt-4 border-border">
          Total Users: {users.length}. User deletion from Auth requires backend functions for full cleanup.
        </CardFooter>
      </Card>
    </PageWrapper>
  );
}

