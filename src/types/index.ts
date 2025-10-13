export type User = {
  name: string;
  email: string;
  avatarUrl: string;
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
  timestamp: Date;
};
