
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, UserCircle, Search, History, Mic, MicOff, VideoOff, AlertTriangle, PhoneOff } from "lucide-react";
import Image from "next/image";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionUI } from "@/components/ui/alert";

const initialContacts = [
  { name: "CypherGhost", avatarSeed: "cypherghost", id: "user1" },
  { name: "DataWraith", avatarSeed: "datawraith", id: "user2" },
  { name: "ZeroCool", avatarSeed: "zerocool", id: "user3" },
  { name: "AnonymousX", avatarSeed: "anonymousx", id: "user4" },
  { name: "GlitchMaster", avatarSeed: "glitchmaster", id: "user5" },
  { name: "ShadowLink", avatarSeed: "shadowlink", id: "user6" },
  { name: "NyxByte", avatarSeed: "nyxbyte", id: "user7" },
];

const initialRecentCalls = [
  { id: "c1", user: "GlitchMaster", avatarSeed: "glitchmaster", type: "Outgoing Audio", time: "Yesterday, 10:15 PM", duration: "5m 32s" },
  { id: "c2", user: "ShadowLink", avatarSeed: "shadowlink", type: "Incoming Video", time: "Today, 09:30 AM", duration: "12m 10s", missed: true },
  { id: "c3", user: "NyxByte", avatarSeed: "nyxbyte", type: "Outgoing Audio", time: "Today, 11:05 AM", duration: "8m 02s" },
];

interface CallTarget {
  id: string;
  name: string;
  avatarSeed: string;
}

