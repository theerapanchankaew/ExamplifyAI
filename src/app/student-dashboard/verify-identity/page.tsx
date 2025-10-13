
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, UserCheck, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function VerifyIdentityPage() {
  const webcamRef = useRef<Webcam>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        // Clean up the stream immediately as we just need to check for permission
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to continue.',
        });
      }
    };
    getCameraPermission();
  }, [toast]);

  const handleVerify = useCallback(async () => {
    if (!webcamRef.current) return;
    setIsVerifying(true);
    setVerificationStatus('idle');

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
        toast({
            variant: "destructive",
            title: "Could not capture image",
            description: "Please ensure your camera is not obstructed and try again."
        });
        setIsVerifying(false);
        return;
    }

    // Simulate AI verification process
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2; // 80% success rate
      if (isSuccess) {
        setVerificationStatus('success');
        toast({
            title: "Identity Verified!",
            description: "You can now enroll in courses and take exams.",
        });
        setTimeout(() => router.push('/student-dashboard'), 2000);
      } else {
        setVerificationStatus('error');
        toast({
            variant: "destructive",
            title: "Verification Failed",
            description: "We could not verify your identity. Please ensure you are in a well-lit room and try again.",
        });
      }
      setIsVerifying(false);
    }, 2500);
  }, [webcamRef, toast, router]);

  const renderContent = () => {
    if (hasCameraPermission === null) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Checking for camera...</p>
        </div>
      );
    }

    if (hasCameraPermission === false) {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Camera Access Required</AlertTitle>
          <AlertDescription>
            This feature requires camera access. Please enable camera permissions in your browser settings and refresh the page.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (verificationStatus === 'success') {
      return (
         <div className="flex flex-col items-center justify-center h-64 text-center">
          <UserCheck className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold">Verification Successful!</h3>
          <p className="text-muted-foreground mt-2">Redirecting you to the dashboard...</p>
        </div>
      )
    }

    return (
      <div className="relative aspect-video w-full">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full aspect-video rounded-md object-cover"
          videoConstraints={{ facingMode: 'user' }}
        />
         <div className="absolute inset-0 border-4 border-dashed border-primary/50 rounded-md m-4 flex items-center justify-center pointer-events-none">
            <div className="bg-background/50 backdrop-blur-sm p-2 rounded-md text-xs font-semibold">
                Align your face within the frame
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Identity Verification</CardTitle>
          <CardDescription>
            To ensure exam integrity, we need to verify your identity using your webcam. This is a one-time process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleVerify} 
            disabled={!hasCameraPermission || isVerifying || verificationStatus === 'success'}
          >
            {isVerifying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {isVerifying ? 'Verifying with AI...' : 'Verify My Identity'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
