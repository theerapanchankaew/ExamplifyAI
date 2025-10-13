
import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  userId: string;
  name: string;
  email: string;
  role: string;
  id: string; // Keep `id` for compatibility with useCollection's WithId type
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
