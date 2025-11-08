

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Roadmap } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email(),
  role: z.enum(['admin', 'instructor', 'student', 'examinee']),
  cabTokens: z.coerce.number().int().min(0, 'CAB tokens cannot be negative.'),
  mandatoryLearningPath: z.string().optional(), // Can be empty string for 'None'
});

function EditUserContent() {
  const router = useRouter();
  const params = useParams();
  const { id: userId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user data
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId as string);
  }, [firestore, userId]);
  const { data: user, isLoading: isUserLoading } = useDoc<UserProfile>(userDocRef);
  
  // Fetch roadmaps for the dropdown
  const roadmapsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roadmaps') : null, [firestore]);
  const { data: roadmaps, isLoading: areRoadmapsLoading } = useCollection<Roadmap>(roadmapsQuery);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'student',
      cabTokens: 0,
      mandatoryLearningPath: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        cabTokens: user.cabTokens ?? 0,
        // The path is an array, but we only manage one. Use the first or empty.
        mandatoryLearningPath: user.mandatoryLearningPath?.[0] || '',
      });
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userDocRef) return;

    setIsSaving(true);
    const updateData = {
        name: values.name,
        email: values.email,
        role: values.role,
        cabTokens: values.cabTokens,
        // Store as an array, even if it's just one or empty
        mandatoryLearningPath: values.mandatoryLearningPath ? [values.mandatoryLearningPath] : [],
        updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(userDocRef, updateData);
      toast({
        title: 'User Updated',
        description: `Profile for "${values.name}" has been saved successfully.`,
      });
      router.push('/dashboard/users');
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
        }));
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = isUserLoading || areRoadmapsLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-lg text-muted-foreground">User not found.</p>
        <Button onClick={() => router.push('/dashboard/users')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit User Profile</CardTitle>
        <CardDescription>Make changes to the user's details and assign a learning path.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                            <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="examinee">Examinee</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                control={form.control}
                name="cabTokens"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>CAB Tokens</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="mandatoryLearningPath"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mandatory Roadmap</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="None (Optional)" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {roadmaps?.map(roadmap => (
                                <SelectItem key={roadmap.id} value={roadmap.id}>
                                    {roadmap.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/users')} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


export default function EditUserPage() {
  return (
    <AdminAuthGuard>
      <EditUserContent />
    </AdminAuthGuard>
  )
}
