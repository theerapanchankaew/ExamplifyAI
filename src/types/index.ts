import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
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
