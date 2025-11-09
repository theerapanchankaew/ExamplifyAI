
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

import type { UserProfile } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, CornerDownLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type CommunityMessage = {
    id: string;
    userId: string;
    userName: string;
    userAvatarUrl?: string;
    text: string;
    timestamp: Timestamp;
};

export default function CommunityPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const userProfileDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileDocRef);

    const messagesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'communityMessages'), orderBy('timestamp', 'asc'));
    }, [firestore]);

    const { data: messages, isLoading } = useCollection<CommunityMessage>(messagesQuery);
    
    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !userProfile || !firestore) return;

        setIsSending(true);
        const messageData = {
            userId: user.uid,
            userName: userProfile.name,
            userAvatarUrl: userProfile.avatarUrl || '',
            text: newMessage.trim(),
            timestamp: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'communityMessages'), messageData);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'communityMessages',
                operation: 'create',
                requestResourceData: messageData,
            }));
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not send message. Please try again.',
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline">Community of Practice</h1>
                <p className="text-muted-foreground mt-1">A place to discuss, share, and learn together.</p>
            </div>
            
            <Card className="flex-1 flex flex-col">
                <CardContent className="flex-1 flex flex-col p-0">
                    <ScrollArea className="flex-1 p-6" ref={scrollAreaRef as any}>
                        {isLoading && (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        <div className="space-y-6">
                            {messages?.map((message) => (
                                <div key={message.id} className={`flex items-start gap-3 ${message.userId === user?.uid ? 'flex-row-reverse' : ''}`}>
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={message.userAvatarUrl} />
                                        <AvatarFallback>{message.userName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className={`flex flex-col ${message.userId === user?.uid ? 'items-end' : 'items-start'}`}>
                                        <div className={`rounded-lg px-4 py-2 max-w-sm md:max-w-md ${message.userId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                            <p className="text-sm">{message.text}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold">{message.userId === user?.uid ? "You" : message.userName}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {message.timestamp ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true }) : 'sending...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="border-t p-4 bg-background">
                        <form onSubmit={handleSendMessage} className="relative">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="pr-24"
                                disabled={isSending}
                                autoComplete="off"
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center">
                                <Button type="submit" size="sm" disabled={isSending || !newMessage.trim()}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span className="sr-only">Send</span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
