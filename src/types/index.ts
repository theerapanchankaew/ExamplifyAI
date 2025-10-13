import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type ExamAttempt = {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  course: {
    title: string;
  };
  score: number;
  status: 'Passed' | 'Failed';
  timestamp: Timestamp | Date;
};
