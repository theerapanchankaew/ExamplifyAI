import { config } from 'dotenv';
config();

import '@/ai/flows/grade-essay-with-ai.ts';
import '@/ai/flows/generate-course-from-topic.ts';
import { setAdminClaim } from '@/ai/actions/set-admin-claim';

async function runAdminActions() {
    // This is a one-off script to set the admin claim for the initial admin user.
    // In a real application, you would have a more robust system for managing roles.
    const result = await setAdminClaim('admin@masci.com');
    console.log('Set Admin Claim Result:', result);
}

// Run the actions.
runAdminActions().catch(console.error);
