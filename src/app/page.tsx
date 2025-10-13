
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookA, User, UserCog, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(false);
      } else {
        // If not logged in, sign in anonymously
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed: ", error);
          setIsLoading(false);
        });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  const handleLogin = (role: 'admin' | 'student') => {
    if (isLoading || !user) return; // Prevent navigation until user is authenticated
    if (role === 'admin') {
      router.push('/dashboard');
    } else {
      router.push('/student-dashboard');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
        <div className="flex items-center gap-3 mb-6">
            <BookA className="h-12 w-12 text-primary" />
            <h1 className="font-headline text-4xl font-semibold">ExamplifyAI</h1>
        </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>Please select your role to continue.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Connecting...</p>
            </div>
          ) : (
            <>
              <Button size="lg" onClick={() => handleLogin('admin')}>
                <UserCog className="mr-2" />
                Login as Admin
              </Button>
              <Button size="lg" variant="secondary" onClick={() => handleLogin('student')}>
                <User className="mr-2" />
                Login as Student (Examinee)
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground mt-6">
          Now using Firebase Anonymous Authentication.
      </p>
    </div>
  );
}
