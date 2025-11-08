

import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string; 
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'instructor' | 'examinee';
  cabTokens?: number;
  enrolledCourseIds?: string[];
  mandatoryLearningPath?: string[];
  avatarUrl?: string;
};

// This mirrors the `Attempt` entity in backend.json
export type Attempt = {
    id: string;
    userId: string;
    examId: string;
    courseId?: string; // Added to link attempt directly to a course
    score: number;
    pass: boolean;
    timestamp?: Timestamp; // Timestamps from firestore will be of this type
    answers?: Record<string, string>;
};

export type { Roadmap } from './roadmap';
export type { Module } from './module';
export type { Chapter } from './chapter';
    
