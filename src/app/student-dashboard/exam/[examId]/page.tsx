
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, collection, query, where, documentId, addDoc, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, Video, VideoOff } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UserProfile } from '@/types';
import Webcam from 'react-webcam';

// Matches backend.json entities
type Exam = { id: string; courseId: string; questionIds: string[] };
type Question = { id: string; stem: string; options: string[]; correctAnswer: string };
type CourseAchievement = { id: string; courseId: string; pair: string; }

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { examId } = params;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        // Stream is managed by the Webcam component, no need to set srcObject manually
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to take the exam.',
        });
      }
    };

    getCameraPermission();
  }, [toast]);
  
  // Get user profile to check tokens
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);


  // 1. Fetch the exam document
  const examDocRef = useMemoFirebase(() => {
    if (!firestore || !examId) return null;
    return doc(firestore, 'exams', examId as string);
  }, [firestore, examId]);
  const { data: exam, isLoading: examLoading } = useDoc<Exam>(examDocRef);

  // 2. Fetch the questions for the exam
  const questionsQuery = useMemoFirebase(() => {
    if (!firestore || !exam?.questionIds || exam.questionIds.length === 0) return null;
    return query(collection(firestore, 'questions'), where(documentId(), 'in', exam.questionIds));
  }, [firestore, exam]);
  const { data: questions, isLoading: questionsLoading } = useCollection<Question>(questionsQuery);
  
  // Sort questions to match the order in the exam document
  const sortedQuestions = useMemo(() => {
    if (!questions || !exam?.questionIds) return [];
    const questionMap = new Map(questions.map(q => [q.id, q]));
    return exam.questionIds.map(id => questionMap.get(id)).filter((q): q is Question => !!q);
  }, [questions, exam]);

  const isLoading = examLoading || questionsLoading || hasCameraPermission === null;

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (sortedQuestions && currentQuestionIndex < sortedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || !exam || !sortedQuestions || !userProfile || !userDocRef || !firestore) return;
    
    setIsSubmitting(true);
    const examCost = 10; // Let's say each exam costs 10 tokens

    if ((userProfile.cabTokens ?? 0) < examCost) {
        toast({
            variant: 'destructive',
            title: "Insufficient Tokens",
            description: `You need ${examCost} CAB tokens to submit this exam.`,
        });
        setIsSubmitting(false);
        return;
    }


    let correctCount = 0;
    sortedQuestions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = (correctCount / sortedQuestions.length) * 100;
    const pass = score >= 70; // Assuming 70% is the passing score

    const attemptData = {
      userId: user.uid,
      examId: exam.id,
      courseId: exam.courseId, // Add courseId to the attempt
      score: Math.round(score),
      pass: pass,
      timestamp: serverTimestamp(),
      answers: answers
    };

    try {
      const batch = writeBatch(firestore);

      // 1. Add the attempt document
      const attemptsCollectionRef = collection(firestore, 'attempts');
      const attemptDocRef = doc(attemptsCollectionRef);
      batch.set(attemptDocRef, attemptData);

      // 2. Deduct tokens from user's profile
      const newTokens = (userProfile.cabTokens ?? 0) - examCost;
      batch.update(userDocRef, { cabTokens: newTokens });

      // 3. If passed, check for and award achievement
      if (pass) {
        const achievementsQuery = query(collection(firestore, 'courseAchievements'), where('courseId', '==', exam.courseId));
        const achievementSnapshot = await getDocs(achievementsQuery);
        
        if (!achievementSnapshot.empty) {
            achievementSnapshot.forEach(achievementDoc => {
                const achievement = achievementDoc.data() as CourseAchievement;
                const userAchievementRef = doc(collection(firestore, `users/${user.uid}/achievements`));
                batch.set(userAchievementRef, {
                    id: userAchievementRef.id,
                    userId: user.uid,
                    pair: achievement.pair,
                    awardedAt: serverTimestamp()
                });

                toast({
                    title: "Achievement Unlocked!",
                    description: `You've earned the competency: ${achievement.pair}`,
                });
            });
        }
      }

      await batch.commit();

      toast({
        title: "Exam Submitted!",
        description: `Your score is ${Math.round(score)}%. You have ${pass ? 'passed' : 'failed'}.`,
      });
      router.push('/student-dashboard/my-history');
    } catch (e) {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'batch-write (attempts, users, achievements)',
            operation: 'write',
            requestResourceData: { attempt: attemptData, userId: user.uid },
        }));
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };
  
  const currentQuestion = sortedQuestions ? sortedQuestions[currentQuestionIndex] : null;
  const progress = sortedQuestions ? ((currentQuestionIndex + 1) / sortedQuestions.length) * 100 : 0;
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
             <Loader2 className="h-16 w-16 animate-spin text-primary" />
             <p className="text-muted-foreground">Preparing your exam environment...</p>
          </div>
      </div>
    );
  }

  if (hasCameraPermission === false) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Card className="max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="text-destructive">Camera Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This exam requires camera access for proctoring.</p>
                    <p className="text-muted-foreground text-sm mt-2">Please enable camera permissions in your browser's settings and refresh the page to continue.</p>
                    <Button className="mt-6" onClick={() => router.push('/student-dashboard/my-courses')}>Back to My Courses</Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (!exam || !currentQuestion) {
    return (
      <div className="flex h-screen items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold">Exam Not Found</h2>
          <p className="text-muted-foreground mt-2">Could not load the exam. It might not exist or you may not have access.</p>
          <Button onClick={() => router.push('/student-dashboard/my-courses')} className="mt-4">Back to Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
            <CardHeader>
                <Progress value={progress} className="mb-4" />
                <CardTitle>Question {currentQuestionIndex + 1} of {sortedQuestions.length}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="prose max-w-none">
                <p className="text-lg font-medium">{currentQuestion.stem}</p>
                </div>

                <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="mt-6 space-y-4"
                >
                {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={option} id={`q${currentQuestion.id}-o${index}`} />
                    <Label htmlFor={`q${currentQuestion.id}-o${index}`} className="flex-1 cursor-pointer">{option}</Label>
                    </div>
                ))}
                </RadioGroup>
            </CardContent>
            </Card>

            <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
                <ChevronLeft className="mr-2" /> Previous
            </Button>
            {currentQuestionIndex === sortedQuestions.length - 1 ? (
                <Button onClick={() => setShowConfirmDialog(true)} disabled={Object.keys(answers).length !== sortedQuestions.length}>
                <CheckCircle className="mr-2" /> Submit Exam
                </Button>
            ) : (
                <Button onClick={handleNext}>
                Next <ChevronRight className="ml-2" />
                </Button>
            )}
            </div>
        </div>

        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Video className="text-primary"/> Proctoring Enabled</CardTitle>
                    <CardDescription>Your exam session is being monitored.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video w-full bg-muted rounded-md overflow-hidden relative">
                         <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: "user" }}
                            className="w-full h-full object-cover"
                         />
                         <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                            </span>
                            REC
                         </div>
                    </div>
                    <Alert variant="destructive" className="mt-4">
                        <VideoOff className="h-4 w-4"/>
                        <AlertTitle>Maintain Focus</AlertTitle>
                        <AlertDescription>
                            Keep your face visible and stay focused on the exam. Looking away may invalidate your results.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you ready to submit?</AlertDialogTitle>
            <AlertDialogDescription>
              You cannot change your answers after submitting. This will cost 10 CAB tokens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
