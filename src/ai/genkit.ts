import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import '@/ai/flows/grade-essay-with-ai.ts';
import '@/ai/flows/generate-course-from-topic.ts';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
