
import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string; // This should match the document ID in Firestore, which is user.uid
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'instructor';
  cabTokens?: number;
  mandatoryLearningPath?: string[];
  voluntaryLearningPath?: string[];
  avatarUrl?: string;
};

// This mirrors the `Attempt` entity in backend.json
export type Attempt = {
    id: string;
    userId: string;
    examId: string;
    score: number;
    pass: boolean;
    timestamp?: Timestamp; // Timestamps from firestore will be of this type
};

export type { Roadmap } from './roadmap';
