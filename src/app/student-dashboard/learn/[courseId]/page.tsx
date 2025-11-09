
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, documentId } from 'firebase/firestore';

import type { Course } from '@/types/course';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BookText, Video, ClipboardList, Users, BrainCircuit, FileText, Star, GraduationCap, SquarePen, CheckCircle } from 'lucide-react';
import { PlaceholderContent } from '@/components/placeholder-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Mock data for the new structure
const learningSections = [
    {
        title: "แนะนำรายวิชา",
        items: [
            { title: "แนะนำรายวิชาและบทเรียนออนไลน์", icon: BookText, status: "Completed", action: "View" },
            { title: "แนะนำกิจกรรมและเกณฑ์การผ่านรายวิชา", icon: ClipboardList, status: "Incomplete", action: "View" },
            { title: "แบบทดสอบความรู้เบื้องต้นก่อนเริ่มเรียน (Pre Test) (10 Questions)", icon: BrainCircuit, status: "Incomplete", action: "Start Test" },
            { title: "กิจกรรมทำความรู้จักเพื่อนร่วมเรียนผ่าน Padlet", icon: Users, status: "Incomplete", action: "Join" },
            { title: "วิดีโอแนะนำรายวิชา", icon: Video, status: "Incomplete", action: "Watch" },
        ]
    },
    {
        title: "บทเรียน",
        items: [
            { title: "บทที่ 1: ทำความรู้จักสมรรถนะด้าน AI ที่บุคคลทั่วไปพึงมี", icon: FileText, status: "Incomplete", action: "Start Lesson" },
            { title: "บทที่ 2: ความรู้เบื้องต้นเกี่ยวกับ AI และ ML", icon: FileText, status: "Incomplete", action: "Start Lesson" },
            { title: "บทที่ 3: พื้นฐานการเขียนโปรแกรมสำหรับการประยุกต์ใช้ AI", icon: FileText, status: "Incomplete", action: "Start Lesson" },
            { title: "บทที่ 4: การใช้ความสามารถของ AI เพื่อพัฒนาแอปพลิเคชัน", icon: FileText, status: "Incomplete", action: "Start Lesson" },
            { title: "บทที่ 5: ตัวอย่างการทำโครงงานแอปพลิเคชันที่ใช้ AI", icon: FileText, status: "Incomplete", action: "Start Lesson" },
        ]
    },
    {
        title: "สรุปท้ายบทเรียน",
        items: [
            { title: "สรุปการเรียนรู้", icon: Star, status: "Incomplete", action: "Review" },
            { title: "Final Exam: วัดผลประมวลความรู้", icon: GraduationCap, status: "Incomplete", action: "Start Exam" },
            { title: "แบบสำรวจหลังเรียน", icon: SquarePen, status: "Incomplete", action: "Start Survey" },
        ]
    }
];


function CourseContentPage() {
    const params = useParams();
    const { courseId } = params;
    const firestore = useFirestore();

    // Fetch Course data (existing logic)
    const courseDocRef = useMemoFirebase(() => {
        if (!firestore || !courseId) return null;
        return doc(firestore, 'courses', courseId as string);
    }, [firestore, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseDocRef);

    if (courseLoading) {
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

            <div className="space-y-8">
                {learningSections.map((section, sectionIndex) => (
                    <Card key={sectionIndex}>
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {section.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="flex items-center gap-4">
                                            <item.icon className="h-6 w-6 text-primary" />
                                            <span className="font-medium">{item.title}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {item.status === 'Completed' ? (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Completed
                                                </Badge>
                                            ) : (
                                                 <Badge variant="outline">Incomplete</Badge>
                                            )}
                                            <Button variant="outline" size="sm" disabled={item.status === 'Incomplete'}>{item.action}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default CourseContentPage;

    