// src/ai/flows/generate-course-from-topic.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a course from a topic and syllabus using AI,
 * following a nested structure of Lessons, Modules, and Chapters.
 *
 * @fileOverview
 * - `generateCourseFromTopic`: A function to generate a course from a topic and syllabus using AI.
 * - `GenerateCourseFromTopicInput`: The input type for the generateCourseFromTopic function.
 * - `GenerateCourseFromTopicOutput`: The output type for the generateCourseFromTopic function.
 */

import {ai} from '@/ai/index';
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
    .describe('The number of multiple-choice questions to generate for the final exam.'),
  essayCount: z
    .number()
    .int()
    .min(0)
    .describe('The number of essay questions to generate for the final exam.'),
  creativity: z
    .number()
    .min(0)
    .max(1)
    .describe('The creativity level to use when generating the course content.'),
});

export type GenerateCourseFromTopicInput = z.infer<
  typeof GenerateCourseFromTopicInputSchema
>;

const QuizSchema = z.object({
  stem: z.string().describe('The question stem.'),
  options: z.array(z.string()).describe('The question options.'),
  answer: z.string().describe('The correct answer.'),
});

const ChapterSchema = z.object({
  title: z.string().describe('The title of the chapter.'),
  content: z.string().describe('The learning content of the chapter.'),
  quiz: z.array(QuizSchema).optional().describe('An optional short quiz for the chapter.'),
});

const ModuleSchema = z.object({
  title: z.string().describe('The title of the module.'),
  chapters: z.array(ChapterSchema).describe('The chapters within the module.'),
});

const LessonSchema = z.object({
  title: z.string().describe('The title of the lesson.'),
  modules: z.array(ModuleSchema).describe('The modules within the lesson.'),
});

const GenerateCourseFromTopicOutputSchema = z.object({
  title: z.string().describe('The title of the generated course.'),
  description: z.string().describe('The description of the generated course.'),
  lessons: z.array(LessonSchema).describe('The lessons in the course, each containing modules and chapters.'),
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
    .describe('The final exam questions for the course.'),
});

export type GenerateCourseFromTopicOutput = z.infer<
  typeof GenerateCourseFromTopicOutputSchema
>;

const generateCourseFromTopicPrompt = ai.definePrompt({
  name: 'generateCourseFromTopicPrompt',
  input: {schema: GenerateCourseFromTopicInputSchema},
  output: {schema: GenerateCourseFromTopicOutputSchema},
  prompt: `You are an AI course generator that helps instructors create courses quickly, following a micro-learning structure.

  Given a topic, syllabus, difficulty, and creativity level, you will generate a course with a nested structure of Lessons > Modules > Chapters.
  Each chapter should contain content and can optionally have a small quiz.
  You will also generate a final exam for the course with the specified number of MCQ and essay questions.

  Topic: {{{topic}}}
  Syllabus: {{{syllabus}}}
  Difficulty: {{{difficulty}}}
  Number of Final Exam MCQ Questions: {{{mcqCount}}}
  Number of Final Exam Essay Questions: {{{essayCount}}}
  Creativity Level: {{{creativity}}}

  Output the course in the following JSON format:
  {
    "title": "Course Title",
    "description": "Course Description",
    "lessons": [
      {
        "title": "Lesson 1: Introduction",
        "modules": [
          {
            "title": "Module 1.1: Core Concepts",
            "chapters": [
              {
                "title": "Chapter 1.1.1: First Concept",
                "content": "Detailed content for the first concept...",
                "quiz": [
                  {
                    "stem": "What is the first concept?",
                    "options": ["A", "B", "C"],
                    "answer": "A"
                  }
                ]
              },
              {
                "title": "Chapter 1.1.2: Second Concept",
                "content": "Detailed content for the second concept...",
                "quiz": []
              }
            ]
          }
        ]
      }
    ],
    "questions": [
      {
        "stem": "Final exam question stem...",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "answer": "Correct Answer",
        "difficulty": "Intermediate"
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
