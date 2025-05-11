
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare as MessageSquareIconLucide, Send, UserCircle as UserIconLucide, ArrowLeft } from "lucide-react"; 
import { useAuth, type AppUser } from '@/components/providers/auth-provider';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, getDoc, setDoc, updateDoc, arrayUnion, where, limit } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { AppUserBase } from '@/types/user';


interface Channel {
  id: string;
  name: string;
  isDM?: boolean;
  otherUserId?: string;
  otherUserHandle?: string;
  otherUserPhotoURL?: string | null;
  lastActivity?: Timestamp | null;
  members?: string[];
  participantUIDs?: string[]; 
  userHandles?: { [key: string]: string }; 
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderHandle: string;
  senderPhotoURL?: string | null;
  timestamp: Timestamp | null;
}

const PREDEFINED_CHANNELS_CONFIG: Omit<Channel, 'id' | 'otherUserId' | 'otherUserHandle' | 'otherUserPhotoURL' | 'lastActivity' | 'members' | 'participantUIDs' | 'userHandles'>[] = [
    { name: "#general_ops", isDM: false },
];


export default function MessagesPage() {
  const { user, loading: authLoading, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true); // Start true
  const [showChatViewOnMobile, setShowChatViewOnMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Messages - Black HAT Commit';
    }
  }, []);

  const handleSelectChannel = useCallback(async (channel: Channel | null) => {
    if (!user || !firestore) {
        setSelectedChannel(null); // Clear selection if user/firestore not available
        if (isMobile) setShowChatViewOnMobile(false);
        return;
    }
    
    if (!channel) {
        setSelectedChannel(null);
        if (isMobile) setShowChatViewOnMobile(false);
        return;
    }

    // If the channel is already selected, only ensure mobile view is correct
    if (selectedChannel?.id === channel.id) {
        if (isMobile && !showChatViewOnMobile) {
            setShowChatViewOnMobile(true);
        }
        return; 
    }

    const channelDocRef = doc(firestore, "channels", channel.id);
    try {
        const channelSnap = await getDoc(channelDocRef);
        const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || 'Operative';
        if (!channelSnap.exists()) {
            const channelDataToSet: any = {
                name: channel.name,
                isDM: !!channel.isDM,
                members: channel.members || (channel.isDM && channel.otherUserId ? [user.uid, channel.otherUserId].sort() : [user.uid]),
                lastActivity: serverTimestamp(),
            };
            if (channel.isDM && channel.otherUserId) {
                channelDataToSet.participantUIDs = [user.uid, channel.otherUserId].sort();
                channelDataToSet.userHandles = {
                    [user.uid]: userHandle,
                    [channel.otherUserId]: channel.otherUserHandle || 'User',
                };
            }
            await setDoc(channelDocRef, channelDataToSet);
        } else if (!channel.isDM) { 
            const existingData = channelSnap.data();
            const currentMembers = existingData?.members || [];
            if (!currentMembers.includes(user.uid)) {
                await updateDoc(channelDocRef, {
                    members: arrayUnion(user.uid),
                    lastActivity: serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.error("Error ensuring channel exists/user is member:", error);
        toast({ variant: 'destructive', title: 'Channel Error', description: 'Could not access or update channel data.' });
        setSelectedChannel(null); // Clear selection on error
        if (isMobile) setShowChatViewOnMobile(false);
        return; 
    }
    
    setSelectedChannel(channel);
    setNewMessage("");
    setMessages([]); // Clear previous messages
    setLoadingMessages(true); // Set loading for new channel messages

    if (isMobile) {
        setShowChatViewOnMobile(true);
    }
  }, [user, firestore, isMobile, toast, selectedChannel?.id, showChatViewOnMobile]);


  const ensureDmChannelExists = useCallback(async (dmUserId: string): Promise<Channel | null> => {
    if (!user || !firestore || user.uid === dmUserId) {
      if (user && user.uid === dmUserId) toast({ title: "Info", description: "Cannot start a DM with yourself." });
      return null;
    }

    const otherUserDocRef = doc(firestore, "users", dmUserId);
    const otherUserSnap = await getDoc(otherUserDocRef);

    if (!otherUserSnap.exists()) {
      toast({ variant: 'destructive', title: 'User Not Found', description: 'Cannot start a DM with this user.' });
      return null;
    }

    const otherUserData = otherUserSnap.data() as AppUserBase;
    const uids = [user.uid, dmUserId].sort();
    const canonicalDmId = `dm_${uids[0]}_${uids[1]}`;
    const channelDocRef = doc(firestore, "channels", canonicalDmId);
    const channelSnap = await getDoc(channelDocRef);
    const currentUserHandle = user.handle || user.displayName || user.email?.split('@')[0] || 'Operative';

    let dmChannelObject: Channel;

    if (channelSnap.exists()) {
      const existingChannelData = channelSnap.data();
      dmChannelObject = {
        id: canonicalDmId,
        name: existingChannelData.name || `@${otherUserData.handle || 'User'}`,
        isDM: true,
        otherUserId: dmUserId,
        otherUserHandle: otherUserData.handle || 'User',
        otherUserPhotoURL: otherUserData.photoURL,
        members: existingChannelData.members || uids,
        lastActivity: existingChannelData.lastActivity || null,
        participantUIDs: existingChannelData.participantUIDs || uids,
        userHandles: existingChannelData.userHandles || {
            [user.uid]: currentUserHandle,
            [dmUserId]: otherUserData.handle || 'User',
        },
      };
    } else {
      dmChannelObject = {
        id: canonicalDmId,
        name: `@${otherUserData.handle || 'User'}`,
        isDM: true,
        otherUserId: dmUserId,
        otherUserHandle: otherUserData.handle || 'User',
        otherUserPhotoURL: otherUserData.photoURL,
        members: uids,
        participantUIDs: uids,
        userHandles: {
            [user.uid]: currentUserHandle,
            [dmUserId]: otherUserData.handle || 'User',
        },
        lastActivity: null, 
      };
      try {
        await setDoc(channelDocRef, {
          name: dmChannelObject.name,
          isDM: true,
          members: uids,
          participantUIDs: uids,
          userHandles: dmChannelObject.userHandles,
          lastActivity: serverTimestamp(),
        });
        dmChannelObject.lastActivity = serverTimestamp() as Timestamp; 
      } catch (e) {
        console.error("Failed to create DM channel doc:", e);
        toast({variant: 'destructive', title: 'Error', description: 'Could not create DM channel.'});
        return null;
      }
    }
    return dmChannelObject;
  }, [user, firestore, toast]);

  useEffect(() => { // Fetch Group Channels
    if (!isFirebaseConfigured || !user || !firestore) {
        const placeholderChannels = PREDEFINED_CHANNELS_CONFIG.map(pConfig => ({
            ...pConfig,
            id: pConfig.name.substring(1).replace(/[^a-zA-Z0-9_-]/g, ''),
            members: [user?.uid || ''], 
            lastActivity: null
        }));
        setChannels(placeholderChannels);
        setLoadingChannels(false);
        setLoadingMessages(false); // No channels, no messages to load
        return;
    }
    setLoadingChannels(true);
    const groupChannelsRef = collection(firestore, "channels");
    const qGroupChannels = query(groupChannelsRef, where("isDM", "==", false));
    
    const unsubGroupChannels = onSnapshot(qGroupChannels, async (snapshot) => {
        let fetchedGroupChannels: Channel[] = snapshot.docs.map(docData => ({ id: docData.id, ...docData.data() } as Channel));
        let madeChangesToFirestore = false;

        for (const pConfig of PREDEFINED_CHANNELS_CONFIG) {
            const id = pConfig.name.substring(1).replace(/[^a-zA-Z0-9_-]/g, '');
            if (!fetchedGroupChannels.find(ch => ch.id === id)) {
                const newGroupChannelData = {
                    name: pConfig.name,
                    isDM: false,
                    members: [user.uid], 
                    lastActivity: serverTimestamp(),
                };
                try {
                  await setDoc(doc(firestore, "channels", id), newGroupChannelData);
                  madeChangesToFirestore = true; 
                } catch (error) {
                  console.error("Error creating predefined channel:", error);
                }
            }
        }
        // Update state with fetched group channels, preserving existing DMs
        setChannels(prev => {
            const dms = prev.filter(ch => ch.isDM);
            const uniqueGroupChannels = fetchedGroupChannels.filter(fgc => !dms.find(d => d.id === fgc.id));
            return [...uniqueGroupChannels, ...dms].sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()));
        });
        if(!madeChangesToFirestore) setLoadingChannels(false);

    }, (err) => {
        console.error("Error fetching group channels:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load group channels.' });
        setChannels(prev => prev.filter(ch => ch.isDM)); // Keep DMs if group fetching fails
        setLoadingChannels(false);
    });
    return () => unsubGroupChannels();
  }, [isFirebaseConfigured, user, firestore, toast]);

  useEffect(() => { // Fetch Users for DMs
    if (!isFirebaseConfigured || !user || !firestore) return;

    const usersRef = collection(firestore, "users");
    // Query users excluding the current user, limited for performance if many users exist.
    // Adjust limit as needed or implement search/pagination for users.
    const qUsers = query(usersRef, where("uid", "!=", user.uid), limit(20)); 
    
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        const dmChannelStubs: Channel[] = snapshot.docs.map(docData => {
            const otherUser = docData.data() as AppUserBase;
            const uids = [user.uid, otherUser.uid].sort();
            const dmId = `dm_${uids[0]}_${uids[1]}`;
            const currentUserHandle = user.handle || user.displayName || user.email?.split('@')[0] || 'Operative';
            return {
                id: dmId,
                name: `@${otherUser.handle || 'User'}`,
                isDM: true,
                otherUserId: otherUser.uid,
                otherUserHandle: otherUser.handle || 'User',
                otherUserPhotoURL: otherUser.photoURL,
                members: uids, 
                participantUIDs: uids,
                userHandles: {
                    [user.uid]: currentUserHandle,
                    [otherUser.uid]: otherUser.handle || 'User',
                }
            };
        });

        setChannels(prev => {
            const groups = prev.filter(ch => !ch.isDM);
            // Merge new DM stubs with existing DMs, preferring existing ones if ID matches (e.g., to keep lastActivity)
            const existingDmIds = new Set(prev.filter(ch => ch.isDM).map(ch => ch.id));
            const newUniqueDms = dmChannelStubs.filter(stub => !existingDmIds.has(stub.id));
            const allDms = [...prev.filter(ch => ch.isDM), ...newUniqueDms];
            
            const updatedChannels = [...groups, ...allDms].sort((a,b) => (a.name||"").toLowerCase().localeCompare((b.name||"").toLowerCase()));
            
             // If a DM channel was selected, try to update its info (e.g., photoURL)
            if (selectedChannel && selectedChannel.isDM && selectedChannel.otherUserId) {
                const updatedInfo = dmChannelStubs.find(c => c.id === selectedChannel.id);
                if (updatedInfo && (selectedChannel.otherUserHandle !== updatedInfo.otherUserHandle || selectedChannel.otherUserPhotoURL !== updatedInfo.otherUserPhotoURL)) {
                    setSelectedChannel(currentSelected => ({...currentSelected!, ...updatedInfo}));
                }
            }
            return updatedChannels;
        });
        // Only set loadingChannels to false if it was true.
        // This might be set by group channel loading too.
        if(loadingChannels) setLoadingChannels(false); 
    }, (err) => {
        console.error("Error fetching users for DMs:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load user list for DMs.' });
        if(loadingChannels) setLoadingChannels(false);
    });
    return () => unsubUsers();
  }, [isFirebaseConfigured, user, firestore, toast, loadingChannels, selectedChannel]);


  // Auto-select channel from URL param or default
 useEffect(() => {
    if (authLoading || loadingChannels || !user || !channels.length) {
      if (!authLoading && !loadingChannels && channels.length === 0) { // No channels at all
          setLoadingMessages(false);
      }
      return;
    }

    const dmUserIdFromParams = searchParams.get('dm');
    let channelToSelect: Channel | null = null;

    if (dmUserIdFromParams && dmUserIdFromParams !== user.uid) {
        const existingDm = channels.find(ch => ch.isDM && ch.otherUserId === dmUserIdFromParams);
        if (existingDm) {
            channelToSelect = existingDm;
        } else {
            // DM channel doesn't exist in current list, try to ensure/create it
            ensureDmChannelExists(dmUserIdFromParams).then(newlyEnsuredDm => {
                if (newlyEnsuredDm) {
                    // Add to channels list if not already there (e.g., from a race condition)
                    setChannels(prev => { 
                        if (!prev.find(ch => ch.id === newlyEnsuredDm.id)) {
                           return [...prev, newlyEnsuredDm].sort((a,b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()));
                        }
                        return prev;
                    });
                    if (selectedChannel?.id !== newlyEnsuredDm.id) {
                        handleSelectChannel(newlyEnsuredDm);
                    }
                } else {
                     // Failed to ensure DM channel, select default if nothing else selected
                    if (!selectedChannel && channels.length > 0) {
                        handleSelectChannel(channels.find(ch => !ch.isDM || (ch.isDM && ch.otherUserId !== user.uid)) || null);
                    }
                }
            });
            return; // ensureDmChannelExists is async, handleSelectChannel will be called within its .then()
        }
    } else if (!selectedChannel && channels.length > 0) { // No DM param and no channel selected, select default
        channelToSelect = channels.find(ch => !ch.isDM || (ch.isDM && ch.otherUserId !== user.uid)) || null;
    }

    if (channelToSelect && selectedChannel?.id !== channelToSelect.id) {
        handleSelectChannel(channelToSelect);
    } else if (!selectedChannel && !dmUserIdFromParams && channels.length === 0) {
        // No channels available and no DM param
        setLoadingMessages(false);
    }

  }, [searchParams, channels, user, authLoading, loadingChannels, handleSelectChannel, ensureDmChannelExists, selectedChannel?.id]);


  // Fetch messages for the selected channel
  useEffect(() => {
    if (!selectedChannel || !selectedChannel.id || !firestore || !user) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    setLoadingMessages(true);
    const messagesCollectionRef = collection(firestore, "channels", selectedChannel.id, "messages");
    const qMessages = query(messagesCollectionRef, orderBy("timestamp", "asc"), limit(50));

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const fetchedMessages: Message[] = snapshot.docs.map(docData => ({
        id: docData.id,
        ...(docData.data() as Omit<Message, 'id'>),
      }));
      setMessages(fetchedMessages);
      setLoadingMessages(false);
    }, (error) => {
      console.error(`Error fetching messages for channel ${selectedChannel?.id}:`, error);
      setMessages([]);
      setLoadingMessages(false);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load messages for this channel.' });
    });
    return () => {
      unsubscribeMessages();
    };
  }, [selectedChannel?.id, firestore, user, toast]); // Depend only on selectedChannel.id

  useEffect(() => {
    if (messages.length > 0 || (showChatViewOnMobile && selectedChannel)) { 
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChatViewOnMobile, selectedChannel]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user || !firestore) {
        if(!selectedChannel) toast({variant: 'destructive', title: 'No Channel Selected', description: 'Please select a channel to send a message.'});
        return;
    }
    if (!user.permissions?.canSendMessage) {
        toast({variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to send messages.'});
        return;
    }


    const channelDocRef = doc(firestore, "channels", selectedChannel.id);
    const messagesCollectionRef = collection(channelDocRef, "messages");
    const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || "Anonymous";

    try {
      await addDoc(messagesCollectionRef, {
        text: newMessage,
        senderId: user.uid,
        senderHandle: userHandle,
        senderPhotoURL: user.photoURL,
        timestamp: serverTimestamp(),
      });

      await updateDoc(channelDocRef, { lastActivity: serverTimestamp() });
      setNewMessage("");

    } catch (error) {
      console.error("Error sending message or updating channel:", error);
      toast({ variant: 'destructive', title: 'Send Error', description: 'Could not send message.' });
    }
  };
  
  const getOtherUserStatus = () => {
    if (!selectedChannel || !selectedChannel.isDM || !selectedChannel.otherUserId) return null;
    return selectedChannel.otherUserHandle ? `@${selectedChannel.otherUserHandle}` : "Direct Message";
  };

  if (authLoading || (isFirebaseConfigured && user && loadingChannels && channels.length === 0 && !searchParams.get('dm') )) {
    return (
      <PageWrapper title="Secure Comms" titleIcon={<MessageSquareIconLucide />} description="Loading channels...">
        <div className="flex h-[calc(100vh-12rem)] gap-4">
          <Card className="w-full md:w-1/3 lg:w-1/4 border-primary/30 flex flex-col">
            <CardHeader className="p-4 border-b border-border"><Skeleton className="h-8 w-3/4" /></CardHeader>
            <CardContent className="p-2 flex-1 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
          </Card>
         {!isMobile && (
          <Card className="flex-1 border-primary/30 flex flex-col">
            <CardHeader className="p-4 border-b border-border"><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent className="flex-1 p-4"><Skeleton className="h-full w-full" /></CardContent>
            <CardFooter className="p-4 border-t border-border"><Skeleton className="h-10 w-full" /></CardFooter>
          </Card>
         )}
        </div>
      </PageWrapper>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <PageWrapper title="Secure Comms" titleIcon={<MessageSquareIconLucide />}>
        <Card><CardContent className="p-4 text-destructive">Firebase is not configured. Messaging is unavailable.</CardContent></Card>
      </PageWrapper>
    );
  }

  if (!user && !authLoading) {
     return (
      <PageWrapper title="Secure Comms" titleIcon={<MessageSquareIconLucide />}>
        <Card><CardContent className="p-4 text-muted-foreground">Please log in to access messages.</CardContent></Card>
      </PageWrapper>
    );
  }

  const ChannelListComponent = (
    <Card className={`border-primary/30 flex flex-col ${isMobile && showChatViewOnMobile ? 'hidden' : 'w-full md:w-1/3 lg:w-1/4'}`}>
      <CardHeader className="p-4 border-b border-border">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-accent">Channels & DMs</CardTitle>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-2">
          {loadingChannels && channels.length === 0 ? (
            <>
              <Skeleton className="h-10 w-full mb-1" />
              <Skeleton className="h-10 w-full mb-1" />
              <Skeleton className="h-10 w-full mb-1" />
            </>
          ) : (
            channels.map(channel => (
              <Button
                key={channel.id}
                variant="ghost"
                className="w-full justify-start mb-1 hover:bg-accent/20 hover:text-accent-foreground data-[active=true]:bg-accent/30 data-[active=true]:text-accent-foreground"
                data-active={selectedChannel?.id === channel.id}
                onClick={() => handleSelectChannel(channel)}
              >
                <div className="flex items-center mr-2">
                {channel.isDM ?
                    <UserIconLucide className="h-4 w-4 text-muted-foreground" /> :
                    <MessageSquareIconLucide className="h-4 w-4 text-muted-foreground" />
                }
                </div>
                <span className="truncate">{channel.name}</span>
              </Button>
            ))
          )}
           {channels.length === 0 && !loadingChannels && <p className="text-xs text-muted-foreground text-center p-2">No channels or users available.</p>}
        </CardContent>
      </ScrollArea>
    </Card>
  );

  const ChatAreaComponent = (
    <Card className={`border-primary/30 flex flex-col ${isMobile && !showChatViewOnMobile ? 'hidden' : 'flex-1'}`}>
      {selectedChannel && user ? (
        <>
          <CardHeader className="p-4 border-b border-border flex flex-row justify-between items-center">
            <div className="flex items-center">
              {isMobile && (
                <Button variant="ghost" size="icon" className="mr-2 text-primary" onClick={() => {
                  setShowChatViewOnMobile(false);
                  // router.replace('/messages', { scroll: false }); // Optional: clear URL param
                }}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {selectedChannel.isDM && (selectedChannel.otherUserPhotoURL || selectedChannel.otherUserHandle) && (
                  <Avatar className="h-8 w-8 mr-2 border-accent border-2">
                    <AvatarImage src={selectedChannel.otherUserPhotoURL || `https://picsum.photos/seed/${selectedChannel.otherUserId}/32/32`} alt={selectedChannel.otherUserHandle || "User"} data-ai-hint="user avatar small"/>
                    <AvatarFallback>{selectedChannel.otherUserHandle?.[0].toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
              )}
              <div>
                <CardTitle className="text-lg text-accent">{selectedChannel.name}</CardTitle>
                {selectedChannel.isDM && (
                    <p className="text-xs text-muted-foreground">{getOtherUserStatus()}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 bg-background/30">
            <CardContent className="p-4 space-y-4">
              {loadingMessages ? (
                 <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading messages...</p></div>
              ) : messages.length === 0 ? (
                 <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No messages yet. Be the first to type!</p></div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex items-end space-x-2 ${msg.senderId === user.uid ? 'justify-end' : ''}`}>
                    {msg.senderId !== user.uid && (
                       <Avatar className="h-8 w-8 border-2 border-primary shrink-0">
                        <AvatarImage src={msg.senderPhotoURL || `https://picsum.photos/seed/${msg.senderId}/32/32`} alt={msg.senderHandle} data-ai-hint="avatar user" />
                        <AvatarFallback>{msg.senderHandle?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`p-3 rounded-lg max-w-xs lg:max-w-md break-words shadow-md ${msg.senderId === user.uid ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'}`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === user.uid ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left'}`}>
                        {msg.senderId === user.uid ? 'You' : msg.senderHandle} - {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                      </p>
                    </div>
                     {msg.senderId === user.uid && (
                       <Avatar className="h-8 w-8 border-2 border-accent shrink-0">
                         <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/32/32`} alt={user.handle || "You"} data-ai-hint="avatar user" />
                         <AvatarFallback>{user.handle?.[0]?.toUpperCase() || 'Y'}</AvatarFallback>
                       </Avatar>
                     )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          </ScrollArea>
          <CardFooter className="p-4 border-t border-border">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex w-full items-center space-x-2">
              <Input
                placeholder={user.permissions?.canSendMessage ? "Type your encrypted message..." : "Messaging disabled"}
                className="flex-1 bg-input border-border focus:border-primary"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={loadingMessages || !selectedChannel || !(user.handle || user.displayName) || !user.permissions?.canSendMessage}
              />
              <Button type="submit" variant="default" className="group" disabled={!newMessage.trim() || loadingMessages || !selectedChannel || !(user.handle || user.displayName) || !user.permissions?.canSendMessage}>
                Send <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
             {selectedChannel && !(user.handle || user.displayName) && <p className="text-xs text-destructive mt-1 w-full text-center">Set your handle in Profile to send messages.</p>}
             {selectedChannel && user.permissions && !user.permissions.canSendMessage && <p className="text-xs text-destructive mt-1 w-full text-center">You do not have permission to send messages.</p>}
          </CardFooter>
        </>
      ) : (
        <CardContent className="flex-1 p-4 flex items-center justify-center">
          <p className="text-muted-foreground">
            {loadingChannels && channels.length === 0 && !selectedChannel ? "Loading available channels..." : "Select a channel or user to start chatting."}
          </p>
        </CardContent>
      )}
    </Card>
  );

  return (
    <PageWrapper title="Secure Comms" titleIcon={<MessageSquareIconLucide />} description="Encrypted channels for your team.">
      <div className="flex h-[calc(100vh-12rem)] gap-4">
        {ChannelListComponent}
        {ChatAreaComponent}
      </div>
    </PageWrapper>
  );
}

