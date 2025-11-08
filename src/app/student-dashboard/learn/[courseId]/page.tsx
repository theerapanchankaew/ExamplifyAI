'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, documentId } from 'firebase/firestore';

import type { Course } from '@/types/course';
import type { Lesson } from '@/types/lesson';
import type { Module } from '@/types/module';
import type { Chapter } from '@/types/chapter';
import type { Question } from '@/types/question';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BookText } from 'lucide-react';
import { PlaceholderContent } from '@/components/placeholder-content';
import { Badge } from '@/components/ui/badge';

type QuizWithQuestions = {
    id: string;
    questions: Question[];
}

function CourseContentPage() {
    const params = useParams();
    const { courseId } = params;
    const firestore = useFirestore();

    // 1. Fetch Course
    const courseDocRef = useMemoFirebase(() => {
        if (!firestore || !courseId) return null;
        return doc(firestore, 'courses', courseId as string);
    }, [firestore, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseDocRef);

    // 2. Fetch Lessons for the course
    const lessonsQuery = useMemoFirebase(() => {
        if (!firestore || !courseId) return null;
        return query(collection(firestore, 'lessons'), where('courseId', '==', courseId));
    }, [firestore, courseId]);
    const { data: lessons, isLoading: lessonsLoading } = useCollection<Lesson>(lessonsQuery);
    const lessonIds = useMemo(() => lessons?.map(l => l.id) || [], [lessons]);

    // 3. Fetch Modules for the lessons
    const modulesQuery = useMemoFirebase(() => {
        if (!firestore || lessonIds.length === 0) return null;
        return query(collection(firestore, 'modules'), where('lessonId', 'in', lessonIds));
    }, [firestore, lessonIds]);
    const { data: modules, isLoading: modulesLoading } = useCollection<Module>(modulesQuery);
    const moduleIds = useMemo(() => modules?.map(m => m.id) || [], [modules]);

    // 4. Fetch Chapters for the modules
    const chaptersQuery = useMemoFirebase(() => {
        if (!firestore || moduleIds.length === 0) return null;
        return query(collection(firestore, 'chapters'), where('moduleId', 'in', moduleIds));
    }, [firestore, moduleIds]);
    const { data: chapters, isLoading: chaptersLoading } = useCollection<Chapter>(chaptersQuery);
    const quizIds = useMemo(() => chapters?.map(c => c.quizId).filter(Boolean) as string[] || [], [chapters]);

    // 5. Fetch Quizzes and their Questions
    const quizzesQuery = useMemoFirebase(() => {
        if (!firestore || quizIds.length === 0) return null;
        return query(collection(firestore, 'quizzes'), where(documentId(), 'in', quizIds));
    }, [firestore, quizIds]);
    const { data: quizzes, isLoading: quizzesLoading } = useCollection(quizzesQuery);
    
    const allQuizQuestionIds = useMemo(() => quizzes?.flatMap(q => q.questionIds) || [], [quizzes]);
    
    const questionsQuery = useMemoFirebase(() => {
        if (!firestore || allQuizQuestionIds.length === 0) return null;
        return query(collection(firestore, 'questions'), where(documentId(), 'in', allQuizQuestionIds));
    }, [firestore, allQuizQuestionIds]);
    const { data: questions, isLoading: questionsLoading } = useCollection<Question>(questionsQuery);
    const questionsMap = useMemo(() => new Map(questions?.map(q => [q.id, q])), [questions]);

    // --- Data Structuring ---
    const structuredContent = useMemo(() => {
        if (!lessons || !modules || !chapters) return [];

        const chaptersByModuleId = new Map<string, Chapter[]>();
        chapters.forEach(chapter => {
            const list = chaptersByModuleId.get(chapter.moduleId) || [];
            list.push(chapter);
            chaptersByModuleId.set(chapter.moduleId, list);
        });

        const modulesByLessonId = new Map<string, Module[]>();
        modules.forEach(module => {
            const list = modulesByLessonId.get(module.lessonId) || [];
            list.push(module);
            modulesByLessonId.set(module.lessonId, list);
        });

        return lessons.map(lesson => ({
            ...lesson,
            modules: (modulesByLessonId.get(lesson.id) || []).map(module => ({
                ...module,
                chapters: (chaptersByModuleId.get(module.id) || [])
            }))
        }));
    }, [lessons, modules, chapters]);
    
    const quizzesMap = useMemo(() => {
        if (!quizzes || !questionsMap) return new Map<string, QuizWithQuestions>();
        const map = new Map<string, QuizWithQuestions>();
        quizzes.forEach(quiz => {
            map.set(quiz.id, {
                id: quiz.id,
                questions: quiz.questionIds.map((qId: string) => questionsMap.get(qId)).filter(Boolean)
            });
        });
        return map;
    }, [quizzes, questionsMap]);

    const isLoading = courseLoading || lessonsLoading || modulesLoading || chaptersLoading || quizzesLoading || questionsLoading;

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!course) {
        return <PlaceholderContent title="Course Not Found" description="The course you are looking for does not exist or you may not have access." />;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold font-headline">{course.title}</h1>
                <p className="text-lg text-muted-foreground mt-2">{course.description}</p>
                 <div className="flex flex-wrap gap-2 pt-4">
                    <Badge variant="secondary">{course.difficulty}</Badge>
                    <Badge variant="outline">{course.competency}</Badge>
                 </div>
            </div>

            {structuredContent.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-4">
                    {structuredContent.map((lesson) => (
                        <Card key={lesson.id}>
                            <AccordionItem value={lesson.id} className="border-b-0">
                                <CardHeader>
                                    <AccordionTrigger className="text-2xl font-bold font-headline hover:no-underline">
                                        {lesson.title}
                                    </AccordionTrigger>
                                </CardHeader>
                                <AccordionContent className="px-6">
                                     <Accordion type="multiple" className="w-full space-y-3">
                                        {lesson.modules.map(module => (
                                             <Card key={module.id} className="bg-muted/40">
                                                <AccordionItem value={module.id} className="border-b-0">
                                                    <CardHeader className="p-4">
                                                        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                                            {module.title}
                                                        </AccordionTrigger>
                                                    </CardHeader>
                                                    <AccordionContent className="px-4">
                                                        <Accordion type="multiple" className="w-full space-y-2">
                                                            {module.chapters.map(chapter => (
                                                                <div key={chapter.id} className="rounded-md border bg-background">
                                                                    <AccordionItem value={chapter.id} className="border-b-0">
                                                                        <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                                                                            {chapter.title}
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="p-4 border-t">
                                                                            <div className="prose prose-sm max-w-none text-foreground mb-6" dangerouslySetInnerHTML={{ __html: chapter.content.replace(/\n/g, '<br />') }} />
                                                                             {chapter.quizId && quizzesMap.has(chapter.quizId) && (
                                                                                <div className="mt-4 rounded-md border-2 border-dashed p-4">
                                                                                    <h4 className="font-semibold text-md mb-4">Chapter Quiz</h4>
                                                                                    <ul className="list-decimal pl-5 space-y-4 text-sm">
                                                                                        {quizzesMap.get(chapter.quizId)?.questions.map((q, i) => (
                                                                                            <li key={i}>
                                                                                                <p className="font-medium">{q.stem}</p>
                                                                                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                                                                                    {q.options.map((opt, j) => (
                                                                                                        <li key={j} className={opt === q.correctAnswer ? 'font-bold text-primary' : ''}>
                                                                                                            {opt}
                                                                                                            {opt === q.correctAnswer && ' (Correct Answer)'}
                                                                                                        </li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                </div>
                                                            ))}
                                                        </Accordion>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Card>
                                        ))}
                                     </Accordion>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    ))}
                </Accordion>
            ) : (
                <PlaceholderContent 
                    icon={BookText}
                    title="Content Coming Soon"
                    description="The lessons and chapters for this course are currently being prepared."
                />
            )}
        </div>
    );
}

export default CourseContentPage;
