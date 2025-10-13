// src/ai/flows/generate-course-from-topic.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a course from a topic and syllabus using AI.
 *
 * The flow takes a topic, syllabus, difficulty level, number of MCQ questions, number of essay questions, and creativity level as input.
 * It then uses an AI model to generate course content, including lessons and questions.
 *
 * @fileOverview
 * - `generateCourseFromTopic`: A function to generate a course from a topic and syllabus using AI.
 * - `GenerateCourseFromTopicInput`: The input type for the generateCourseFromTopic function.
 * - `GenerateCourseFromTopicOutput`: The output type for the generateCourseFromTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCourseFromTopicInputSchema = z.object({
  topic: z.string().describe('The topic of the course.'),
  syllabus: z.string().describe('The syllabus of the course.'),
  difficulty: z
    .enum(['Beginner', 'Intermediate', 'Expert'])
    .describe('The difficulty level of the course.'),
  mcqCount: z
    .number()
    .int()
    .min(0)
    .describe('The number of multiple-choice questions to generate.'),
  essayCount: z
    .number()
    .int()
    .min(0)
    .describe('The number of essay questions to generate.'),
  creativity: z
    .number()
    .min(0)
    .max(1)
    .describe('The creativity level to use when generating the course content.'),
});

export type GenerateCourseFromTopicInput = z.infer<
  typeof GenerateCourseFromTopicInputSchema
>;

const GenerateCourseFromTopicOutputSchema = z.object({
  title: z.string().describe('The title of the generated course.'),
  description: z.string().describe('The description of the generated course.'),
  lessons: z.array(
    z.object({
      title: z.string().describe('The title of the lesson.'),
      content: z.string().describe('The content of the lesson.'),
      quiz: z.array(
        z.object({
          stem: z.string().describe('The question stem.'),
          options: z.array(z.string()).describe('The question options.'),
          answer: z.string().describe('The correct answer.'),
        })
      ),
    })
  ).describe('The lessons in the course.'),
  questions: z
    .array(
      z.object({
        stem: z.string().describe('The question stem.'),
        options: z.array(z.string()).describe('The question options.'),
        answer: z.string().describe('The correct answer.'),
        difficulty: z
          .enum(['Beginner', 'Intermediate', 'Expert'])
          .describe('The difficulty level of the question.'),
      })
    )
    .describe('The questions in the course.'),
});

export type GenerateCourseFromTopicOutput = z.infer<
  typeof GenerateCourseFromTopicOutputSchema
>;

const generateCourseFromTopicPrompt = ai.definePrompt({
  name: 'generateCourseFromTopicPrompt',
  input: {schema: GenerateCourseFromTopicInputSchema},
  output: {schema: GenerateCourseFromTopicOutputSchema},
  prompt: `You are an AI course generator that helps instructors create courses quickly.

  Given a topic, syllabus, difficulty, number of MCQ questions, number of essay questions, and creativity level, you will generate a course with lessons and questions.

  Topic: {{{topic}}}
  Syllabus: {{{syllabus}}}
  Difficulty: {{{difficulty}}}
  Number of MCQ Questions: {{{mcqCount}}}
  Number of Essay Questions: {{{essayCount}}}
  Creativity Level: {{{creativity}}}

  Output the course in the following JSON format:
  {
    "title": "Course Title",
    "description": "Course Description",
    "lessons": [
      {
        "title": "Lesson Title",
        "content": "Lesson Content",
        "quiz": [
          {
            "stem": "Question Stem",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "answer": "Correct Answer"
          }
        ]
      }
    ],
    "questions": [
      {
        "stem": "Question Stem",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "answer": "Correct Answer",
        "difficulty": "Beginner | Intermediate | Expert"
      }
    ]
  }`,
});

export async function generateCourseFromTopic(
  input: GenerateCourseFromTopicInput
): Promise<GenerateCourseFromTopicOutput> {
  return generateCourseFromTopicFlow(input);
}

const generateCourseFromTopicFlow = ai.defineFlow(
  {
    name: 'generateCourseFromTopicFlow',
    inputSchema: GenerateCourseFromTopicInputSchema,
    outputSchema: GenerateCourseFromTopicOutputSchema,
  },
  async input => {
    const {output} = await generateCourseFromTopicPrompt(input);
    return output!;
  }
);
