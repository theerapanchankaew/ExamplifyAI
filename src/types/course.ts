
export type Course = {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  competency: string;
  description?: string;
};
