export type Question = {
    id: string;
    stem: string;
    options: string[];
    correctAnswer: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Expert';
};