export default function CallsPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState(initialContacts);
  const [recentCalls, setRecentCalls] = useState(initialRecentCalls);

  const [isCalling, setIsCalling] = useState(false);
  const [currentCallTarget, setCurrentCallTarget] = useState<CallTarget | null>(null);
  const [currentCallType, setCurrentCallType] = useState<'audio' | 'video' | null>(null);
  const [callStatusMessage, setCallStatusMessage] = useState("Initiate a call or connect to a secure line.");
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    document.title = 'Calls - Black HAT Commit';
  }, []);

  // NOTE: A full WebRTC implementation requires a signaling server (e.g., using WebSockets, Socket.IO)
  // to exchange messages (SDP offers/answers, ICE candidates) between peers.
  // This frontend code simulates the UI flow and outlines where WebRTC logic would integrate.

  const initializePeerConnection = () => {
    // STUN/TURN server configuration for NAT traversal
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Example STUN server
      // In a production app, you'd likely need TURN servers as well.
    };
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the candidate to the remote peer via signaling server
        console.log('ICE Candidate:', event.candidate);
        // signalingChannel.send({ type: 'ice-candidate', candidate: event.candidate, target: currentCallTarget?.id });
      }
    };

    pc.ontrack = (event) => {
      // A remote track has been received
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log('Remote stream added');
      }
    };
    
    // Add local stream tracks to the peer connection
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    peerConnectionRef.current = pc;
  };

  const requestPermissions = async (video: boolean, audio: boolean): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      if (video) setHasCameraPermission(true);
      if (audio) setHasMicPermission(true);
      
      localStreamRef.current = stream; // Store the local stream

      if (video && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      if (video) setHasCameraPermission(false);
      if (audio) setHasMicPermission(false);
      toast({
        variant: 'destructive',
        title: 'Device Access Denied',
        description: 'Please enable camera/microphone permissions in your browser settings.',
      });
      return null;
    }
  };

  const startCall = async (contact: CallTarget, type: 'audio' | 'video') => {
    if (isCalling) return;

    let stream = localStreamRef.current;
    if (!stream) { // Request permissions if not already granted or stream not active
        if (type === 'video') {
            stream = await requestPermissions(true, true);
        } else { // audio call
            stream = await requestPermissions(false, true);
        }
    }
    
    if (!stream) return; // Permissions denied or error

    if (type === 'audio') {
        stream.getVideoTracks().forEach(track => track.enabled = false);
        setIsVideoEnabled(false);
    } else {
        stream.getVideoTracks().forEach(track => track.enabled = true);
        setIsVideoEnabled(true);
    }

    setIsCalling(true);
    setCurrentCallTarget(contact);
    setCurrentCallType(type);
    setCallStatusMessage(`Dialing ${contact.name}...`);
    setCallStartTime(Date.now());
    setIsMuted(false);

    initializePeerConnection();

    if (peerConnectionRef.current) {
      // Create offer (for caller)
      // const offer = await peerConnectionRef.current.createOffer();
      // await peerConnectionRef.current.setLocalDescription(offer);
      // Send offer to the remote peer via signaling server
      // signalingChannel.send({ type: 'offer', offer: offer, target: contact.id });
      console.log('WebRTC: Offer would be created and sent via signaling server.');
    }


    // Simulate ringing then connected
    setTimeout(() => {
      if (!isCallingRef.current) return; // Check if call was cancelled quickly (use ref for up-to-date state in timeout)
      setCallStatusMessage(`Ringing ${contact.name}...`);
      setTimeout(() => {
        if (!isCallingRef.current) return;
        setCallStatusMessage(`Connected to ${contact.name}`);
        // WebRTC: At this point, the remote stream should be connected if SDP/ICE exchange was successful.
        // The ontrack event handler in initializePeerConnection would set remoteVideoRef.current.srcObject
      }, 2000);
    }, 1500);
  };

  // Use a ref for isCalling state to access its latest value in setTimeout callbacks
  const isCallingRef = useRef(isCalling);
  useEffect(() => {
    isCallingRef.current = isCalling;
  }, [isCalling]);

  const endCall = () => {
    const durationMs = callStartTime ? Date.now() - callStartTime : 0;
    const durationSec = Math.floor(durationMs / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const formattedDuration = `${minutes}m ${seconds}s`;

    if (currentCallTarget && currentCallType) {
      const newCallEntry = {
        id: `call-${Date.now()}`,
        user: currentCallTarget.name,
        avatarSeed: currentCallTarget.avatarSeed,
        type: `${currentCallType === 'video' ? 'Outgoing Video' : 'Outgoing Audio'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        duration: formattedDuration,
        missed: callStatusMessage.toLowerCase().includes("dialing") || callStatusMessage.toLowerCase().includes("ringing"),
      };
      setRecentCalls(prevCalls => [newCallEntry, ...prevCalls].slice(0, 5));
    }

    setIsCalling(false);
    setCallStatusMessage(`Call Ended with ${currentCallTarget?.name || 'contact'}`); 
    
    // WebRTC: Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log('WebRTC: Peer connection closed.');
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null; // Clear remote video as well

    setHasCameraPermission(false);
    setHasMicPermission(false);
    setIsVideoEnabled(true); 

    setTimeout(() => {
        if (!isCallingRef.current) {
            setCurrentCallTarget(null);
            setCurrentCallType(null);
            setCallStatusMessage("Initiate a call or connect to a secure line.");
        }
    }, 3000);
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !newMuteState);
    }
    toast({ title: newMuteState ? "Microphone Muted" : "Microphone Unmuted" });
  };

  const toggleVideo = () => {
    if (currentCallType !== 'video' || !hasCameraPermission) return;
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => track.enabled = newVideoState);
    }
    toast({ title: newVideoState ? "Video Enabled" : "Video Disabled" });
  };

  // Placeholder for signaling channel message handling (e.g., from WebSocket)
  // useEffect(() => {
  //   if (signalingChannel) { // Assuming signalingChannel is set up elsewhere
  //     signalingChannel.onmessage = async (message) => {
  //       const data = JSON.parse(message.data);
  //       if (!peerConnectionRef.current && data.type !== 'offer') { // Initialize if receiving offer and not yet initialized
  //          initializePeerConnection(); // This might need to happen before setRemoteDescription
  //       }
  //
  //       switch (data.type) {
  //         case 'offer':
  //           // Received an offer from remote peer
  //           if (!peerConnectionRef.current) initializePeerConnection(); // Ensure PC is initialized
  //           if (localStreamRef.current) { // Make sure local stream is ready to be added
  //                localStreamRef.current.getTracks().forEach(track => peerConnectionRef.current!.addTrack(track, localStreamRef.current!));
  //           }
  //           await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(data.offer));
  //           const answer = await peerConnectionRef.current!.createAnswer();
  //           await peerConnectionRef.current!.setLocalDescription(answer);
  //           signalingChannel.send({ type: 'answer', answer: answer, target: data.sender });
  //           setCallStatusMessage(`Incoming call from ${data.senderName}... Answering...`); // Update UI
  //           setIsCalling(true); // Update call state
  //           setCurrentCallTarget({ id: data.sender, name: data.senderName, avatarSeed: data.senderAvatarSeed });
  //           setCurrentCallType(data.callType); // e.g. 'video' or 'audio'
  //           break;
  //         case 'answer':
  //           // Received an answer from remote peer
  //           await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(data.answer));
  //           setCallStatusMessage(`Connected to ${currentCallTarget?.name}`);
  //           break;
  //         case 'ice-candidate':
  //           // Received an ICE candidate from remote peer
  //           if (data.candidate) {
  //             await peerConnectionRef.current!.addIceCandidate(new RTCIceCandidate(data.candidate));
  //           }
  //           break;
  //         case 'call-ended':
  //            // Remote peer ended the call
  //            endCall(); // Clean up local state
  //            toast({ title: "Call Ended", description: `${data.senderName} ended the call.` });
  //            break;
  //       }
  //     };
  //   }
  // }, [currentCallTarget, /* signalingChannel dependency */]);


  return (
    <PageWrapper title="Secure Calls" titleIcon={<Phone />} description="Initiate encrypted voice and video communications. (WebRTC Conceptual Implementation)">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg text-accent">Contacts & Dialer</CardTitle>
            <Input placeholder="Search operatives or dial..." className="mt-2 bg-input border-border focus:border-primary" disabled={isCalling} />
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-25rem)] md:max-h-96 overflow-y-auto">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/10">
                <div className="flex items-center space-x-3">
                  <Image src={`https://picsum.photos/seed/${contact.avatarSeed}/40/40`} alt={contact.name} width={32} height={32} className="rounded-full border-2 border-accent" data-ai-hint="hacker avatar small"/>
                  <span className="text-sm text-foreground">{contact.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" className="text-primary hover:text-glow-primary h-8 w-8" title={`Audio Call ${contact.name}`} onClick={() => startCall(contact, 'audio')} disabled={isCalling}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-primary hover:text-glow-primary h-8 w-8" title={`Video Call ${contact.name}`} onClick={() => startCall(contact, 'video')} disabled={isCalling}>
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg text-accent flex items-center"><History className="mr-2 h-5 w-5"/>Call Log</CardTitle>
            <CardDescription>Your recent communication history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3  max-h-[calc(100vh-22rem)] md:max-h-96 overflow-y-auto">
            {recentCalls.map(call => (
              <div key={call.id} className={`flex items-center justify-between p-3 rounded-md border ${call.missed ? "border-destructive/50 bg-destructive/10" : "border-border"}`}>
                <div className="flex items-center space-x-3">
                  <Image src={`https://picsum.photos/seed/${call.avatarSeed}/40/40`} alt={call.user} width={40} height={40} className="rounded-full border-2 border-accent" data-ai-hint="hacker avatar"/>
                  <div>
                    <p className={`font-medium ${call.missed ? "text-destructive" : "text-foreground"}`}>{call.user}</p>
                    <p className="text-xs text-muted-foreground">{call.type} - {call.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{call.duration}</p>
                  {call.missed && <p className="text-xs text-destructive">Missed</p>}
                </div>
              </div>
            ))}
            {recentCalls.length === 0 && <p className="text-muted-foreground text-center py-4">No recent call activity.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-dashed border-primary/50 bg-card/50">
        <CardContent className="p-6 text-center min-h-[250px] flex flex-col justify-center items-center">
          {!isCalling && !currentCallTarget ? (
            <>
              <Phone className="h-12 w-12 text-primary mx-auto mb-4 icon-glow-primary" />
              <h3 className="text-xl font-semibold text-glow-primary mb-2">Real-time Communication Interface</h3>
              <p className="text-muted-foreground">Select a contact to initiate an audio or video call.</p>
              <p className="text-xs text-muted-foreground mt-1">WebRTC conceptual implementation. Signaling server required for full functionality.</p>
            </>
          ) : !isCalling && currentCallTarget ? (
             <>
              <PhoneOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">{callStatusMessage}</h3>
              <p className="text-muted-foreground">Ready to start a new call.</p>
            </>
          ) : ( 
            <div className="w-full">
              <div className="flex flex-col items-center mb-4">
                <Avatar className="h-20 w-20 mb-3 border-4 border-accent">
                  <AvatarImage src={`https://picsum.photos/seed/${currentCallTarget?.avatarSeed}/80/80`} alt={currentCallTarget?.name} data-ai-hint="hacker avatar large" />
                  <AvatarFallback className="text-2xl bg-accent text-accent-foreground">{currentCallTarget?.name[0]}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold text-glow-accent">{currentCallTarget?.name}</h3>
                <p className="text-md text-primary">{callStatusMessage}</p>
              </div>

              {currentCallType === 'video' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="relative aspect-video bg-black rounded-md overflow-hidden border border-primary/50">
                    <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    {!hasCameraPermission && isVideoEnabled && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-destructive p-2">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="text-sm font-semibold">Camera Access Denied</p>
                            <p className="text-xs text-center">Enable camera in browser settings.</p>
                        </div>
                    )}
                     {!isVideoEnabled && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-2">
                            <VideoOff className="h-8 w-8 mb-2" />
                            <p className="text-sm font-semibold">Video Disabled</p>
                        </div>
                     )}
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Local Feed</div>
                  </div>
                  <div className="relative aspect-video bg-black rounded-md overflow-hidden border border-border">
                     <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
                     {/* Placeholder if remote video is not available */}
                      {!remoteVideoRef.current?.srcObject && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                          <UserCircle className="h-16 w-16 text-muted-foreground/50" />
                        </div>
                      )}
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Remote Feed</div>
                  </div>
                </div>
              )}
              {currentCallType === 'audio' && (
                <div className="my-8">
                  <Phone className="h-16 w-16 text-primary mx-auto icon-glow-primary animate-pulse"/>
                </div>
              )}

              {(!hasCameraPermission && currentCallType === 'video') && (
                  <Alert variant="destructive" className="my-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Camera Access Required</AlertTitle>
                      <AlertDescriptionUI>
                        Please allow camera access for video calls. You can still participate with audio only.
                      </AlertDescriptionUI>
                  </Alert>
              )}
               {(!hasMicPermission && (currentCallType === 'video' || currentCallType === 'audio')) && (
                  <Alert variant="destructive" className="my-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Microphone Access Required</AlertTitle>
                      <AlertDescriptionUI>
                        Please allow microphone access to communicate.
                      </AlertDescriptionUI>
                  </Alert>
              )}


              <div className="flex justify-center space-x-4 mt-4">
                <Button variant={isMuted ? "secondary" : "outline"} size="icon" onClick={toggleMute} className="h-12 w-12 rounded-full border-accent text-accent hover:bg-accent/20" title={isMuted ? "Unmute" : "Mute"} disabled={!hasMicPermission}>
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                {currentCallType === 'video' && (
                  <Button variant={!isVideoEnabled ? "secondary" : "outline"} size="icon" onClick={toggleVideo} className="h-12 w-12 rounded-full border-accent text-accent hover:bg-accent/20" title={isVideoEnabled ? "Disable Video" : "Enable Video"} disabled={!hasCameraPermission}>
                    {isVideoEnabled && hasCameraPermission ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                  </Button>
                )}
                <Button variant="destructive" size="icon" onClick={endCall} className="h-12 w-12 rounded-full" title="End Call">
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
