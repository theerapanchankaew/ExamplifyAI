
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookA, User, UserCog } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (role: 'admin' | 'student') => {
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
          <CardDescription>Please select your role to login.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button size="lg" onClick={() => handleLogin('admin')}>
            <UserCog className="mr-2" />
            Login as Admin
          </Button>
          <Button size="lg" variant="secondary" onClick={() => handleLogin('student')}>
            <User className="mr-2" />
            Login as Student (Examinee)
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground mt-6">
          This is a simulated login. No authentication is performed.
      </p>
    </div>
  );
}
