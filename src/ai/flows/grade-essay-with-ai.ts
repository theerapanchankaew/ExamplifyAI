'use server';
/**
 * @fileOverview This file defines a Genkit flow for grading essays using AI, incorporating a rubric for domain-specific criteria.
 *
 * - gradeEssayWithAI - An exported function that takes essay content and a rubric, grades the essay, and returns feedback.
 * - GradeEssayWithAIInput - The input type for the gradeEssayWithAI function.
 * - GradeEssayWithAIOutput - The output type for the gradeEssayWithAI function.
 */

import {ai} from '@/ai';
import {z} from 'genkit';

const GradeEssayWithAIInputSchema = z.object({
  essayContent: z.string().describe('The content of the essay to be graded.'),
  rubric: z.string().describe('The rubric to use for grading the essay.'),
});
export type GradeEssayWithAIInput = z.infer<typeof GradeEssayWithAIInputSchema>;

const GradeEssayWithAIOutputSchema = z.object({
  grade: z.string().describe('The grade assigned to the essay.'),
  feedback: z.string().describe('Feedback on the essay based on the rubric.'),
});
export type GradeEssayWithAIOutput = z.infer<typeof GradeEssayWithAIOutputSchema>;

export async function gradeEssayWithAI(input: GradeEssayWithAIInput): Promise<GradeEssayWithAIOutput> {
  return gradeEssayWithAIFlow(input);
}

const gradeEssayPrompt = ai.definePrompt({
  name: 'gradeEssayPrompt',
  input: {schema: GradeEssayWithAIInputSchema},
  output: {schema: GradeEssayWithAIOutputSchema},
  prompt: `You are an AI essay grading assistant. Please provide a grade and constructive feedback for the following essay, based on the provided rubric.\n\nEssay Content: {{{essayContent}}}\n\nRubric: {{{rubric}}}\n\nGrade and Feedback: `,
});

const gradeEssayWithAIFlow = ai.defineFlow(
  {
    name: 'gradeEssayWithAIFlow',
    inputSchema: GradeEssayWithAIInputSchema,
    outputSchema: GradeEssayWithAIOutputSchema,
  },
  async input => {
    const {output} = await gradeEssayPrompt(input);
    return output!;
  }
);
