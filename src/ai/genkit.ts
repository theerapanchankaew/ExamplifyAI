import {ai} from '@/ai';
import '@/ai/flows/grade-essay-with-ai.ts';
import '@/ai/flows/generate-course-from-topic.ts';

// This file is the entrypoint for the Genkit service.
// It imports the flows so that they are registered with Genkit.
// To start the service, run: `genkit start -- tsx src/ai/genkit.ts`
export {ai};
